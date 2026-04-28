/**
 * Tests for shared export formatting helpers (lib/export/format.ts).
 * Pure functions; no DB / network.
 */
import { describe, it, expect } from "vitest";
import {
  trAmount,
  trCurrency,
  trDate,
  todayStamp,
  safeDownloadFilename,
  parseExportFormat,
  contentTypeFor,
  extensionFor,
} from "@/lib/export/format";

describe("trAmount / trCurrency", () => {
  it("formats with TR thousand and decimal", () => {
    expect(trAmount(0)).toBe("0,00");
    expect(trAmount(7.5)).toBe("7,50");
    expect(trAmount(1234.5)).toBe("1.234,50");
    expect(trAmount(1234567.89)).toBe("1.234.567,89");
  });
  it("returns empty string for null/undefined/NaN/Infinity", () => {
    expect(trAmount(null)).toBe("");
    expect(trAmount(undefined)).toBe("");
    expect(trAmount(Number.NaN)).toBe("");
    expect(trAmount(Number.POSITIVE_INFINITY)).toBe("");
  });
  it("trCurrency appends ₺ suffix when amount is present", () => {
    expect(trCurrency(7.5)).toBe("7,50 ₺");
    expect(trCurrency(null)).toBe("");
  });
});

describe("trDate", () => {
  it("formats as dd.mm.yyyy", () => {
    expect(trDate(new Date("2026-04-29T12:00:00.000Z"))).toMatch(/^29\.04\.2026$|^28\.04\.2026$|^30\.04\.2026$/);
  });
  it("returns empty for null/undefined", () => {
    expect(trDate(null)).toBe("");
    expect(trDate(undefined)).toBe("");
  });
});

describe("todayStamp", () => {
  it("returns YYYY-MM-DD UTC", () => {
    const stamp = todayStamp(new Date("2026-04-29T01:23:45.000Z"));
    expect(stamp).toBe("2026-04-29");
  });
});

describe("safeDownloadFilename", () => {
  it("strips path traversal segments", () => {
    const f = safeDownloadFilename("../etc/passwd", "csv");
    expect(f).not.toContain("..");
    expect(f).not.toContain("/");
    expect(f.endsWith(".csv")).toBe(true);
  });
  it("strips control chars and quotes", () => {
    const f = safeDownloadFilename('odenmemis"\r\n\x00', "xlsx");
    expect(f).not.toMatch(/["'\r\n\x00]/);
    expect(f.endsWith(".xlsx")).toBe(true);
  });
  it("falls back to 'export' on empty stem", () => {
    expect(safeDownloadFilename("   ", "pdf")).toMatch(/^export-\d{4}-\d{2}-\d{2}\.pdf$/);
  });
  it("normalises extension casing/strips weird chars", () => {
    expect(safeDownloadFilename("odenmemis", "PDF!?")).toMatch(/\.pdf$/);
  });
});

describe("parseExportFormat", () => {
  it("returns null for missing/empty input", () => {
    expect(parseExportFormat(null)).toBeNull();
    expect(parseExportFormat(undefined)).toBeNull();
    expect(parseExportFormat("")).toBeNull();
  });
  it("recognises csv / xlsx / pdf", () => {
    expect(parseExportFormat("csv")).toBe("csv");
    expect(parseExportFormat("xlsx")).toBe("xlsx");
    expect(parseExportFormat("pdf")).toBe("pdf");
  });
  it("aliases excel and xls to xlsx", () => {
    expect(parseExportFormat("excel")).toBe("xlsx");
    expect(parseExportFormat("xls")).toBe("xlsx");
  });
  it("is case-insensitive and trims", () => {
    expect(parseExportFormat("  PDF  ")).toBe("pdf");
    expect(parseExportFormat("XLSX")).toBe("xlsx");
  });
  it("returns { unknown } for bad input (clamped to 32 chars)", () => {
    const r = parseExportFormat("ransomware-pleez");
    expect(r).toEqual({ unknown: "ransomware-pleez" });
    const r2 = parseExportFormat("x".repeat(500));
    expect(r2 && typeof r2 === "object" && "unknown" in r2 ? r2.unknown.length : -1).toBeLessThanOrEqual(32);
  });
});

describe("contentTypeFor / extensionFor", () => {
  it("maps to expected MIME types", () => {
    expect(contentTypeFor("csv")).toBe("text/csv; charset=utf-8");
    expect(contentTypeFor("xlsx")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(contentTypeFor("pdf")).toBe("application/pdf");
  });
  it("maps to file extensions", () => {
    expect(extensionFor("csv")).toBe("csv");
    expect(extensionFor("xlsx")).toBe("xlsx");
    expect(extensionFor("pdf")).toBe("pdf");
  });
});
