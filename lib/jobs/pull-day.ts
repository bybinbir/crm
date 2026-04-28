/**
 * Daily ISS Manager v2 invoice pull — pure, testable core.
 *
 * The CLI entrypoint (`scripts/pull-day.ts`) parses argv, wires real
 * dependencies (DB, ISS Manager client, clock) and calls `runDailyPull`.
 * Tests inject fakes to exercise the control flow without touching the
 * network or the database.
 *
 * Exit-code contract:
 *   0  → success (zero upsert errors, including dry-run)
 *   1  → recoverable failure (HTTP/network/parse/DB)
 *   2  → invalid invocation (bad CLI argument)
 *
 * Logging:
 *   - One JSON object on stdout with the run summary (parseable by
 *     systemd journal, log aggregators, or smoke scripts).
 *   - Human-readable progress lines on stderr.
 *   - Secrets and PII redacted via `redactDeep` before any error log.
 */
import { performance } from "node:perf_hooks";
import { redactDeep } from "@/lib/issmanager/redaction";
import { isIssmanagerError } from "@/lib/issmanager/errors";

export const PAGE_SIZE = 100;
export const ENDPOINT = "/iss/v2/invoices";

/** Wall-clock indirection so tests can pin time. */
export interface Clock {
  now(): Date;
  /** Monotonic milliseconds for duration measurement. */
  elapsed(): number;
}

export const realClock: Clock = {
  now: () => new Date(),
  elapsed: () => performance.now(),
};

/** Minimal shape of an invoice page response we depend on. */
export interface InvoicePage {
  invoices: ReadonlyArray<{ fatura_no: string }>;
  envelope: {
    meta: { pagination?: { total_pages?: number } | undefined };
  };
}

export interface PullClient {
  listInvoices(args: {
    start_date: string;
    end_date: string;
    records: number;
    page: number;
  }): Promise<InvoicePage>;
}

export interface PullRunHandle {
  id: bigint;
  finishOk(kayitSayisi: number): Promise<void>;
  finishFail(kayitSayisi: number, hataSayisi: number, detail: string): Promise<void>;
}

export interface PullDeps {
  client: PullClient;
  startPullRun(endpoint: string, rangeStart: Date, rangeEnd: Date): Promise<PullRunHandle>;
  upsertInvoice(invoice: { fatura_no: string }): Promise<{ inserted: boolean }>;
  clock?: Clock;
  /** Stream for human-readable progress (defaults to process.stderr). */
  log?: (line: string) => void;
}

export interface PullSummary {
  date: string;
  endpoint: string;
  seen: number;
  inserted: number;
  errors: number;
  pages: number;
  durationMs: number;
  dryRun: boolean;
  status: "succeeded" | "failed" | "dry-run";
}

export interface PullOptions {
  date: Date;
  dryRun?: boolean;
}

/** Format a Date as `YYYY-MM-DD` in UTC (stable, comparable). */
export function formatIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a `YYYY-MM-DD` string. Throws on malformed input. */
export function parseIsoDate(s: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error(`bad date: ${s}; expected YYYY-MM-DD`);
  }
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`bad date: ${s}; expected YYYY-MM-DD`);
  }
  return d;
}

