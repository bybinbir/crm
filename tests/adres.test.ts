/**
 * Address parser tests — covers Anamur mahalle extraction, ilce/il
 * detection, numara/sokak parsing, malformed inputs, and confidence
 * scoring. Inputs are anonymised samples from real ISS Manager invoices.
 */
import { describe, it, expect } from "vitest";
import { parseAdres } from "@/lib/adres";

describe("parseAdres", () => {
  it("extracts canonical Anamur address structure", () => {
    const a = parseAdres("SAĞLIK MAH. 710 CAD. NO:23/4 ANAMUR/MERSİN");
    expect(a.mahalle).toBe("SAĞLIK");
    expect(a.ilce).toBe("ANAMUR");
    expect(a.il).toBe("MERSİN");
    expect(a.numara).toBe("23/4");
    expect(a.guven).toBeGreaterThanOrEqual(0.95);
  });

  it("handles ASCII-folded misspellings via alias table", () => {
    const a = parseAdres("saglik mah. 710 cad. no:5 anamur/mersin");
    expect(a.mahalle).toBe("SAĞLIK");
    expect(a.ilce).toBe("ANAMUR");
    expect(a.il).toBe("MERSİN");
  });

  it("parses BAHÇE mahalle with bulvar style street", () => {
    const a = parseAdres("BAHÇE MAH. ATATÜRK BUL. NO:15 ANAMUR/MERSİN");
    expect(a.mahalle).toBe("BAHÇE");
    expect(a.ilce).toBe("ANAMUR");
    expect(a.numara).toBe("15");
  });

  it("falls back to KÖY pattern when no MAH. token present", () => {
    const a = parseAdres("ÖREN KÖYÜ MEYDAN MEVKİ NO:8 ANAMUR / MERSİN");
    expect(a.mahalle).toBe("ÖREN");
    expect(a.ilce).toBe("ANAMUR");
    expect(a.numara).toBe("8");
  });

  it("tolerates swapped il/ilce order", () => {
    const a = parseAdres("FATİH MAH. KARDEŞLER SOK. NO:3 MERSİN/ANAMUR");
    expect(a.mahalle).toBe("FATİH");
    expect(a.ilce).toBe("ANAMUR");
    expect(a.il).toBe("MERSİN");
  });

  it("handles unknown mahalle by returning cleaned candidate", () => {
    const a = parseAdres("UYDURMA MAH. NO:1 ANAMUR/MERSİN");
    expect(a.mahalle).toBe("UYDURMA");
    expect(a.ilce).toBe("ANAMUR");
  });

  it("returns empty parse for empty / null / whitespace input", () => {
    expect(parseAdres(null).guven).toBe(0);
    expect(parseAdres(undefined).guven).toBe(0);
    expect(parseAdres("").guven).toBe(0);
    expect(parseAdres("   ").guven).toBe(0);
  });

  it("never throws on garbage input", () => {
    expect(() => parseAdres("???//\n\t")).not.toThrow();
    expect(() => parseAdres("12345")).not.toThrow();
    expect(() => parseAdres("MAH MAH MAH MAH")).not.toThrow();
  });

  it("extracts numara even when only NO: marker present", () => {
    const a = parseAdres("BİR YERDE BURADA NO: 99");
    expect(a.numara).toBe("99");
  });

  it("preserves original input as 'ham'", () => {
    const raw = "  SAĞLIK   mah.   710  CAD.  no:23/4  ANAMUR / MERSİN  ";
    const a = parseAdres(raw);
    expect(a.ham).toBe(raw);
    expect(a.normalize).not.toMatch(/  /);
  });

  it("confidence reflects how many fields were extracted", () => {
    const fullParse = parseAdres("SAĞLIK MAH. NO:1 ANAMUR/MERSİN");
    const partial = parseAdres("SAĞLIK MAH.");
    expect(fullParse.guven).toBeGreaterThan(partial.guven);
  });
});
