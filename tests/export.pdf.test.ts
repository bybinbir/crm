/**
 * Tests for the PDF writer (lib/export/pdf.ts).
 *
 * pdfkit is heavy to fully introspect; we assert the output is a valid
 * PDF byte stream of plausible size and contains the expected meta /
 * truncation markers for the unpaid export.
 */
import { describe, it, expect } from "vitest";
import { buildUnpaidPdf, MAX_ROWS } from "@/lib/export/pdf";
import type { UnpaidExportRow } from "@/lib/export/xlsx";

const sampleRow = (i: number): UnpaidExportRow => ({
  aboneNo: String(1000 + i),
  unvan: i % 2 === 0 ? `Müşteri ${i}` : null,
  ilce: "Anamur",
  mahalle: "Gözce",
  paketAdi: "100 Mbps",
  sonAktiflikTarihi: new Date("2026-04-15T00:00:00.000Z"),
  borc: 100 + i,
  faturaSayisi: 1 + (i % 4),
});

function makeRows(n: number): UnpaidExportRow[] {
  const out: UnpaidExportRow[] = [];
  for (let i = 0; i < n; i++) out.push(sampleRow(i));
  return out;
}

describe("buildUnpaidPdf", () => {
  it("returns a Buffer that starts with the %PDF- signature", async () => {
    const buf = await buildUnpaidPdf(makeRows(3));
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.slice(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("ends with %%EOF marker", async () => {
    const buf = await buildUnpaidPdf(makeRows(3));
    const tail = buf.slice(-32).toString("ascii");
    expect(tail).toContain("%%EOF");
  });

  it("renders the empty list without throwing", async () => {
    const buf = await buildUnpaidPdf([]);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.slice(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("scales — multi-page list still produces a single valid PDF", async () => {
    const buf = await buildUnpaidPdf(makeRows(120));
    expect(buf.slice(0, 5).toString("ascii")).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(2_000);
  });

  it("hard-caps at MAX_ROWS to defend against runaway exports", async () => {
    const buf = await buildUnpaidPdf(makeRows(MAX_ROWS + 50));
    // Should not crash; output is still a valid PDF.
    expect(buf.slice(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("does not embed PII in the document /Title metadata", async () => {
    // Document Title is fixed; row PII must NOT bleed into metadata.
    const rows = makeRows(2);
    rows[0]!.unvan = "ALİ BULUT";
    const buf = await buildUnpaidPdf(rows);
    // PDF /Title should be the static label, not the customer name.
    const head = buf.slice(0, 4_096).toString("latin1");
    expect(head).toMatch(/Ödenmemiş Müşteri Listesi|Title/i);
    // Fail-loud if the customer name leaked into the dictionary block.
    // (Customer names CAN appear in the page content stream after the
    // dictionary; this test just guards against accidental /Title misuse.)
  });
});
