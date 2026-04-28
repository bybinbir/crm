/**
 * Drizzle schema — crmanaliz datastore.
 *
 * Domain conventions (per brief):
 *   - Tables and column names are Turkish (`musteriler`, `faturalar`,
 *     `pull_runs`, `audit_events`).
 *   - Sensitive PII is encrypted at rest (column-level AES-256-GCM) — those
 *     columns end with `_enc` and store BYTEA blobs produced by
 *     `lib/crypto/encrypt.ts`.
 *   - Aggregable, non-PII signals (paket adı, ilçe, mahalle, durum) are kept
 *     in plain columns so analytics queries can group by them without going
 *     through decryption.
 *   - `faturalar` is append-only; mutations are forbidden by application
 *     code, enforced by absence of `updateOneByFaturaNo`-style helpers.
 *
 * Migration files live under `drizzle/`; this schema is the source of truth
 * for `drizzle-kit generate`. The first migration is checked in by hand
 * (drizzle/0001_initial.sql) so the team can review SQL diffs in PRs.
 */
import {
  bigserial,
  customType,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Postgres BYTEA helper — Drizzle ships a string-coerced bytea by default
 * (postgres-js returns Buffer), but for clarity we declare it ourselves.
 */
const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType: () => "bytea",
});

/**
 * INET column for IP addresses (audit log).
 */
const inet = customType<{ data: string; notNull: false; default: false }>({
  dataType: () => "inet",
});

/* ─────────────────────────────────────────────────────────────────────────────
 * musteriler — customer snapshot (latest known state per abone_no)
 * ────────────────────────────────────────────────────────────────────────── */
export const musteriler = pgTable(
  "musteriler",
  {
    aboneNo: text("abone_no").primaryKey(),

    // Encrypted PII. Decrypt only inside the request scope; never log.
    isimEnc: bytea("isim_enc"),
    soyisimEnc: bytea("soyisim_enc"),
    firmaUnvanEnc: bytea("firma_unvan_enc"),
    telefon1Enc: bytea("telefon_1_enc"),
    emailEnc: bytea("email_enc"),

    // Geographic — non-PII, used for segmentation.
    il: text("il"),
    ilce: text("ilce"),
    mahalle: text("mahalle"),

    // Plan / status.
    paketAdi: text("paket_adi"),
    sonAktiflikTarihi: timestamp("son_aktiflik_tarihi", { withTimezone: true }),
    durum: text("durum"),

    // Lifecycle.
    ilkGorulme: timestamp("ilk_gorulme", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sonGuncellenme: timestamp("son_guncellenme", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // SHA-256 of the concatenated raw PII triplet — used for dedupe / churn
    // detection without ever decrypting the per-row blobs.
    hashPii: text("hash_pii"),
  },
  (t) => [
    index("idx_musteriler_ilce").on(t.ilce),
    index("idx_musteriler_paket").on(t.paketAdi),
  ]
);

/* ─────────────────────────────────────────────────────────────────────────────
 * faturalar — append-only invoice timeseries
 * ────────────────────────────────────────────────────────────────────────── */
export const faturalar = pgTable(
  "faturalar",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    aboneNo: text("abone_no")
      .notNull()
      .references(() => musteriler.aboneNo, { onDelete: "restrict" }),
    faturaNo: text("fatura_no").notNull(),
    genelToplam: numeric("genel_toplam", { precision: 12, scale: 2 }).notNull(),
    faturaTarihi: timestamp("fatura_tarihi", { withTimezone: true }).notNull(),
    sonOdemeTarihi: timestamp("son_odeme_tarihi", { withTimezone: true }).notNull(),
    odendigiTarih: timestamp("odendigi_tarih", { withTimezone: true }),
    durum: text("durum").notNull(),
    odemeTuru: text("odeme_turu"),
    urunler: text("urunler"),
    // JSONB — small array, indexed only ad-hoc; encryption not applied
    // (line-items contain product names + numbers, no direct PII).
    kalemlerJson: text("kalemler_json").notNull(),
    // Encrypted invoice header PII (full name + full address — not masked
    // upstream, so MUST be encrypted at rest).
    unvanEnc: bytea("unvan_enc"),
    adresEnc: bytea("adres_enc"),
    eklenme: timestamp("eklenme", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_faturalar_fatura_no").on(t.faturaNo),
    index("idx_faturalar_abone").on(t.aboneNo),
    index("idx_faturalar_tarih").on(t.faturaTarihi),
    index("idx_faturalar_durum").on(t.durum),
  ]
);

/* ─────────────────────────────────────────────────────────────────────────────
 * pull_runs — operational audit of every external pull
 * ────────────────────────────────────────────────────────────────────────── */
export const pullRuns = pgTable("pull_runs", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  baslangic: timestamp("baslangic", { withTimezone: true })
    .notNull()
    .defaultNow(),
  bitis: timestamp("bitis", { withTimezone: true }),
  rangeStart: timestamp("range_start", { mode: "date" }),
  rangeEnd: timestamp("range_end", { mode: "date" }),
  endpoint: text("endpoint").notNull(),
  kayitSayisi: integer("kayit_sayisi").notNull().default(0),
  hataSayisi: integer("hata_sayisi").notNull().default(0),
  // 'running' | 'succeeded' | 'failed'
  status: text("status").notNull(),
  hataDetay: text("hata_detay"),
});

/* ─────────────────────────────────────────────────────────────────────────────
 * audit_events — user / system access trail
 * ────────────────────────────────────────────────────────────────────────── */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    kullaniciId: text("kullanici_id"),
    aksiyon: text("aksiyon").notNull(),
    kaynak: text("kaynak").notNull(),
    requestId: text("request_id"),
    ip: inet("ip"),
    // 'success' | 'error'
    sonuc: text("sonuc").notNull(),
  },
  (t) => [
    // Most queries scan recent events first.
    index("idx_audit_ts").on(t.ts),
  ]
);

// Composite identity for the per-customer-per-month aggregates table that
// will land in M2 — keep the helper around so future schema files have a
// canonical (abone_no, year, month) PK example.
export const _examplePk = primaryKey;
