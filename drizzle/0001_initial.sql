-- crmanaliz initial schema (M1 / 0001)
-- Author: malii
-- Date:   2026-04-28
--
-- Notes:
--   * PII columns end with `_enc` and store BYTEA blobs produced by
--     lib/crypto/encrypt.ts (AES-256-GCM, format: nonce(12) || tag(16) || ct).
--   * `faturalar` is append-only at the application layer; database does
--     not enforce this so revoke UPDATE/DELETE on the prod role.
--   * No FK from faturalar.abone_no → musteriler.abone_no with
--     ON DELETE CASCADE — billing history must outlive customer rows.
--     (RESTRICT is the safest posture for KVKK retention/audit.)
--
-- NOTE: Do NOT wrap this file in BEGIN/COMMIT — drizzle-kit's migrate
-- runner already wraps each migration in its own transaction. Adding
-- BEGIN here triggers PG WARNING 25001 "already in transaction", and
-- the explicit COMMIT closes drizzle's wrapper transaction early so
-- the journal row never lands and statements after it run outside
-- any transaction (PG WARNING 25P01).

-- ─── musteriler ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS musteriler (
    abone_no            TEXT PRIMARY KEY,
    isim_enc            BYTEA,
    soyisim_enc         BYTEA,
    firma_unvan_enc     BYTEA,
    telefon_1_enc       BYTEA,
    email_enc           BYTEA,
    il                  TEXT,
    ilce                TEXT,
    mahalle             TEXT,
    paket_adi           TEXT,
    son_aktiflik_tarihi TIMESTAMPTZ,
    durum               TEXT,
    ilk_gorulme         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    son_guncellenme     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hash_pii            TEXT
);

CREATE INDEX IF NOT EXISTS idx_musteriler_ilce  ON musteriler (ilce);
CREATE INDEX IF NOT EXISTS idx_musteriler_paket ON musteriler (paket_adi);

-- ─── faturalar ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faturalar (
    id               BIGSERIAL PRIMARY KEY,
    abone_no         TEXT NOT NULL REFERENCES musteriler(abone_no) ON DELETE RESTRICT,
    fatura_no        TEXT NOT NULL,
    genel_toplam     NUMERIC(12,2) NOT NULL,
    fatura_tarihi    TIMESTAMPTZ NOT NULL,
    son_odeme_tarihi TIMESTAMPTZ NOT NULL,
    odendigi_tarih   TIMESTAMPTZ,
    durum            TEXT NOT NULL,
    odeme_turu       TEXT,
    urunler          TEXT,
    kalemler_json    JSONB NOT NULL,
    unvan_enc        BYTEA,
    adres_enc        BYTEA,
    eklenme          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_faturalar_fatura_no ON faturalar (fatura_no);
CREATE INDEX IF NOT EXISTS idx_faturalar_abone ON faturalar (abone_no);
CREATE INDEX IF NOT EXISTS idx_faturalar_tarih ON faturalar (fatura_tarihi);
CREATE INDEX IF NOT EXISTS idx_faturalar_durum ON faturalar (durum);

-- ─── pull_runs (operational audit) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pull_runs (
    id            BIGSERIAL PRIMARY KEY,
    baslangic     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    bitis         TIMESTAMPTZ,
    range_start   DATE,
    range_end     DATE,
    endpoint      TEXT NOT NULL,
    kayit_sayisi  INTEGER NOT NULL DEFAULT 0,
    hata_sayisi   INTEGER NOT NULL DEFAULT 0,
    status        TEXT NOT NULL CHECK (status IN ('running','succeeded','failed')),
    hata_detay    TEXT
);

-- ─── audit_events (user / system access trail) ──────────────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
    id            BIGSERIAL PRIMARY KEY,
    ts            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    kullanici_id  TEXT,
    aksiyon       TEXT NOT NULL,
    kaynak        TEXT NOT NULL,
    request_id    TEXT,
    ip            INET,
    sonuc         TEXT NOT NULL CHECK (sonuc IN ('success','error'))
);

CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_events (ts DESC);
