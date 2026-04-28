/**
 * Read-only queries that feed the analiz/* modules.
 *
 * Bu dosya `repositories.ts`'den ayrı tutuldu çünkü buradaki sorgular
 * "raw invoice timeseries" döndürür — yazma yok, audit yok. Test ve
 * mock'lamak daha kolay.
 */
import { sql } from "drizzle-orm";
import { getDb } from "./client";
import type { LtvInputInvoice } from "@/lib/analiz/ltv";
import type { SegmentInputInvoice } from "@/lib/analiz/segmentasyon";

/**
 * Fetches every invoice in `[since, now]` window with the columns
 * required by the analytic modules. Encrypted PII (`unvan_enc`,
 * `adres_enc`) is NOT projected — analytics never need it.
 */
export async function fetchInvoicesForAnalysis(
  since: Date
): Promise<Array<LtvInputInvoice & SegmentInputInvoice>> {
  const db = getDb();
  const rows = await db.execute<{
    abone_no: string;
    paket_adi: string | null;
    genel_toplam: string;
    fatura_tarihi: Date;
    odendigi_tarih: Date | null;
  }>(sql`
    SELECT
      f.abone_no,
      m.paket_adi,
      f.genel_toplam,
      f.fatura_tarihi,
      f.odendigi_tarih
    FROM faturalar f
    LEFT JOIN musteriler m ON m.abone_no = f.abone_no
    WHERE f.fatura_tarihi >= ${since}
    ORDER BY f.fatura_tarihi ASC
  `);

  return rows.map((r) => ({
    aboneNo: r.abone_no,
    paketAdi: r.paket_adi,
    genelToplam: Number(r.genel_toplam),
    faturaTarihi: r.fatura_tarihi,
    odendigiTarih: r.odendigi_tarih,
  }));
}
