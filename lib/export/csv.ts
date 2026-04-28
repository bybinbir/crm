/**
 * CSV serialiser — Excel-friendly TR locale.
 *
 * Excel TR varsayılan ayraç olarak `;` bekler. Sayılarda virgül onlu,
 * binlikte nokta. UTF-8 BOM (`﻿`) Excel'in Türkçe karakterleri
 * doğru göstermesi için ekleniyor.
 *
 * Pure utility — caller'lar (Route Handler, script) DB query veya domain
 * mapping yapıp `toCsv` ile string'e çeviriyor.
 */

export type CsvColumn<Row> = {
  key: string;
  header: string;
  /** Custom formatter — default: `String(value)`. */
  format?: (row: Row) => string;
};

export type CsvOptions = {
  /** Field separator. Default `;` (Excel TR). */
  delimiter?: string;
  /** Add UTF-8 BOM at the beginning. Default `true`. */
  bom?: boolean;
  /** Newline. Default `\r\n` for cross-platform Excel. */
  newline?: "\n" | "\r\n";
};

const DEFAULTS = {
  delimiter: ";",
  bom: true,
  newline: "\r\n" as const,
};

export function toCsv<Row>(
  rows: Row[],
  columns: CsvColumn<Row>[],
  options: CsvOptions = {}
): string {
  const opts = { ...DEFAULTS, ...options };
  const lines: string[] = [];
  lines.push(columns.map((c) => escape(c.header, opts.delimiter)).join(opts.delimiter));
  for (const row of rows) {
    lines.push(
      columns
        .map((c) => {
          const v = c.format ? c.format(row) : String((row as Record<string, unknown>)[c.key] ?? "");
          return escape(v, opts.delimiter);
        })
        .join(opts.delimiter)
    );
  }
  const body = lines.join(opts.newline);
  return opts.bom ? "﻿" + body : body;
}

function escape(value: string, delimiter: string): string {
  if (value === undefined || value === null) return "";
  const needsQuote =
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r");
  if (!needsQuote) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Format a TRY amount for CSV — Excel TR onlu virgül.
 */
export function csvTRY(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "";
  return amount.toFixed(2).replace(".", ",");
}

/**
 * Format an ISO date for CSV — Excel TR `dd.mm.yyyy`.
 */
export function csvDate(d: Date | null | undefined): string {
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  return `${day}.${m}.${y}`;
}
