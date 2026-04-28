/**
 * Typed HTTP client for ISS Manager v2 — read-only surface.
 *
 * Only four read endpoints are exposed:
 *   - getHealth()
 *   - getPaymentTypes()
 *   - searchCustomers({ search, records?, page?, type? })
 *   - findCustomer({ find, records?, page?, type? })
 *   - listInvoices({ start_date, end_date, payment_type?, status? })
 *
 * WRITE endpoints (`/extra-days`, `/invoices/send`) are deliberately absent
 * from this module and from the codebase — they are out of scope for
 * crmanaliz.
 *
 * Every call:
 *   1. obtains a Bearer token via auth.ts (cached);
 *   2. validates input with Zod (request-shape errors throw `ValidationError`);
 *   3. retries on network/5xx with exponential backoff (max `config.maxRetry`);
 *   4. validates the response envelope with Zod (`ParseError` on mismatch);
 *   5. invalidates the token on 401 and retries once.
 */
import { z } from "zod";
import { config } from "@/lib/config";
import { getToken, invalidateToken } from "./auth";
import {
  envelope,
  HealthSchema,
  customerRecordsSchema,
  invoiceRecordsSchema,
  paymentTypeRecordsSchema,
  unwrapRecords,
  SearchCustomersParams,
  FindCustomerParams,
  ListInvoicesParams,
  type Customer,
  type Health,
  type Invoice,
  type PaymentType,
  type SearchCustomersParamsT,
  type FindCustomerParamsT,
  type ListInvoicesParamsT,
  type Envelope,
} from "./types";
import { HttpError, NetworkError, ParseError, ValidationError } from "./errors";

const HealthEnvelope = envelope(HealthSchema);
const CustomerListEnvelope = envelope(customerRecordsSchema);
const InvoiceListEnvelope = envelope(invoiceRecordsSchema);
const PaymentTypeListEnvelope = envelope(paymentTypeRecordsSchema);

export type FetchLike = typeof fetch;

export type IssmanagerClientOptions = {
  /** Override the global fetch (used for tests / mocking). */
  fetcher?: FetchLike;
  /** Override the per-call timeout (ms). Falls back to env config. */
  timeoutMs?: number;
  /** Override max retry attempts. Falls back to env config. */
  maxRetry?: number;
};

export class IssmanagerClient {
  readonly #fetcher: FetchLike;
  readonly #timeoutMs: number;
  readonly #maxRetry: number;
  readonly #baseUrl: string;

  constructor(options: IssmanagerClientOptions = {}) {
    this.#fetcher = options.fetcher ?? fetch;
    this.#timeoutMs = options.timeoutMs ?? config.issmanager.timeoutMs;
    this.#maxRetry = options.maxRetry ?? config.issmanager.maxRetry;
    this.#baseUrl = config.issmanager.baseUrl;
  }

  // ─── Public surface ──────────────────────────────────────────────────────

  async getHealth(): Promise<Health> {
    const url = `${this.#baseUrl}/iss/v2/health`;
    const env = await this.#getJson(url, HealthEnvelope, { auth: false });
    return env.data;
  }

  async getPaymentTypes(): Promise<PaymentType[]> {
    const url = `${this.#baseUrl}/iss/v2/payment-types`;
    const env = await this.#getJson(url, PaymentTypeListEnvelope, { auth: true });
    return unwrapRecords(env.data);
  }

  async searchCustomers(params: SearchCustomersParamsT): Promise<{
    customers: Customer[];
    envelope: Envelope<z.infer<typeof customerRecordsSchema>>;
  }> {
    const validated = SearchCustomersParams.safeParse(params);
    if (!validated.success) {
      throw new ValidationError(
        `Invalid searchCustomers params: ${zodIssues(validated.error)}`
      );
    }
    const url = buildUrl(`${this.#baseUrl}/iss/v2/customers`, validated.data);
    const env = await this.#getJson(url, CustomerListEnvelope, { auth: true });
    return { customers: unwrapRecords(env.data), envelope: env };
  }

  async findCustomer(params: FindCustomerParamsT): Promise<{
    customers: Customer[];
    envelope: Envelope<z.infer<typeof customerRecordsSchema>>;
  }> {
    const validated = FindCustomerParams.safeParse(params);
    if (!validated.success) {
      throw new ValidationError(
        `Invalid findCustomer params: ${zodIssues(validated.error)}`
      );
    }
    const url = buildUrl(`${this.#baseUrl}/iss/v2/customers/find`, validated.data);
    const env = await this.#getJson(url, CustomerListEnvelope, { auth: true });
    return { customers: unwrapRecords(env.data), envelope: env };
  }

  async listInvoices(params: ListInvoicesParamsT): Promise<{
    invoices: Invoice[];
    envelope: Envelope<z.infer<typeof invoiceRecordsSchema>>;
  }> {
    const validated = ListInvoicesParams.safeParse(params);
    if (!validated.success) {
      throw new ValidationError(
        `Invalid listInvoices params: ${zodIssues(validated.error)}`
      );
    }
    const url = buildUrl(`${this.#baseUrl}/iss/v2/invoices`, validated.data);
    const env = await this.#getJson(url, InvoiceListEnvelope, { auth: true });
    return { invoices: unwrapRecords(env.data), envelope: env };
  }

  // ─── Internals ───────────────────────────────────────────────────────────

  async #getJson<S extends z.ZodTypeAny>(
    url: string,
    schema: S,
    opts: { auth: boolean }
  ): Promise<z.infer<S>> {
    let attempt = 0;
    let reAuthAttempted = false;

    while (true) {
      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      if (opts.auth) {
        const token = await getToken();
        headers["Authorization"] = `Bearer ${token.access_token}`;
      }

      let res: Response;
      try {
        res = await this.#fetcher(url, {
          method: "GET",
          headers,
          signal: AbortSignal.timeout(this.#timeoutMs),
          cache: "no-store",
        });
      } catch (e) {
        if (attempt < this.#maxRetry) {
          await sleep(backoffMs(attempt));
          attempt += 1;
          continue;
        }
        throw new NetworkError("ISS Manager request failed", url, { cause: e });
      }

      // 401 → invalidate token and retry exactly once.
      if (res.status === 401 && opts.auth && !reAuthAttempted) {
        reAuthAttempted = true;
        invalidateToken();
        continue;
      }

      if (!res.ok) {
        const detail = await safeReadText(res);
        const httpErr = new HttpError({
          status: res.status,
          statusText: res.statusText,
          url,
          detail,
        });
        if (httpErr.retryable && attempt < this.#maxRetry) {
          await sleep(backoffMs(attempt));
          attempt += 1;
          continue;
        }
        throw httpErr;
      }

      let json: unknown;
      try {
        json = await res.json();
      } catch (e) {
        throw new ParseError({
          url,
          issues: "response was not valid JSON",
          cause: e,
        });
      }

      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new ParseError({ url, issues: zodIssues(parsed.error) });
      }
      return parsed.data;
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUrl(base: string, query: Record<string, unknown>): string {
  const u = new URL(base);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Exponential backoff with jitter: 250ms, 500ms, 1s, 2s, … capped at 8s. */
function backoffMs(attempt: number): number {
  const base = Math.min(8_000, 250 * 2 ** attempt);
  const jitter = Math.random() * 0.25 * base;
  return Math.floor(base + jitter);
}

function zodIssues(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "";
  }
}
