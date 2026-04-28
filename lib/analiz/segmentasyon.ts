/**
 * Package-based segmentation analytics.
 *
 * binbirnet için en kritik soru "hangi paket en çok geliri getiriyor?".
 * Bu modül paket adına göre invoice'ları gruplar ve şu metrikleri üretir:
 *
 *   - musteriSayisi  : tekil abone_no count
 *   - faturaSayisi   : toplam fatura adedi
 *   - kesilen        : toplam genel_toplam
 *   - tahsilEdilen   : ödenmiş kısım
 *   - odemeOrani     : tahsilEdilen / kesilen (0..1)
 *   - ortMusteri     : kesilen / musteriSayisi
 *
 * Sıralama: kesilen DESC. Aynı zamanda month-over-month karşılaştırma
 * helper'ı (`compareMonths`) da burada — segmentasyonun zaman boyutunu
 * desteklemek için.
 */

export type SegmentInputInvoice = {
  aboneNo: string;
  paketAdi: string | null;
  genelToplam: number;
  faturaTarihi: Date;
  odendigiTarih: Date | null;
};

export type PackageSegment = {
  paketAdi: string;
  musteriSayisi: number;
  faturaSayisi: number;
  kesilen: number;
  tahsilEdilen: number;
  odemeOrani: number;
  ortMusteri: number;
};

/**
 * Group invoices by paketAdi and produce per-package metrics.
 * Null/empty package names are bucketed under "(paket yok)".
 */
export function segmentByPackage(invoices: SegmentInputInvoice[]): PackageSegment[] {
  const buckets = new Map<
    string,
    {
      customers: Set<string>;
      faturaSayisi: number;
      kesilen: number;
      tahsilEdilen: number;
    }
  >();

  for (const inv of invoices) {
    const key = (inv.paketAdi ?? "").trim() || "(paket yok)";
    let b = buckets.get(key);
    if (!b) {
      b = { customers: new Set(), faturaSayisi: 0, kesilen: 0, tahsilEdilen: 0 };
      buckets.set(key, b);
    }
    b.customers.add(inv.aboneNo);
    b.faturaSayisi += 1;
    b.kesilen += inv.genelToplam;
    if (inv.odendigiTarih !== null) {
      b.tahsilEdilen += inv.genelToplam;
    }
  }

  const out: PackageSegment[] = [];
  for (const [paketAdi, b] of buckets) {
    const odemeOrani = b.kesilen > 0 ? b.tahsilEdilen / b.kesilen : 0;
    const ortMusteri =
      b.customers.size > 0 ? b.kesilen / b.customers.size : 0;
    out.push({
      paketAdi,
      musteriSayisi: b.customers.size,
      faturaSayisi: b.faturaSayisi,
      kesilen: round2(b.kesilen),
      tahsilEdilen: round2(b.tahsilEdilen),
      odemeOrani: round4(odemeOrani),
      ortMusteri: round2(ortMusteri),
    });
  }

  out.sort((a, b) => b.kesilen - a.kesilen || a.paketAdi.localeCompare(b.paketAdi));
  return out;
}

/* ─── Month-over-month comparison ──────────────────────────────────────── */

export type MonthlyTotals = {
  ay: string; // YYYY-MM
  kesilen: number;
  tahsilEdilen: number;
  faturaSayisi: number;
  benzersizMusteri: number;
};

export function aggregateByMonth(invoices: SegmentInputInvoice[]): MonthlyTotals[] {
  const map = new Map<
    string,
    {
      kesilen: number;
      tahsilEdilen: number;
      faturaSayisi: number;
      customers: Set<string>;
    }
  >();

  for (const inv of invoices) {
    const ay = monthKey(inv.faturaTarihi);
    let cur = map.get(ay);
    if (!cur) {
      cur = { kesilen: 0, tahsilEdilen: 0, faturaSayisi: 0, customers: new Set() };
      map.set(ay, cur);
    }
    cur.kesilen += inv.genelToplam;
    cur.faturaSayisi += 1;
    cur.customers.add(inv.aboneNo);
    if (inv.odendigiTarih !== null) cur.tahsilEdilen += inv.genelToplam;
  }

  const out = [...map.entries()].map(([ay, v]) => ({
    ay,
    kesilen: round2(v.kesilen),
    tahsilEdilen: round2(v.tahsilEdilen),
    faturaSayisi: v.faturaSayisi,
    benzersizMusteri: v.customers.size,
  }));
  out.sort((a, b) => a.ay.localeCompare(b.ay));
  return out;
}

export type MonthComparison = {
  current: MonthlyTotals | null;
  previous: MonthlyTotals | null;
  yearAgo: MonthlyTotals | null;
  /** Pct change current vs previous. null if previous is 0. */
  momKesilen: number | null;
  momTahsil: number | null;
  /** Pct change current vs same month last year. null if not present. */
  yoyKesilen: number | null;
};

export function compareMonths(
  buckets: MonthlyTotals[],
  currentMonth: string
): MonthComparison {
  const map = new Map(buckets.map((b) => [b.ay, b]));
  const current = map.get(currentMonth) ?? null;
  const previous = map.get(prevMonth(currentMonth)) ?? null;
  const yearAgo = map.get(yearAgoMonth(currentMonth)) ?? null;

  const momKesilen = pctChange(previous?.kesilen, current?.kesilen);
  const momTahsil = pctChange(previous?.tahsilEdilen, current?.tahsilEdilen);
  const yoyKesilen = pctChange(yearAgo?.kesilen, current?.kesilen);

  return { current, previous, yearAgo, momKesilen, momTahsil, yoyKesilen };
}

/* ─── helpers ─────────────────────────────────────────────────────────── */

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function prevMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function yearAgoMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  return `${y - 1}-${String(m).padStart(2, "0")}`;
}

function pctChange(prev: number | undefined, cur: number | undefined): number | null {
  if (prev === undefined || cur === undefined || prev === 0) return null;
  return round4((cur - prev) / prev);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
