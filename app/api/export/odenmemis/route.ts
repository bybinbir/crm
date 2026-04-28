/**
 * GET /api/export/odenmemis — multi-format export of the unpaid list.
 *
 *   ?format=csv    (default; backward-compatible with M3)
 *   ?format=xlsx   (Excel native, exceljs)
 *   ?format=excel  (alias)
 *   ?format=pdf    (pdfkit, A4 landscape table)
 *
 * RBAC: `export:csv` capability covers all three formats — the gate is
 * "can this user export this dataset", not the byte format. Audited.
 */
import type { NextRequest } from "next/server";
import { listUnpaidCustomers } from "@/lib/analiz/churn";
import { csvDate, csvTRY, toCsv, type CsvColumn } from "@/lib/export/csv";
import { buildUnpaidWorkbook, type UnpaidExportRow } from "@/lib/export/xlsx";
import { buildUnpaidPdf } from "@/lib/export/pdf";
import {
  contentTypeFor,
  extensionFor,
  parseExportFormat,
  safeDownloadFilename,
  type ExportFormat,
} from "@/lib/export/format";
import { getDb, schema } from "@/lib/db";
import { logger } from "@/lib/logger";
import { AuthError, requireCapability } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const csvColumns: CsvColumn<UnpaidExportRow>[] = [
  { key: "aboneNo", header: "Abone No", format: (r) => r.aboneNo },
  { key: "unvan", header: "Müşteri", format: (r) => r.unvan ?? "" },
  { key: "ilce", header: "İlçe", format: (r) => r.ilce ?? "" },
  { key: "mahalle", header: "Mahalle", format: (r) => r.mahalle ?? "" },
  { key: "paketAdi", header: "Paket", format: (r) => r.paketAdi ?? "" },
  { key: "son", header: "Son Hareket", format: (r) => csvDate(r.sonAktiflikTarihi) },
  { key: "borc", header: "Borç (TL)", format: (r) => csvTRY(r.borc) },
  { key: "fc", header: "Fatura Sayısı", format: (r) => String(r.faturaSayisi) },
];

export async function GET(request: NextRequest): Promise<Response> {
  // RBAC — same capability for csv/xlsx/pdf.
  try {
    await requireCapability("export:csv");
  } catch (e) {
    if (e instanceof AuthError) return new Response(e.message, { status: e.status });
    throw e;
  }

  const url = new URL(request.url);
  const formatRaw = url.searchParams.get("format");
  const parsed = parseExportFormat(formatRaw);
  if (parsed && typeof parsed === "object" && "unknown" in parsed) {
    return new Response(
      `bilinmeyen format: ${parsed.unknown}. desteklenen: csv, xlsx, excel, pdf`,
      { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
  const fmt: ExportFormat = parsed ?? "csv";

  let rows: UnpaidExportRow[];
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
    logger.error({ err: msg, format: fmt }, "export failed");
    return new Response(`export failed: ${msg}`, { status: 500 });
  }

  const filename = safeDownloadFilename("odenmemis", extensionFor(fmt));

  let body: BodyInit;
  const contentType = contentTypeFor(fmt);

  if (fmt === "csv") {
    body = toCsv(rows, csvColumns);
  } else if (fmt === "xlsx") {
    const buf = await buildUnpaidWorkbook(rows);
    body = new Uint8Array(buf);
  } else {
    // pdf
    const buf = await buildUnpaidPdf(rows);
    body = new Uint8Array(buf);
  }

  await audit(rows.length, fmt, request).catch(() => undefined);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

async function audit(count: number, fmt: ExportFormat, req: NextRequest): Promise<void> {
  const db = getDb();
  await db.insert(schema.auditEvents).values({
    aksiyon: `export_odenmemis_${fmt}`,
    kaynak: "/api/export/odenmemis",
    sonuc: "success",
    requestId: `count=${count}`,
    ip: req.headers.get("x-forwarded-for") ?? null,
  });
}
