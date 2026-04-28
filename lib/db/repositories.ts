/**
 * Persistence helpers for the invoice/customer ingest path.
 *
 * Every mutation is wrapped in a tiny, focused function so the smoke test,
 * the cron pull script, and Server Actions all share the same code paths.
 *
 * IMPORTANT — KVKK posture:
 *   - PII columns are encrypted in this layer; no caller writes plaintext
 *     PII to the DB.
 *   - Reads return decrypted plaintext only inside Server Actions / Route
 *     Handlers; never expose plaintext via the DB layer to a Client
 *     Component or to a log statement.
 */
import { createHash } from "node:crypto";
import { and, between, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { encryptString, decryptString } from "@/lib/crypto/encrypt";
import { parseAdres } from "@/lib/adres";
import type { Invoice } from "@/lib/issmanager";
import { faturalar, getDb, musteriler, pullRuns } from "@/lib/db";

export type UpsertInvoiceResult = {
  faturaNo: string;
  inserted: boolean;
};

/**
 * Upsert a single invoice + its parent customer snapshot.
 *
 * - Customer (`musteriler`) is upserted by `abone_no`. PII is encrypted.
 * - Invoice (`faturalar`) is `INSERT ... ON CONFLICT (fatura_no) DO NOTHING`
 *   so the script is safe to re-run on the same day.
 *
 * Returns whether a NEW invoice row was inserted (so callers can count
 * de-duplicated work for `pull_runs.kayit_sayisi`).
 */
export async function upsertInvoice(invoice: Invoice): Promise<UpsertInvoiceResult> {
  const db = getDb();

  const [unvanTrim] = (invoice.unvan ?? "").trim().split(/\s{2,}/);
  const adres = parseAdres(invoice.adres);

  // Hash of raw PII triplet for dedupe / churn detection without decrypting
  // each row. SHA-256 over UTF-8 bytes; stable.
  const hashInput = `${invoice.abone_no}|${unvanTrim ?? ""}|${invoice.adres}`;
  const hashPii = createHash("sha256").update(hashInput, "utf8").digest("hex");

  // Customer upsert.
  await db
    .insert(musteriler)
    .values({
      aboneNo: invoice.abone_no,
      // We don't get isim/soyisim split from /invoices; store the full
      // header in `firma_unvan_enc` and leave the others null.
      firmaUnvanEnc: encryptString(unvanTrim ?? null),
      il: adres.il ?? null,
      ilce: adres.ilce ?? null,
      mahalle: adres.mahalle ?? null,
      paketAdi: invoice.urunler,
      sonAktiflikTarihi: new Date(invoice.fatura_tarihi),
      durum: invoice.durum,
      hashPii,
    })
    .onConflictDoUpdate({
      target: musteriler.aboneNo,
      set: {
        firmaUnvanEnc: sql`EXCLUDED.firma_unvan_enc`,
        il: sql`EXCLUDED.il`,
        ilce: sql`EXCLUDED.ilce`,
        mahalle: sql`EXCLUDED.mahalle`,
        paketAdi: sql`EXCLUDED.paket_adi`,
        sonAktiflikTarihi: sql`GREATEST(${musteriler.sonAktiflikTarihi}, EXCLUDED.son_aktiflik_tarihi)`,
        durum: sql`EXCLUDED.durum`,
        hashPii: sql`EXCLUDED.hash_pii`,
        sonGuncellenme: sql`NOW()`,
      },
    });

  // Invoice insert (idempotent).
  const result = await db
    .insert(faturalar)
    .values({
      aboneNo: invoice.abone_no,
      faturaNo: invoice.fatura_no,
      genelToplam: invoice.genel_toplam.toFixed(2),
      faturaTarihi: new Date(invoice.fatura_tarihi),
      sonOdemeTarihi: new Date(invoice.son_odeme_tarihi),
      odendigiTarih: invoice.odendigi_tarih ? new Date(invoice.odendigi_tarih) : null,
      durum: invoice.durum,
      odemeTuru: invoice.odeme_turu,
      urunler: invoice.urunler,
      kalemlerJson: JSON.stringify(invoice.kalemler),
      unvanEnc: encryptString(invoice.unvan),
      adresEnc: encryptString(invoice.adres),
    })
    .onConflictDoNothing({ target: faturalar.faturaNo })
    .returning({ id: faturalar.id });

  return { faturaNo: invoice.fatura_no, inserted: result.length > 0 };
}

export type PullRunHandle = {
  id: bigint;
  finishOk: (kayitSayisi: number) => Promise<void>;
  finishFail: (kayitSayisi: number, hataSayisi: number, detail: string) => Promise<void>;
};

export async function startPullRun(
  endpoint: string,
  rangeStart: Date | null,
  rangeEnd: Date | null
): Promise<PullRunHandle> {
  const db = getDb();
  const [row] = await db
    .insert(pullRuns)
    .values({
      endpoint,
      rangeStart,
      rangeEnd,
      status: "running",
    })
    .returning({ id: pullRuns.id });

  if (!row) throw new Error("pull_runs insert returned no row");
  const id = row.id;

  return {
    id,
    finishOk: async (kayitSayisi: number) => {
      await db
        .update(pullRuns)
        .set({
          bitis: new Date(),
          kayitSayisi,
          status: "succeeded",
        })
        .where(eq(pullRuns.id, id));
    },
    finishFail: async (kayitSayisi: number, hataSayisi: number, detail: string) => {
      await db
        .update(pullRuns)
        .set({
          bitis: new Date(),
          kayitSayisi,
          hataSayisi,
          status: "failed",
          hataDetay: detail.slice(0, 8_000),
        })
        .where(eq(pullRuns.id, id));
    },
  };
}

/* ─── Read paths used by dashboards ──────────────────────────────────────── */

export type DailyRevenuePoint = {
  date: string; // YYYY-MM-DD
  paid: number;
  invoiced: number;
};

/**
 * Returns daily aggregates for the last `days` days, ordered ASC.
 * `paid` = sum where odendigi_tarih NOT NULL, otherwise still counted in
 * `invoiced`.
 */
export async function dailyRevenue(days: number): Promise<DailyRevenuePoint[]> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const rows = await db.execute<{
    bucket: string;
    paid: string | number;
    invoiced: string | number;
  }>(sql`
    SELECT
      to_char(date_trunc('day', fatura_tarihi), 'YYYY-MM-DD') AS bucket,
      COALESCE(SUM(CASE WHEN odendigi_tarih IS NOT NULL
                        THEN genel_toplam ELSE 0 END), 0) AS paid,
      COALESCE(SUM(genel_toplam), 0) AS invoiced
    FROM faturalar
    WHERE fatura_tarihi >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
  `);

  return rows.map((r) => ({
    date: r.bucket,
    paid: Number(r.paid),
    invoiced: Number(r.invoiced),
  }));
}

