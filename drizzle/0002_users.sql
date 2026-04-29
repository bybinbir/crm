-- crmanaliz users (M4 / 0002)
-- Author: malii
-- Date:   2026-04-28
--
-- Minimal user table for the cookie-based session in lib/auth/.
-- Passwords are stored as scrypt hashes (lib/auth/password.ts).
-- Role enum mirrors lib/auth/roles.ts; CHECK constraint guards against
-- typo'd writes from raw SQL.
--
-- NOTE: No BEGIN/COMMIT — drizzle-kit migrate wraps each file in its
-- own transaction. See 0001_initial.sql for the longer explanation.

CREATE TABLE IF NOT EXISTS kullanicilar (
    id              BIGSERIAL PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('operator','analyst','viewer')),
    olusturulma     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    son_giris       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kullanicilar_email ON kullanicilar (email);
