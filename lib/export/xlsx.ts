/**
 * Excel (.xlsx) writer for the unpaid-customers export.
 *
 * Uses `exceljs` server-side. We never ship this to the browser.
 *
 * Goals:
 *   - Header row visible (frozen) so long lists scroll cleanly.
 *   - Currency cells use Excel's number-format so accountants can
 *     SUM/COUNT without parsing strings.
 *   - Date cells are real Excel dates (not strings).
 *   - Column widths sized to typical content; no auto-fit guesswork.
 *   - UTF-8 / Türkçe karakter doğru render eder.
 */
import ExcelJS from "exceljs";

export type UnpaidExportRow = {
  aboneNo: string;
  unvan: string | null;
  ilce: string | null;
  mahalle: string | null;
  paketAdi: string | null;
  sonAktiflikTarihi: Date | null;
  borc: number;
  faturaSayisi: number;
};

const SHEET_NAME = "Ödenmemiş";

const COLUMNS: Array<{
  header: string;
  key: keyof UnpaidExportRow | "borcTl";
  width: number;
  numFmt?: string;
}> = [
  { header: "Abone No", key: "aboneNo", width: 12 },
  { header: "Müşteri", key: "unvan", width: 32 },
  { header: "İlçe", key: "ilce", width: 16 },
  { header: "Mahalle", key: "mahalle", width: 20 },
  { header: "Paket", key: "paketAdi", width: 24 },
  { header: "Son Hareket", key: "sonAktiflikTarihi", width: 14, numFmt: "dd.mm.yyyy" },
  { header: "Borç (TL)", key: "borcTl", width: 14, numFmt: "#,##0.00" },
  { header: "Fatura Sayısı", key: "faturaSayisi", width: 14, numFmt: "0" },
];

/**
 * Build a workbook buffer for the unpaid-customers export. Returns a
 * Node.js `Buffer` ready to stream as the response body.
 */
export async function buildUnpaidWorkbook(rows: UnpaidExportRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "crmanaliz";
  wb.lastModifiedBy = "crmanaliz";
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet(SHEET_NAME, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = COLUMNS.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
    ...(c.numFmt ? { style: { numFmt: c.numFmt } } : {}),
  }));

  // Style the header row.
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 20;

  for (const r of rows) {
    ws.addRow({
      aboneNo: r.aboneNo,
      unvan: r.unvan ?? "",
      ilce: r.ilce ?? "",
      mahalle: r.mahalle ?? "",
      paketAdi: r.paketAdi ?? "",
      sonAktiflikTarihi: r.sonAktiflikTarihi ?? null,
      borcTl: r.borc,
      faturaSayisi: r.faturaSayisi,
    });
  }

  const arrayBuf = await wb.xlsx.writeBuffer();
  // exceljs returns a polyfill ArrayBuffer; normalise to Node Buffer.
  return Buffer.from(arrayBuf as ArrayBuffer);
}
