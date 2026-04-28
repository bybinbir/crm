/**
 * PDF writer for the unpaid-customers export — pdfkit.
 *
 * Constraints:
 *   - Operatör için bir-bakışta-okunabilir bir liste; süslü tasarım yok.
 *   - Türkçe karakterler (ç, ş, ı, ğ, ü, ö) stable; pdfkit'in built-in
 *     Helvetica fontu WinAnsi encoding ile çalışır ve Türkçe Latin-1
 *     karakterlerini destekler.
 *   - Çok uzun listeler için sayfa başına satır sayısı sınırı +
 *     `MAX_ROWS` hard cap (defense against runaway export).
 *   - Tüm I/O bellek üzerinde; dosya sistemi yok, tmp yok.
 */
import PDFDocument from "pdfkit";
import { trAmount, trDate } from "./format";
import type { UnpaidExportRow } from "./xlsx";

/** Hard cap on rows per PDF; protects DoS by report request. */
export const MAX_ROWS = 5_000;
const ROWS_PER_PAGE = 30;

const COLS: Array<{
  header: string;
  width: number;
  align: "left" | "right";
  pick: (r: UnpaidExportRow) => string;
}> = [
  { header: "Abone", width: 60, align: "left", pick: (r) => r.aboneNo },
  { header: "Müşteri", width: 150, align: "left", pick: (r) => r.unvan ?? "" },
  { header: "İlçe", width: 70, align: "left", pick: (r) => r.ilce ?? "" },
  { header: "Mahalle", width: 100, align: "left", pick: (r) => r.mahalle ?? "" },
  { header: "Paket", width: 95, align: "left", pick: (r) => r.paketAdi ?? "" },
  { header: "Son Hareket", width: 65, align: "left", pick: (r) => trDate(r.sonAktiflikTarihi) },
  { header: "Borç (TL)", width: 60, align: "right", pick: (r) => trAmount(r.borc) },
  { header: "F#", width: 25, align: "right", pick: (r) => String(r.faturaSayisi) },
];

const PAGE_MARGIN = 36;
const ROW_HEIGHT = 16;

/**
 * Render the unpaid-customers PDF and return the full buffer.
 * Async because pdfkit streams; we collect the chunks in memory.
 */
export function buildUnpaidPdf(rows: UnpaidExportRow[]): Promise<Buffer> {
  const limited = rows.length > MAX_ROWS ? rows.slice(0, MAX_ROWS) : rows;
  const truncated = rows.length > MAX_ROWS;

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: PAGE_MARGIN,
      info: {
        Title: "Ödenmemiş Müşteri Listesi",
        Author: "crmanaliz",
        Creator: "crmanaliz",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    drawHeader(doc, limited.length, truncated);
    drawTableHeader(doc);

    let rowOnPage = 0;
    for (const r of limited) {
      if (rowOnPage >= ROWS_PER_PAGE) {
        doc.addPage();
        drawTableHeader(doc);
        rowOnPage = 0;
      }
      drawRow(doc, r);
      rowOnPage += 1;
    }

    doc.end();
  });
}

function drawHeader(doc: PDFKit.PDFDocument, count: number, truncated: boolean): void {
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#000000")
    .text("Ödenmemiş Müşteri Listesi", { align: "left" });
  doc.font("Helvetica").fontSize(9).fillColor("#444444");
  const today = trDate(new Date());
  const meta = truncated
    ? `Tarih: ${today}    Kayıt: ${count} (ilk ${MAX_ROWS}, geri kalan kesildi)`
    : `Tarih: ${today}    Kayıt: ${count}`;
  doc.text(meta);
  doc.moveDown(0.6);
}

function drawTableHeader(doc: PDFKit.PDFDocument): void {
  const y = doc.y;
  let x = doc.page.margins.left;
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#000000");
  for (const col of COLS) {
    doc.text(col.header, x, y, { width: col.width, align: col.align, lineBreak: false });
    x += col.width;
  }
  doc.moveTo(doc.page.margins.left, y + ROW_HEIGHT - 4)
    .lineTo(doc.page.width - doc.page.margins.right, y + ROW_HEIGHT - 4)
    .lineWidth(0.5)
    .strokeColor("#999999")
    .stroke();
  doc.y = y + ROW_HEIGHT;
}

function drawRow(doc: PDFKit.PDFDocument, r: UnpaidExportRow): void {
  const y = doc.y;
  let x = doc.page.margins.left;
  doc.font("Helvetica").fontSize(9).fillColor("#111111");
  for (const col of COLS) {
    doc.text(col.pick(r), x, y, {
      width: col.width,
      align: col.align,
      lineBreak: false,
      ellipsis: true,
    });
    x += col.width;
  }
  doc.y = y + ROW_HEIGHT;
}
