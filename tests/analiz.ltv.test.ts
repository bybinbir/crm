import { describe, it, expect } from "vitest";
import { computeLtv, summariseLtv, type LtvInputInvoice } from "@/lib/analiz/ltv";

function inv(
  aboneNo: string,
  isoDate: string,
  amount: number,
  paidDate: string | null
): LtvInputInvoice {
  return {
    aboneNo,
    faturaTarihi: new Date(isoDate),
    genelToplam: amount,
    odendigiTarih: paidDate ? new Date(paidDate) : null,
  };
}

describe("computeLtv", () => {
  it("returns empty array for empty input", () => {
    expect(computeLtv([])).toEqual([]);
  });

  it("computes LTV for a single customer with two paid invoices in two months", () => {
    const rows = computeLtv([
      inv("A1", "2026-01-15T00:00:00Z", 740, "2026-01-20T00:00:00Z"),
      inv("A1", "2026-02-15T00:00:00Z", 740, "2026-02-19T00:00:00Z"),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.aboneNo).toBe("A1");
    expect(rows[0]?.toplamOdenen).toBe(1480);
    expect(rows[0]?.aktifAySayisi).toBe(2);
    expect(rows[0]?.ltv).toBe(740);
    expect(rows[0]?.faturaSayisi).toBe(2);
  });

  it("ignores unpaid invoices in toplamOdenen but counts the month for activity", () => {
    const rows = computeLtv([
      inv("A1", "2026-01-15T00:00:00Z", 740, "2026-01-20T00:00:00Z"),
      inv("A1", "2026-02-15T00:00:00Z", 740, null),
      inv("A1", "2026-03-15T00:00:00Z", 740, "2026-03-20T00:00:00Z"),
    ]);
    expect(rows[0]?.toplamOdenen).toBe(1480);
    expect(rows[0]?.aktifAySayisi).toBe(3);
    // 1480 / 3 ≈ 493.33
    expect(rows[0]?.ltv).toBeCloseTo(493.33, 1);
  });

  it("sorts results by ltv descending then abone_no", () => {
    const rows = computeLtv([
      inv("LOW", "2026-01-15T00:00:00Z", 100, "2026-01-20T00:00:00Z"),
      inv("HI", "2026-01-15T00:00:00Z", 1000, "2026-01-20T00:00:00Z"),
      inv("MID", "2026-01-15T00:00:00Z", 500, "2026-01-20T00:00:00Z"),
    ]);
    expect(rows.map((r) => r.aboneNo)).toEqual(["HI", "MID", "LOW"]);
  });

  it("captures first and last active month per customer", () => {
    const rows = computeLtv([
      inv("A1", "2026-03-15T00:00:00Z", 740, "2026-03-20T00:00:00Z"),
      inv("A1", "2026-01-15T00:00:00Z", 740, "2026-01-20T00:00:00Z"),
    ]);
    expect(rows[0]?.ilkAy).toBe("2026-01");
    expect(rows[0]?.sonAy).toBe("2026-03");
  });

  it("isolates customers correctly when input contains many", () => {
    const rows = computeLtv([
      inv("A1", "2026-01-15T00:00:00Z", 100, "2026-01-20T00:00:00Z"),
      inv("A2", "2026-01-15T00:00:00Z", 200, "2026-01-20T00:00:00Z"),
      inv("A1", "2026-02-15T00:00:00Z", 100, "2026-02-20T00:00:00Z"),
    ]);
    expect(rows.find((r) => r.aboneNo === "A1")?.aktifAySayisi).toBe(2);
    expect(rows.find((r) => r.aboneNo === "A2")?.aktifAySayisi).toBe(1);
  });
});

describe("summariseLtv", () => {
  it("returns zeros for empty input", () => {
    const s = summariseLtv([]);
    expect(s.count).toBe(0);
    expect(s.medyan).toBe(0);
    expect(s.enYuksek).toBeNull();
  });

  it("computes median correctly for odd count", () => {
    const rows = computeLtv([
      inv("A", "2026-01-15T00:00:00Z", 100, "2026-01-20T00:00:00Z"),
      inv("B", "2026-01-15T00:00:00Z", 200, "2026-01-20T00:00:00Z"),
      inv("C", "2026-01-15T00:00:00Z", 300, "2026-01-20T00:00:00Z"),
    ]);
    const s = summariseLtv(rows);
    expect(s.count).toBe(3);
    expect(s.medyan).toBe(200);
    expect(s.enYuksek?.aboneNo).toBe("C");
    expect(s.enDusuk?.aboneNo).toBe("A");
  });

  it("computes median correctly for even count", () => {
    const rows = computeLtv([
      inv("A", "2026-01-15T00:00:00Z", 100, "2026-01-20T00:00:00Z"),
      inv("B", "2026-01-15T00:00:00Z", 200, "2026-01-20T00:00:00Z"),
      inv("C", "2026-01-15T00:00:00Z", 300, "2026-01-20T00:00:00Z"),
      inv("D", "2026-01-15T00:00:00Z", 400, "2026-01-20T00:00:00Z"),
    ]);
    const s = summariseLtv(rows);
    // (200 + 300) / 2 = 250
    expect(s.medyan).toBe(250);
  });
});
