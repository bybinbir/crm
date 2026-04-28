import { describe, it, expect } from "vitest";
import {
  aggregateByMonth,
  compareMonths,
  prevMonth,
  segmentByPackage,
  yearAgoMonth,
  type SegmentInputInvoice,
} from "@/lib/analiz/segmentasyon";

function inv(
  abone: string,
  paket: string | null,
  date: string,
  total: number,
  paid: string | null
): SegmentInputInvoice {
  return {
    aboneNo: abone,
    paketAdi: paket,
    genelToplam: total,
    faturaTarihi: new Date(date),
    odendigiTarih: paid ? new Date(paid) : null,
  };
}

describe("segmentByPackage", () => {
  it("groups invoices by paketAdi", () => {
    const rows = segmentByPackage([
      inv("A1", "Anamur Süper 16 Wifi", "2026-01-15T00:00:00Z", 600, "2026-01-20T00:00:00Z"),
      inv("A2", "Anamur Süper 25 Wifi", "2026-01-15T00:00:00Z", 740, "2026-01-20T00:00:00Z"),
      inv("A1", "Anamur Süper 16 Wifi", "2026-02-15T00:00:00Z", 600, null),
      inv("A3", "Anamur Süper 25 Wifi", "2026-02-15T00:00:00Z", 740, "2026-02-19T00:00:00Z"),
    ]);
    expect(rows).toHaveLength(2);
    const s25 = rows.find((r) => r.paketAdi === "Anamur Süper 25 Wifi");
    expect(s25?.musteriSayisi).toBe(2);
    expect(s25?.faturaSayisi).toBe(2);
    expect(s25?.kesilen).toBe(1480);
    expect(s25?.tahsilEdilen).toBe(1480);
    expect(s25?.odemeOrani).toBe(1);

    const s16 = rows.find((r) => r.paketAdi === "Anamur Süper 16 Wifi");
    expect(s16?.musteriSayisi).toBe(1);
    expect(s16?.faturaSayisi).toBe(2);
    expect(s16?.kesilen).toBe(1200);
    expect(s16?.tahsilEdilen).toBe(600);
    expect(s16?.odemeOrani).toBeCloseTo(0.5, 4);
  });

  it("buckets null/empty package names under '(paket yok)'", () => {
    const rows = segmentByPackage([
      inv("A1", null, "2026-01-15T00:00:00Z", 100, null),
      inv("A2", "", "2026-01-15T00:00:00Z", 200, null),
    ]);
    expect(rows.find((r) => r.paketAdi === "(paket yok)")?.musteriSayisi).toBe(2);
  });

  it("sorts by kesilen descending", () => {
    const rows = segmentByPackage([
      inv("A1", "Düşük", "2026-01-15T00:00:00Z", 100, null),
      inv("A2", "Yüksek", "2026-01-15T00:00:00Z", 1000, null),
      inv("A3", "Orta", "2026-01-15T00:00:00Z", 500, null),
    ]);
    expect(rows.map((r) => r.paketAdi)).toEqual(["Yüksek", "Orta", "Düşük"]);
  });
});

describe("aggregateByMonth", () => {
  it("produces ascending month buckets", () => {
    const buckets = aggregateByMonth([
      inv("A1", "P", "2026-03-10T00:00:00Z", 100, "2026-03-15T00:00:00Z"),
      inv("A1", "P", "2026-01-10T00:00:00Z", 100, "2026-01-15T00:00:00Z"),
      inv("A1", "P", "2026-02-10T00:00:00Z", 100, null),
    ]);
    expect(buckets.map((b) => b.ay)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(buckets[1]?.tahsilEdilen).toBe(0);
    expect(buckets[2]?.tahsilEdilen).toBe(100);
  });
});

describe("compareMonths", () => {
  const buckets = [
    { ay: "2025-04", kesilen: 1000, tahsilEdilen: 800, faturaSayisi: 10, benzersizMusteri: 10 },
    { ay: "2026-03", kesilen: 2000, tahsilEdilen: 1900, faturaSayisi: 20, benzersizMusteri: 18 },
    { ay: "2026-04", kesilen: 2500, tahsilEdilen: 2200, faturaSayisi: 25, benzersizMusteri: 22 },
  ];

  it("computes month-over-month change", () => {
    const c = compareMonths(buckets, "2026-04");
    expect(c.current?.ay).toBe("2026-04");
    expect(c.previous?.ay).toBe("2026-03");
    expect(c.momKesilen).toBeCloseTo(0.25, 4);
    expect(c.momTahsil).toBeCloseTo((2200 - 1900) / 1900, 4);
  });

  it("computes year-over-year change", () => {
    const c = compareMonths(buckets, "2026-04");
    expect(c.yearAgo?.ay).toBe("2025-04");
    expect(c.yoyKesilen).toBeCloseTo(1.5, 4);
  });

  it("returns null when previous month missing", () => {
    const c = compareMonths(buckets.slice(0, 1), "2025-04");
    expect(c.momKesilen).toBeNull();
  });
});

describe("prevMonth / yearAgoMonth", () => {
  it("rolls year boundary backwards", () => {
    expect(prevMonth("2026-01")).toBe("2025-12");
    expect(prevMonth("2026-12")).toBe("2026-11");
  });
  it("computes year-ago month", () => {
    expect(yearAgoMonth("2026-04")).toBe("2025-04");
  });
});
