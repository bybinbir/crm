/**
 * Tests for the Excel writer (lib/export/xlsx.ts).
 *
 * Round-trips the workbook through `exceljs` reader to assert structure
 * (sheet names, header row, formulas, types). No file system, no network.
 */
import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { buildUnpaidWorkbook, type UnpaidExportRow } from "@/lib/export/xlsx";

const SAMPLE: UnpaidExportRow[] = [
  {
    aboneNo: "1001",
    unvan: "Çağrı Şahin",
    ilce: "Anamur",
    mahalle: "Gözce",
    paketAdi: "100 Mbps",
    sonAktiflikTarihi: new Date("2026-04-15T00:00:00.000Z"),
    borc: 1234.5,
    faturaSayisi: 3,
  },
  {
    aboneNo: "1002",
    unvan: null,
    ilce: null,
    mahalle: null,
    paketAdi: null,
    sonAktiflikTarihi: null,
    borc: 0,
    faturaSayisi: 0,
  },
];

async function readBackBuffer(buf: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  return wb;
}

describe("buildUnpaidWorkbook", () => {
  it("returns a non-empty Buffer with valid xlsx signature", async () => {
    const buf = await buildUnpaidWorkbook(SAMPLE);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(2_000); // empty xlsx is ~2KB; ours has rows
    // xlsx is a zip file — first 2 bytes are "PK".
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  it("creates a single sheet named 'Ödenmemiş'", async () => {
    const buf = await buildUnpaidWorkbook(SAMPLE);
    const wb = await readBackBuffer(buf);
    expect(wb.worksheets.length).toBe(1);
    expect(wb.worksheets[0]!.name).toBe("Ödenmemiş");
  });

  it("writes Turkish header row in expected order", async () => {
    const buf = await buildUnpaidWorkbook(SAMPLE);
    const wb = await readBackBuffer(buf);
    const ws = wb.worksheets[0]!;
    const header = ws.getRow(1).values as unknown[];
    // exceljs row.values is 1-indexed (index 0 is undefined).
    expect(header.slice(1)).toEqual([
      "Abone No",
      "Müşteri",
      "İlçe",
      "Mahalle",
      "Paket",
      "Son Hareket",
      "Borç (TL)",
      "Fatura Sayısı",
    ]);
  });

  it("preserves Turkish characters in body cells", async () => {
    const buf = await buildUnpaidWorkbook(SAMPLE);
    const wb = await readBackBuffer(buf);
    const ws = wb.worksheets[0]!;
    const row2 = ws.getRow(2).values as unknown[];
    expect(row2[2]).toBe("Çağrı Şahin"); // Müşteri
    expect(row2[3]).toBe("Anamur");      // İlçe
  });

  it("stores borç as a number (not a string)", async () => {
    const buf = await buildUnpaidWorkbook(SAMPLE);
    const wb = await readBackBuffer(buf);
    const ws = wb.worksheets[0]!;
    const row2 = ws.getRow(2).values as unknown[];
    expect(typeof row2[7]).toBe("number");
    expect(row2[7]).toBe(1234.5);
  });

  it("handles empty list (header only)", async () => {
    const buf = await buildUnpaidWorkbook([]);
    const wb = await readBackBuffer(buf);
    const ws = wb.worksheets[0]!;
    expect(ws.rowCount).toBe(1); // header only
  });

  it("freezes the header row (ySplit=1)", async () => {
    const buf = await buildUnpaidWorkbook(SAMPLE);
    const wb = await readBackBuffer(buf);
    const ws = wb.worksheets[0]!;
    const view = ws.views[0] as ExcelJS.WorksheetView & { ySplit?: number };
    expect(view?.state).toBe("frozen");
    expect(view?.ySplit).toBe(1);
  });
});
