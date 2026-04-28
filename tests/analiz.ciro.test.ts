/**
 * Tests for revenue summarisation + formatters.
 * No DB — these are pure functions.
 */
import { describe, it, expect } from "vitest";
import { summarise, formatTRY, formatPercent } from "@/lib/analiz/ciro";

describe("summarise", () => {
  it("returns zeros for an empty series", () => {
    const s = summarise([]);
    expect(s.totalInvoiced).toBe(0);
    expect(s.totalPaid).toBe(0);
    expect(s.paymentRate).toBe(0);
    expect(s.weekOverWeek).toBeNull();
    expect(s.peakPaid).toBeNull();
  });

  it("computes totals, peak and rate", () => {
    const points = [
      { date: "2026-04-21", invoiced: 1000, paid: 800 },
      { date: "2026-04-22", invoiced: 2000, paid: 1500 },
      { date: "2026-04-23", invoiced: 1500, paid: 1500 },
    ];
    const s = summarise(points);
    expect(s.totalInvoiced).toBe(4500);
    expect(s.totalPaid).toBe(3800);
    expect(s.paymentRate).toBeCloseTo(3800 / 4500, 4);
    expect(s.peakPaid).toEqual({ date: "2026-04-22", amount: 1500 });
  });

  it("computes weekOverWeek when 14+ points exist", () => {
    const days = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-04-${String(i + 1).padStart(2, "0")}`,
      invoiced: 1000,
      paid: i < 7 ? 100 : 200,
    }));
    const s = summarise(days);
    expect(s.weekOverWeek).toBeCloseTo(1, 4);
  });

  it("returns null weekOverWeek when prior window is zero", () => {
    const days = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-04-${String(i + 1).padStart(2, "0")}`,
      invoiced: 1000,
      paid: i < 7 ? 0 : 100,
    }));
    const s = summarise(days);
    expect(s.weekOverWeek).toBeNull();
  });
});

describe("formatTRY", () => {
  it("uses K suffix for >= 100k", () => {
    expect(formatTRY(123_456)).toBe("123K ₺");
  });

  it("uses M suffix for >= 1M with 1 decimal", () => {
    expect(formatTRY(1_234_567)).toBe("1,2M ₺");
  });

  it("uses Turkish thousand-separator dot for 1k - 99k", () => {
    expect(formatTRY(1234)).toMatch(/^1\.234 ₺$/);
  });

  it("returns plain number under 1k", () => {
    expect(formatTRY(42)).toBe("42 ₺");
  });

  it("handles non-finite gracefully", () => {
    expect(formatTRY(NaN)).toBe("—");
    expect(formatTRY(Infinity)).toBe("—");
  });
});

describe("formatPercent", () => {
  it("multiplies by 100 and uses comma decimal", () => {
    expect(formatPercent(0.5, 1)).toBe("50,0%");
  });

  it("rounds to 0 decimals by default", () => {
    expect(formatPercent(0.876)).toBe("88%");
  });
});
