/**
 * Shared formatting + filename helpers for CSV / Excel / PDF exports.
 *
 * Pure functions — no dependencies on node:fs / network / DB so the unit
 * tests run instantly and the helpers are reusable from any runtime.
 */

/** Format a TL amount as `1.234,56` (Excel TR locale, no currency symbol). */
export function trAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "";
  // Always 2 decimals, Turkish thousand separator + decimal comma.
  const fixed = amount.toFixed(2);
  const [int, dec] = fixed.split(".");
  const withThousands = int!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withThousands},${dec}`;
}

/** Format a TL amount as `1.234,56 ₺` (UI / PDF body). */
export function trCurrency(amount: number | null | undefined): string {
  const v = trAmount(amount);
  return v ? `${v} ₺` : "";
}

/** Format a Date as `dd.mm.yyyy` (Excel TR). */
export function trDate(d: Date | null | undefined): string {
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  return `${day}.${m}.${y}`;
}

/** ISO `YYYY-MM-DD` of today (UTC) — used in filename stamps. */
export function todayStamp(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Build a safe download filename. Defends against:
 *   - path traversal (`../`, leading slash)
 *   - control characters (`\r`, `\n`, NUL)
 *   - directory separators (`/`, `\`)
 *   - quote characters that would break Content-Disposition
 *
 * Caller passes a stem (e.g. `"odenmemis"`) and an extension (`"csv"`).
 */
export function safeDownloadFilename(stem: string, ext: string): string {
  const cleanStem = stem
    .replace(/[\\/]/g, "-")
    .replace(/[\x00-\x1f\x7f"'`]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^[.\-\s]+|[.\-\s]+$/g, "");
  const cleanExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const base = cleanStem.length > 0 ? cleanStem : "export";
  return `${base}-${todayStamp()}.${cleanExt}`;
}

/** Recognised export formats. Case-insensitive. */
export type ExportFormat = "csv" | "xlsx" | "pdf";

const FORMAT_ALIASES: Record<string, ExportFormat> = {
  csv: "csv",
  xlsx: "xlsx",
  excel: "xlsx",
  xls: "xlsx",
  pdf: "pdf",
};

/**
 * Parse a `?format=` query value. Returns the canonical format,
 * `null` if missing (caller falls back to its default), or the original
 * unknown value as `{ unknown: string }` for typed 400 responses.
 */
export function parseExportFormat(
  raw: string | null | undefined
): ExportFormat | null | { unknown: string } {
  if (raw === null || raw === undefined || raw === "") return null;
  const key = raw.trim().toLowerCase();
  const known = FORMAT_ALIASES[key];
  if (known) return known;
  return { unknown: key.slice(0, 32) };
}

/** Content-Type for an export format. */
export function contentTypeFor(fmt: ExportFormat): string {
  switch (fmt) {
    case "csv":
      return "text/csv; charset=utf-8";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "pdf":
      return "application/pdf";
  }
}

/** Map format to the file extension used in download filenames. */
export function extensionFor(fmt: ExportFormat): string {
  return fmt;
}
