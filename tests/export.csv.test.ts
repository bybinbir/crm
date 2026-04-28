import { describe, it, expect } from "vitest";
import { csvDate, csvTRY, toCsv, type CsvColumn } from "@/lib/export/csv";

type Row = { name: string; amount: number; note: string };

const cols: CsvColumn<Row>[] = [
  { key: "name", header: "İsim", format: (r) => r.name },
  { key: "amount", header: "Tutar", format: (r) => csvTRY(r.amount) },
  { key: "note", header: "Not", format: (r) => r.note },
];

describe("toCsv", () => {
  it("emits UTF-8 BOM by default", () => {
    const out = toCsv<Row>([], cols);
    expect(out.charCodeAt(0)).toBe(0xfeff);
  });

  it("uses semicolon delimiter and CRLF newlines", () => {
    const out = toCsv<Row>([{ name: "Ali", amount: 100, note: "test" }], cols);
    expect(out).toContain("Ali;100,00;test");
    expect(out).toContain("\r\n");
  });

  it("quotes fields that contain the delimiter", () => {
    const out = toCsv<Row>([{ name: "A;B", amount: 100, note: "x" }], cols);
    expect(out).toContain('"A;B"');
  });

  it("escapes embedded quotes", () => {
    const out = toCsv<Row>([{ name: 'O"Connor', amount: 0, note: "" }], cols);
    expect(out).toContain('"O""Connor"');
  });

  it("supports BOM-off + comma delimiter (auto-quotes amount)", () => {
    const out = toCsv<Row>(
      [{ name: "Ali", amount: 100, note: "x" }],
      cols,
      { bom: false, delimiter: "," }
    );
    expect(out.charCodeAt(0)).not.toBe(0xfeff);
    expect(out).toContain('Ali,"100,00",x');
  });
});

describe("csvTRY", () => {
  it("formats with comma decimal", () => {
    expect(csvTRY(123.45)).toBe("123,45");
  });
  it("rounds to 2 decimals", () => {
    expect(csvTRY(123.456)).toBe("123,46");
  });
  it("returns empty for nullish/non-finite", () => {
    expect(csvTRY(null)).toBe("");
    expect(csvTRY(undefined)).toBe("");
    expect(csvTRY(NaN)).toBe("");
  });
});

describe("csvDate", () => {
  it("formats as dd.mm.yyyy", () => {
    expect(csvDate(new Date("2026-04-28T00:00:00Z"))).toMatch(/^\d{2}\.04\.2026$/);
  });
  it("returns empty for null/undefined", () => {
    expect(csvDate(null)).toBe("");
    expect(csvDate(undefined)).toBe("");
  });
});
