/**
 * GET /api/export/odenmemis
 *
 * Returns the unpaid-customer list (30-day cutoff) as a CSV download.
 * Decryption happens server-side; the response body is plaintext CSV
 * (UTF-8 BOM + `;` delimited for Excel TR).
 *
 * Audit: every export call is recorded in `audit_events`.
 */
import type { NextRequest } from "next/server";
import { listUnpaidCustomers } from "@/lib/analiz/churn";
import { csvDate, csvTRY, toCsv, type CsvColumn } from "@/lib/export/csv";
import { getDb, schema } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Row = {
  aboneNo: string;
  unvan: string | null;
  ilce: string | null;
  mahalle: string | null;
  paketAdi: string | null;
  sonAktiflikTarihi: Date | null;
  borc: number;
  faturaSayisi: number;
};

const columns: CsvColumn<Row>[] = [
  { key: "aboneNo", header: "Abone No", format: (r) => r.aboneNo },
  { key: "unvan", header: "Müşteri", format: (r) => r.unvan ?? "" },
  { key: "ilce", header: "İlçe", format: (r) => r.ilce ?? "" },
  { key: "mahalle", header: "Mahalle", format: (r) => r.mahalle ?? "" },
  { key: "paketAdi", header: "Paket", format: (r) => r.paketAdi ?? "" },
  {
    key: "sonAktiflikTarihi",
    header: "Son Hareket",
    format: (r) => csvDate(r.sonAktiflikTarihi),
  },
  { key: "borc", header: "Borç (TL)", format: (r) => csvTRY(r.borc) },
  { key: "faturaSayisi", header: "Fatura Sayısı", format: (r) => String(r.faturaSayisi) },
];

export async function GET(request: NextRequest): Promise<Response> {
  let rows: Row[];
  try {
    const list = await listUnpaidCustomers(30, { decrypt: true });
    rows = list.map((r) => ({
      aboneNo: r.aboneNo,
      unvan: r.unvan,
      ilce: r.ilce,
      mahalle: r.mahalle,
      paketAdi: r.paketAdi,
      sonAktiflikTarihi: r.sonAktiflikTarihi,
      borc: r.borc,
      faturaSayisi: r.faturaSayisi,
    }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ err: msg }, "csv export failed");
    return new Response(`export failed: ${msg}`, { status: 500 });
  }

  const csv = toCsv(rows, columns);
  await audit(rows.length, request).catch(() => undefined);

  const filename = `odenmemis-musteriler-${stamp()}.csv`;
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

async function audit(count: number, request: NextRequest): Promise<void> {
  const db = getDb();
  await db.insert(schema.auditEvents).values({
    aksiyon: "export_odenmemis_csv",
    kaynak: "/api/export/odenmemis",
    sonuc: "success",
    requestId: `count=${count}`,
    ip: request.headers.get("x-forwarded-for") ?? null,
  });
}

function stamp(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