/**
 * Customers whose latest invoice is `>= cutoffDays` old AND whose latest
 * invoice durum != 'Ödendi'. Caller is responsible for decrypting fields
 * before display (see `decryptCustomer`).
 */
export type UnpaidCustomerRow = {
  aboneNo: string;
  ilce: string | null;
  mahalle: string | null;
  paketAdi: string | null;
  sonAktiflikTarihi: Date | null;
  unvanEnc: Buffer | null;
  borc: number;
  fatura_count: number;
};

export async function unpaidCustomers(cutoffDays: number): Promise<UnpaidCustomerRow[]> {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - cutoffDays);

  const rows = await db.execute<{
    abone_no: string;
    ilce: string | null;
    mahalle: string | null;
    paket_adi: string | null;
    son_aktiflik_tarihi: Date | null;
    unvan_enc: Buffer | null;
    borc: string;
    fatura_count: string;
  }>(sql`
    WITH latest AS (
      SELECT
        f.abone_no,
        MAX(f.fatura_tarihi) AS son_fatura,
        COALESCE(SUM(CASE WHEN f.odendigi_tarih IS NULL
                          THEN f.genel_toplam ELSE 0 END), 0) AS borc,
        COUNT(*) AS fatura_count
      FROM faturalar f
      GROUP BY f.abone_no
    )
    SELECT
      m.abone_no,
      m.ilce,
      m.mahalle,
      m.paket_adi,
      m.son_aktiflik_tarihi,
      f.unvan_enc,
      l.borc,
      l.fatura_count
    FROM musteriler m
    JOIN latest l ON l.abone_no = m.abone_no
    JOIN LATERAL (
      SELECT unvan_enc FROM faturalar
      WHERE abone_no = m.abone_no
      ORDER BY fatura_tarihi DESC LIMIT 1
    ) f ON TRUE
    WHERE l.son_fatura < ${cutoff}
       OR l.borc > 0
    ORDER BY l.borc DESC, l.son_fatura ASC
    LIMIT 200
  `);

  return rows.map((r) => ({
    aboneNo: r.abone_no,
    ilce: r.ilce,
    mahalle: r.mahalle,
    paketAdi: r.paket_adi,
    sonAktiflikTarihi: r.son_aktiflik_tarihi,
    unvanEnc: r.unvan_enc,
    borc: Number(r.borc),
    fatura_count: Number(r.fatura_count),
  }));
}

export function decryptUnvan(blob: Buffer | null): string | null {
  return decryptString(blob);
}

/** Counts (for dashboard KPI cards). */
export async function customerCount(): Promise<number> {
  const db = getDb();
  const [row] = await db.select({ c: count() }).from(musteriler);
  return Number(row?.c ?? 0);
}

export async function paymentRateLast30Days(): Promise<{
  invoiced: number;
  paid: number;
  rate: number;
}> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [row] = await db.execute<{ invoiced: string; paid: string }>(sql`
    SELECT
      COALESCE(SUM(genel_toplam), 0) AS invoiced,
      COALESCE(SUM(CASE WHEN odendigi_tarih IS NOT NULL
                        THEN genel_toplam ELSE 0 END), 0) AS paid
    FROM faturalar
    WHERE fatura_tarihi >= ${since}
  `);

  const invoiced = Number(row?.invoiced ?? 0);
  const paid = Number(row?.paid ?? 0);
  const rate = invoiced > 0 ? paid / invoiced : 0;
  return { invoiced, paid, rate };
}

/* ─── Recent pulls (operational sidebar) ─────────────────────────────────── */

export async function recentPullRuns(limit = 10) {
  const db = getDb();
  return db.select().from(pullRuns).orderBy(desc(pullRuns.baslangic)).limit(limit);
}

/* ─── Helpers used in tests ──────────────────────────────────────────────── */

export async function deleteAllForTests(): Promise<void> {
  const db = getDb();
  await db.delete(faturalar);
  await db.delete(musteriler);
  await db.delete(pullRuns);
}

// Drizzle imports referenced above but unused in the call graph for now —
// keep them so future repository methods don't have to re-import.
export { and, between, gte, isNull };