/** Yesterday in UTC. We don't trust local TZ on a server runner. */
export function defaultRunDate(now: Date): Date {
  const d = new Date(now.getTime());
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * CLI argv parser. Accepts `--date=YYYY-MM-DD` or positional `YYYY-MM-DD`,
 * and `--dry-run`. Returns parsed options or a structured error so the
 * caller can map to exit code 2.
 */
export function parseArgs(argv: ReadonlyArray<string>, now: Date): PullOptions | { error: string } {
  let dateStr: string | undefined;
  let dryRun = false;
  for (const arg of argv) {
    if (arg === "--dry-run" || arg === "-n") {
      dryRun = true;
      continue;
    }
    if (arg.startsWith("--date=")) {
      dateStr = arg.slice("--date=".length);
      continue;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
      dateStr = arg;
      continue;
    }
    return { error: `unknown argument: ${arg}` };
  }
  let date: Date;
  try {
    date = dateStr ? parseIsoDate(dateStr) : defaultRunDate(now);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  return { date, dryRun };
}

/**
 * Map a runtime exception to an exit code. Validation/argument errors
 * come from `parseArgs` directly; this only handles run-time failures.
 */
export function exitCodeFor(_error: unknown): 1 {
  return 1;
}

/**
 * Execute one daily-pull run. Pure with respect to global state: every
 * effect goes through `deps`. Returns the summary and exit code; the CLI
 * wrapper decides how to surface them.
 */
export async function runDailyPull(
  options: PullOptions,
  deps: PullDeps
): Promise<{ summary: PullSummary; exitCode: 0 | 1 }> {
  const clock = deps.clock ?? realClock;
  const log = deps.log ?? ((line) => process.stderr.write(line));
  const date = options.date;
  const dateStr = formatIsoDate(date);
  const dryRun = options.dryRun ?? false;

  log(`> crmanaliz pull-day ${dateStr}${dryRun ? " (dry-run)" : ""}\n`);

  if (dryRun) {
    return {
      summary: {
        date: dateStr,
        endpoint: ENDPOINT,
        seen: 0,
        inserted: 0,
        errors: 0,
        pages: 0,
        durationMs: 0,
        dryRun: true,
        status: "dry-run",
      },
      exitCode: 0,
    };
  }

  const handle = await deps.startPullRun(ENDPOINT, date, date);
  const t0 = clock.elapsed();

  let inserted = 0;
  let seen = 0;
  let errors = 0;
  let pages = 0;

  try {
    let page = 0;
    // Hard cap on pages defends against a runaway upstream that lies about
    // total_pages. 1-day window with PAGE_SIZE=100 should never exceed 200.
    const MAX_PAGES = 200;
    while (page < MAX_PAGES) {
      const res = await deps.client.listInvoices({
        start_date: dateStr,
        end_date: dateStr,
        records: PAGE_SIZE,
        page,
      });
      pages += 1;
      seen += res.invoices.length;
      for (const inv of res.invoices) {
        try {
          const r = await deps.upsertInvoice(inv);
          if (r.inserted) inserted += 1;
        } catch (e) {
          errors += 1;
          const message = e instanceof Error ? e.message : String(e);
          log(`  x upsert failed for fatura ${inv.fatura_no}: ${message}\n`);
        }
      }
      const totalPages = res.envelope.meta.pagination?.total_pages ?? 1;
      log(`  page ${page + 1}/${totalPages}: ${res.invoices.length} invoices\n`);
      page += 1;
      if (page >= totalPages) break;
    }

    const durationMs = Math.round(clock.elapsed() - t0);
    log(`v done in ${durationMs} ms - seen ${seen}, inserted ${inserted}, errors ${errors}\n`);

    if (errors > 0) {
      await handle.finishFail(inserted, errors, `${errors} invoice upserts failed`);
      return {
        summary: {
          date: dateStr,
          endpoint: ENDPOINT,
          seen,
          inserted,
          errors,
          pages,
          durationMs,
          dryRun: false,
          status: "failed",
        },
        exitCode: 1,
      };
    }
    await handle.finishOk(inserted);
    return {
      summary: {
        date: dateStr,
        endpoint: ENDPOINT,
        seen,
        inserted,
        errors,
        pages,
        durationMs,
        dryRun: false,
        status: "succeeded",
      },
      exitCode: 0,
    };
  } catch (e) {
    const kind = isIssmanagerError(e) ? e.kind : "unknown";
    const redacted = redactDeep({
      kind,
      message: e instanceof Error ? e.message : String(e),
    });
    log(`x pull-day failed (${kind}): ${JSON.stringify(redacted)}\n`);
    await handle.finishFail(inserted, errors + 1, `${kind}`).catch(() => undefined);
    const durationMs = Math.round(clock.elapsed() - t0);
    return {
      summary: {
        date: dateStr,
        endpoint: ENDPOINT,
        seen,
        inserted,
        errors: errors + 1,
        pages,
        durationMs,
        dryRun: false,
        status: "failed",
      },
      exitCode: 1,
    };
  }
}
