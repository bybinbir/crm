/**
 * Read-only query helpers for the `audit_events` table.
 *
 * Pure functions for filter parsing and pagination clamping live in this
 * module so they can be unit-tested without a database. The actual
 * `getDb()` query is wrapped in a small async function that takes the
 * already-validated, already-clamped options.
 *
 * Threat model:
 *   - All inputs come from URL query strings (untrusted).
 *   - Filters are applied via Drizzle's parameterised query builder; no
 *     string interpolation reaches the SQL layer (SQL injection N/A).
 *   - Pagination is hard-clamped server-side to defend against denial-of-
 *     read by a caller asking for `limit=10_000_000`.
 *   - Ordering is deterministic: `ts DESC, id DESC`. The id tiebreaker
 *     guarantees stable pagination even when many events share a timestamp.
 *
 * The audit_events row itself does not contain PII (it carries
 * `kullaniciId`, `aksiyon`, `kaynak`, `requestId`, `ip`, `sonuc`). Even so,
 * the UI MUST NOT cross-join and surface decrypted PII columns here.
 */
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { auditEvents, getDb } from "@/lib/db";

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;
export const DEFAULT_PAGE = 1;
export const MAX_PAGE = 10_000;

export type AuditFilter = {
  /** Inclusive lower bound (UTC). */
  from?: Date;
  /** Inclusive upper bound (UTC). */
  to?: Date;
  /** Exact match on `aksiyon` (e.g. "login.success", "export.csv"). */
  aksiyon?: string;
  /** Exact match on `sonuc` (e.g. "ok", "fail"). */
  sonuc?: string;
  /** Exact match on `kullaniciId`. */
  kullaniciId?: string;
};

export type AuditPagination = {
  /** 1-based page number. */
  page: number;
  /** Rows per page. */
  pageSize: number;
};

export type AuditQueryOptions = AuditFilter & AuditPagination;

export type AuditEventRow = {
  id: bigint;
  ts: Date;
  kullaniciId: string | null;
  aksiyon: string;
  kaynak: string;
  requestId: string | null;
  ip: string | null;
  sonuc: string;
};

export type AuditQueryResult = {
  rows: AuditEventRow[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

/**
 * Clamp an arbitrary input to a valid 1-based page number.
 * Falsy / NaN / negative / oversized values fall back to DEFAULT_PAGE.
 */
export function clampPage(input: unknown): number {
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PAGE;
  return Math.min(Math.floor(n), MAX_PAGE);
}

/**
 * Clamp page size to [1, MAX_PAGE_SIZE]. Falsy / NaN -> DEFAULT_PAGE_SIZE.
 */
export function clampPageSize(input: unknown): number {
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(n), MAX_PAGE_SIZE);
}

/**
 * Parse the YYYY-MM-DD slice of a date string. Returns null on bad input
 * so URL parsers can ignore garbage rather than throwing.
 */
export function parseIsoDateOrNull(input: unknown): Date | null {
  if (typeof input !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const d = new Date(`${input}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** End-of-day UTC for an input date. */
export function endOfDayUtc(d: Date): Date {
  const r = new Date(d.getTime());
  r.setUTCHours(23, 59, 59, 999);
  return r;
}

/** Hard cap on string filter length to defend against absurd inputs. */
const MAX_FILTER_VALUE_LEN = 100;

/** Strip & length-clamp a free-form filter string. Returns undefined for empty. */
export function sanitiseFilterString(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, MAX_FILTER_VALUE_LEN);
}

/**
 * Build a sanitised AuditQueryOptions from raw URL search params (or any
 * `Record<string, string | undefined>`). Never throws.
 */
export function parseAuditQuery(
  raw: Record<string, string | string[] | undefined>
): AuditQueryOptions {
  const first = (k: string): string | undefined => {
    const v = raw[k];
    if (Array.isArray(v)) return v[0];
    return v;
  };

  const fromDate = parseIsoDateOrNull(first("from"));
  const toDate = parseIsoDateOrNull(first("to"));

  const opts: AuditQueryOptions = {
    page: clampPage(first("page")),
    pageSize: clampPageSize(first("pageSize")),
  };
  if (fromDate) opts.from = fromDate;
  if (toDate) opts.to = endOfDayUtc(toDate);

  const aksiyon = sanitiseFilterString(first("aksiyon"));
  if (aksiyon) opts.aksiyon = aksiyon;
  const sonuc = sanitiseFilterString(first("sonuc"));
  if (sonuc) opts.sonuc = sonuc;
  const kullaniciId = sanitiseFilterString(first("kullaniciId"));
  if (kullaniciId) opts.kullaniciId = kullaniciId;

  return opts;
}

/** Compose the WHERE clause from filter fields. Pure (no DB call). */
export function buildAuditWhere(filter: AuditFilter): SQL | undefined {
  const conds: SQL[] = [];
  if (filter.from) conds.push(gte(auditEvents.ts, filter.from));
  if (filter.to) conds.push(lte(auditEvents.ts, filter.to));
  if (filter.aksiyon) conds.push(eq(auditEvents.aksiyon, filter.aksiyon));
  if (filter.sonuc) conds.push(eq(auditEvents.sonuc, filter.sonuc));
  if (filter.kullaniciId) conds.push(eq(auditEvents.kullaniciId, filter.kullaniciId));
  if (conds.length === 0) return undefined;
  if (conds.length === 1) return conds[0];
  return and(...conds);
}

/**
 * Run the audit query. Fetches `pageSize + 1` rows so we can compute
 * `hasMore` without a separate `count(*)` round-trip.
 */
export async function listAuditEvents(
  opts: AuditQueryOptions
): Promise<AuditQueryResult> {
  const db = getDb();
  const where = buildAuditWhere(opts);
  const offset = (opts.page - 1) * opts.pageSize;

  const baseSelect = db
    .select({
      id: auditEvents.id,
      ts: auditEvents.ts,
      kullaniciId: auditEvents.kullaniciId,
      aksiyon: auditEvents.aksiyon,
      kaynak: auditEvents.kaynak,
      requestId: auditEvents.requestId,
      ip: auditEvents.ip,
      sonuc: auditEvents.sonuc,
    })
    .from(auditEvents);

  const filtered = where ? baseSelect.where(where) : baseSelect;
  const rows = await filtered
    .orderBy(desc(auditEvents.ts), desc(auditEvents.id))
    .limit(opts.pageSize + 1)
    .offset(offset);

  const hasMore = rows.length > opts.pageSize;
  const pageRows = hasMore ? rows.slice(0, opts.pageSize) : rows;

  return {
    rows: pageRows.map((r) => ({
      id: r.id,
      ts: r.ts,
      kullaniciId: r.kullaniciId,
      aksiyon: r.aksiyon,
      kaynak: r.kaynak,
      requestId: r.requestId,
      ip: r.ip as string | null,
      sonuc: r.sonuc,
    })),
    page: opts.page,
    pageSize: opts.pageSize,
    hasMore,
  };
}
