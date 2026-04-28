/**
 * Customer Lifetime Value — pure analytics over invoice/customer rows.
 *
 * Definition for binbirnet:
 *   LTV(customer) = Σ(genel_toplam where odendigi_tarih NOT NULL)
 *                 / max(1, active_month_count)
 *
 * "Active month" = bir invoice tarihinin düştüğü her takvim ayı (calendar
 * month). Üst-üste 5 ay fatura gelmiş bir aboneye 5 active month sayılır.
 * Bu metodoloji binbirnet'in faturalama döngüsüne (aylık kesim) uyuyor;
 * günlük kesim olsaydı subscription-day yöntemi kullanılırdı.
 *
 * Bu modül DB'ye dokunmaz — caller `lib/db/repositories.ts` üzerinden
 * gerekli veriyi çekip buraya pas eder. Bu sayede testler hızlı ve
 * deterministik.
 */

export type LtvInputInvoice = {
  aboneNo: string;
  faturaTarihi: Date;
  genelToplam: number;
  odendigiTarih: Date | null;
};

export type LtvCustomer = {
  aboneNo: string;
  toplamOdenen: number;
  aktifAySayisi: number;
  ltv: number;
  /** Müşterinin ilk gördüğümüz faturasının ayı (YYYY-MM). */
  ilkAy: string | null;
  /** Son aktif ay (YYYY-MM). */
  sonAy: string | null;
  /** Toplam fatura sayısı (ödenmemiş dahil). */
  faturaSayisi: number;
};

/**
 * Compute per-customer LTV from a flat list of invoices.
 *
 * Sıralama / pre-grouping gerekmiyor; fonksiyon kendi grouping'ini yapar.
 */
export function computeLtv(invoices: LtvInputInvoice[]): LtvCustomer[] {
  const byCustomer = new Map<
    string,
    {
      paid: number;
      months: Set<string>;
      first: string | null;
      last: string | null;
      count: number;
    }
  >();

  for (const inv of invoices) {
    let entry = byCustomer.get(inv.aboneNo);
    if (!entry) {
      entry = { paid: 0, months: new Set(), first: null, last: null, count: 0 };
      byCustomer.set(inv.aboneNo, entry);
    }
    entry.count += 1;

    const ym = monthKey(inv.faturaTarihi);
    entry.months.add(ym);
    if (entry.first === null || ym < entry.first) entry.first = ym;
    if (entry.last === null || ym > entry.last) entry.last = ym;

    if (inv.odendigiTarih !== null) {
      entry.paid += inv.genelToplam;
    }
  }

  const out: LtvCustomer[] = [];
  for (const [aboneNo, e] of byCustomer) {
    const aktifAySayisi = e.months.size;
    const ltv = aktifAySayisi > 0 ? e.paid / aktifAySayisi : 0;
    out.push({
      aboneNo,
      toplamOdenen: round2(e.paid),
      aktifAySayisi,
      ltv: round2(ltv),
      ilkAy: e.first,
      sonAy: e.last,
      faturaSayisi: e.count,
    });
  }

  // Stabil sıralama: LTV desc, sonra abone_no asc.
  out.sort((a, b) => b.ltv - a.ltv || a.aboneNo.localeCompare(b.aboneNo));
  return out;
}

/**
 * Aggregate LTV summary for the entire customer base — used in the
 * dashboard "average customer worth" KPI.
 */
export type LtvSummary = {
  count: number;
  ortalama: number;
  medyan: number;
  toplamGelir: number;
  enYuksek: { aboneNo: string; ltv: number } | null;
  enDusuk: { aboneNo: string; ltv: number } | null;
};

export function summariseLtv(rows: LtvCustomer[]): LtvSummary {
  if (rows.length === 0) {
    return {
      count: 0,
      ortalama: 0,
      medyan: 0,
      toplamGelir: 0,
      enYuksek: null,
      enDusuk: null,
    };
  }

  const sorted = [...rows].sort((a, b) => a.ltv - b.ltv);
  const total = rows.reduce((acc, r) => acc + r.toplamOdenen, 0);
  const ortalama = total / rows.reduce((acc, r) => acc + r.aktifAySayisi || 1, 0);
  const mid = Math.floor(sorted.length / 2);
  const medyan =
    sorted.length % 2 === 0
      ? ((sorted[mid - 1]?.ltv ?? 0) + (sorted[mid]?.ltv ?? 0)) / 2
      : sorted[mid]?.ltv ?? 0;

  const top = sorted[sorted.length - 1];
  const bottom = sorted[0];

  return {
    count: rows.length,
    ortalama: round2(ortalama),
    medyan: round2(medyan),
    toplamGelir: round2(total),
    enYuksek: top ? { aboneNo: top.aboneNo, ltv: top.ltv } : null,
    enDusuk: bottom ? { aboneNo: bottom.aboneNo, ltv: bottom.ltv } : null,
  };
}

/* ─── helpers ─────────────────────────────────────────────────────────── */

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
