/**
 * Drizzle schema — crmanaliz datastore.
 *
 * - Tables and columns are Turkish (`musteriler`, `faturalar`, …).
 * - Sensitive PII columns end with `_enc` and store BYTEA blobs from
 *   lib/crypto/encrypt.ts (AES-256-GCM).
 * - Aggregable, non-PII fields stay plain so analytics can group by them.
 * - `faturalar` is append-only at the application layer.
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

const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType: () => "bytea",
});

const inet = customType<{ data: string; notNull: false; default: false }>({
  dataType: () => "inet",
});

/* ─── musteriler ──────────────────────────────────────────────────────── */
export const musteriler = pgTable(
  "musteriler",
  {
    aboneNo: text("abone_no").primaryKey(),
    isimEnc: bytea("isim_enc"),
    soyisimEnc: bytea("soyisim_enc"),
    firmaUnvanEnc: bytea("firma_unvan_enc"),
    telefon1Enc: bytea("telefon_1_enc"),
    emailEnc: bytea("email_enc"),
    il: text("il"),
    ilce: text("ilce"),
    mahalle: text("mahalle"),
    paketAdi: text("paket_adi"),
    sonAktiflikTarihi: timestamp("son_aktiflik_tarihi", { withTimezone: true }),
    durum: text("durum"),
    ilkGorulme: timestamp("ilk_gorulme", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sonGuncellenme: timestamp("son_guncellenme", { withTimezone: true })
      .notNull()
      .defaultNow(),
    hashPii: text("hash_pii"),
  },
  (t) => [
    index("idx_musteriler_ilce").on(t.ilce),
    index("idx_musteriler_paket").on(t.paketAdi),
  ]
);

/* ─── faturalar ──────────────────────────────────────────────────────── */
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
    kalemlerJson: text("kalemler_json").notNull(),
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

/* ─── pull_runs ──────────────────────────────────────────────────────── */
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
  status: text("status").notNull(),
  hataDetay: text("hata_detay"),
});

/* ─── audit_events ───────────────────────────────────────────────────── */
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
    sonuc: text("sonuc").notNull(),
  },
  (t) => [index("idx_audit_ts").on(t.ts)]
);

/* ─── kullanicilar (M4 RBAC) ─────────────────────────────────────────── */
export const kullanicilar = pgTable(
  "kullanicilar",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(),
    olusturulma: timestamp("olusturulma", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sonGiris: timestamp("son_giris", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("uq_kullanicilar_email").on(t.email),
    index("idx_kullanicilar_email").on(t.email),
  ]
);

export const _examplePk = primaryKey;
