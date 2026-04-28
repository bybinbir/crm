/**
 * Churn-proxy analytics — "30 gün ödememiş müşteri".
 *
 * binbirnet için gerçek bir churn metriği henüz yok (müşteri silme
 * eventleri ISS Manager'dan beslenmiyor). Onun yerine:
 *
 *   - Son 30 gün içinde fatura kesilmiş ama ödeme görmemiş müşteriler
 *   - VEYA en son fatura tarihi 30 gün önceden eski olan müşteriler
 *
 * → "risk havuzu" olarak gösteriliyor. Operatör bu listeden manuel takip
 * yapar. Liste KVKK kapsamındadır; isim ve adres alanları decryption
 * isteyene kadar göstermiyoruz (`unvanEnc` raw blob olarak gelir).
 */
import {
  unpaidCustomers,
  decryptUnvan,
  type UnpaidCustomerRow,
} from "@/lib/db/repositories";

export type ChurnRow = {
  aboneNo: string;
  ilce: string | null;
  mahalle: string | null;
  paketAdi: string | null;
  /** Latest invoice date — null if customer has no invoices. */
  sonAktiflikTarihi: Date | null;
  /** Outstanding balance in TRY. */
  borc: number;
  /** Decrypted name (use ONLY in server-side render scope). */
  unvan: string | null;
  faturaSayisi: number;
};

/**
 * Loads the unpaid-customer list and decrypts `unvan` per row. Decryption
 * is opt-in; pass `decrypt: false` to keep ciphertext for callers that
 * don't render names (e.g., dashboard KPI count).
 */
export async function listUnpaidCustomers(
  cutoffDays = 30,
  options: { decrypt?: boolean } = {}
): Promise<ChurnRow[]> {
  const { decrypt = true } = options;
  const rows = await unpaidCustomers(cutoffDays);
  return rows.map((r) => mapRow(r, decrypt));
}

export async function unpaidCustomerCount(cutoffDays = 30): Promise<number> {
  const rows = await unpaidCustomers(cutoffDays);
  return rows.length;
}

function mapRow(r: UnpaidCustomerRow, decrypt: boolean): ChurnRow {
  return {
    aboneNo: r.aboneNo,
    ilce: r.ilce,
    mahalle: r.mahalle,
    paketAdi: r.paketAdi,
    sonAktiflikTarihi: r.sonAktiflikTarihi,
    borc: r.borc,
    unvan: decrypt ? decryptUnvan(r.unvanEnc) : null,
    faturaSayisi: r.fatura_count,
  };
}

/**
 * Aggregate by ilce — used by the dashboard "where is the risk?" panel.
 */
export function aggregateByIlce(
  rows: ChurnRow[]
): Array<{ ilce: string; musteriSayisi: number; borc: number }> {
  const map = new Map<string, { musteriSayisi: number; borc: number }>();
  for (const r of rows) {
    const key = r.ilce ?? "(bilinmiyor)";
    const cur = map.get(key) ?? { musteriSayisi: 0, borc: 0 };
    cur.musteriSayisi += 1;
    cur.borc += r.borc;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([ilce, agg]) => ({ ilce, ...agg }))
    .sort((a, b) => b.borc - a.borc);
}

/**
 * Bucket customers by the elapsed days since their last invoice. Used
 * for the "risk piramidi" visual — 0-30 / 31-60 / 61-90 / 90+ groups.
 */
export function bucketByAge(
  rows: ChurnRow[],
  now: Date = new Date()
): { label: string; count: number }[] {
  const buckets = [
    { label: "0-30 gün", min: 0, max: 30, count: 0 },
    { label: "31-60 gün", min: 31, max: 60, count: 0 },
    { label: "61-90 gün", min: 61, max: 90, count: 0 },
    { label: "90+ gün", min: 91, max: Number.POSITIVE_INFINITY, count: 0 },
  ];
  for (const r of rows) {
    if (!r.sonAktiflikTarihi) continue;
    const days = Math.floor(
      (now.getTime() - r.sonAktiflikTarihi.getTime()) / (24 * 60 * 60 * 1000)
    );
    for (const b of buckets) {
      if (days >= b.min && days <= b.max) {
        b.count += 1;
        break;
      }
    }
  }
  return buckets.map((b) => ({ label: b.label, count: b.count }));
}
