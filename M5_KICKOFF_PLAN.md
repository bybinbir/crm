# M5 — Operational Hardening Kickoff Plan

**Branch:** `feature/m5-operational-hardening` (created from `main` @ `v0.4.0`)
**Tarih:** 2026-04-28
**Önceki teslim:** v0.4.0 (M1–M4 production-ready engineering closure)
**Hedef:** Production'a açılış öncesi operasyonel sertleştirme + e2e doğrulama


## Madde Durumları

| # | Konu | Durum | Commit |
|---|------|-------|--------|
| 1 | SESSION_SIGNING_KEY ayrımı | ✅ FULLY CLOSED | a482272 + 4fd8dea |
| 2 | Günlük cron / systemd timer | ⚠️ PARTIALLY CLOSED (canlı smoke prod credentials bekliyor) | d9a04fe |
| 3 | Audit Log UI | ✅ FULLY CLOSED | (current) |
| 4 | PDF/Excel Export | → M6 (taşındı) | M6_BACKLOG.md § 1 |
| 5 | Playwright e2e Smoke | → M6 (taşındı) | M6_BACKLOG.md § 2 |

## Giriş Kriterleri (sağlandı)

- [x] `main` HEAD = `aa901f6` (M4 closure commit)
- [x] `v0.4.0` annotated tag oluşturuldu, `aa901f6`'ya bağlı
- [x] `feature/m5-operational-hardening` branch'i `main`'den çıktı
- [x] `M4_CLOSURE_REPORT.md` kapanış raporu commit'lendi
- [x] Working tree git ref açısından temiz (Windows mount stale lock'lar git
      operasyonlarını engellemiyor; ayrı operasyonel temizlik gerek)
- [x] Quality gate'ler kanıtlandı: typecheck 0, lint 0, vitest 85/85, build OK

## M5 Kapsam Sırası — 5 Madde

### 1. `SESSION_SIGNING_KEY` ayrımı (P1, küçük)

**Amaç:** Session HMAC kaynağını PII şifreleme master key'inden ayır.

**Değişecek dosyalar:**
- `lib/config.ts` — Zod schema'ya yeni env: `SESSION_SIGNING_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/)`
- `lib/auth/session.ts:128` — `hmac()` fonksiyonu `getSessionSigningKey()` kullansın, `getMasterKey()` değil
- `lib/auth/key.ts` (yeni) — `getSessionSigningKey()` (PII key'inden bağımsız)
- `lib/logger.ts` — redact path'lerine `SESSION_SIGNING_KEY` ekle
- `.env.example` — yeni env örneği + üretim talimatı (`node -e "..."`)

**Test:**
- `tests/auth.session.test.ts` (yeni) — sign/verify round-trip + tamper edge case
- `tests/config.test.ts` (yeni) — `SESSION_SIGNING_KEY` regex zorunluluğu

**Migration:** Yok (env-only). Mevcut session cookie'leri eski key ile imzalanmışsa
deploy sonrası kullanıcı yeniden login olmak zorunda kalır — bu kabul edilebilir
çünkü production henüz canlı değil.

**Rollback:** Eski env name'ini de fallback olarak destekle, deploy sonrası yeni
env stable olunca PR-2'de fallback'i kaldır.

### 2. Günlük cron net kuruluş (P1, orta)

**Karar:** systemd timer (intranet runner Vercel'e erişmiyor; ISS Manager v2 zaten
intranet'te 192.168.106.118).

**Değişecek dosyalar:**
- `deployment/systemd/crmanaliz-pull-day.service` (yeni)
- `deployment/systemd/crmanaliz-pull-day.timer` (yeni) — `OnCalendar=*-*-* 02:30:00`
- `scripts/pull-day.ts` — exit code disiplini, `pull_runs` tablosuna run-id yaz
- `docs/ops/CRON_SETUP.md` (yeni) — sunucu kurulum talimatı, log rotation

**Observability:**
- `pull_runs` tablosuna her run için satır yaz (started_at, ended_at, status,
  rows_pulled, error_message)
- structured log `pino` üzerinden, correlation-id `run-<uuid>`
- Slack/email alert (opsiyonel, M6'ya bırakılabilir)

**Test:**
- `tests/pullday.test.ts` (yeni) — happy path + 1-day window + retry + DB write

### 3. Audit Log UI (P2, orta)

**Amaç:** `audit_events` tablosunu admin'lere okutan basit sayfa.

**Değişecek dosyalar:**
- `app/yonetim/denetim/page.tsx` (yeni) — server component, RBAC `admin` only
- `app/yonetim/denetim/actions.ts` (yeni) — pagination + filtre (kullanıcı, tarih, action)
- `lib/db/audit-queries.ts` (yeni) — drizzle query helper
- `components/yonetim/audit-table.tsx` (yeni)

**RBAC:** `lib/auth/roles.ts` capability matrix'e `view_audit_log` ekle, sadece `admin`.

**Test:**
- `tests/audit.queries.test.ts` (yeni) — pagination + filter

### 4. PDF/Excel Export (P2, orta)

**Amaç:** M3 CSV var; aynı veriler için PDF + Excel.

**Karar:**
- PDF: `pdfkit` (server-side, küçük) — server route handler
- Excel: `exceljs` (server-side, formula desteği) — server route handler

**Değişecek dosyalar:**
- `lib/export/pdf.ts` (yeni)
- `lib/export/excel.ts` (yeni)
- `app/api/export/odenmemis/route.ts` — `?format=pdf|excel|csv` query param desteği
- `package.json` — `pdfkit`, `exceljs` dependency'leri

**Test:**
- `tests/export.pdf.test.ts` (yeni) — PDF byte stream, header/footer, sayfa sayısı
- `tests/export.excel.test.ts` (yeni) — workbook, sheet, formula

### 5. Playwright e2e Smoke (P1, büyük)

**Amaç:** kritik kullanıcı akışlarını sunucu + DB ile uçtan uca test et.

**Değişecek dosyalar:**
- `playwright.config.ts` (yeni)
- `e2e/login.spec.ts` (yeni) — invalid → error, valid → /
- `e2e/dashboard.spec.ts` (yeni) — KPI'lar görünür, çıkış çalışır
- `e2e/odenmemis.spec.ts` (yeni) — 30-gün listesi, CSV indir
- `e2e/rbac.spec.ts` (yeni) — viewer admin sayfasını göremesin
- `package.json` — `@playwright/test` devDependency
- `.github/workflows/ci.yml` — ek job: `e2e` (DB testcontainer + Playwright)

**Test verisi:** anonimleştirilmiş fixture, gerçek müşteri verisi yasak.

## Çıkış Kriterleri

M5 ancak şu şartlarla kapanır:
- 5 madde için PR'lar açıldı, her biri merge'lendi (squash, ufak)
- Quality gate sayısı: typecheck 0 hata, lint 0 uyarı, vitest 85+ test PASS
  (yeni testler eklenmeli, regresyon yok)
- Playwright e2e CI job'unda yeşil
- Audit log UI ekran kanıtı
- PDF/Excel örnek dosyalar
- systemd timer canlı sunucuda etkin (intranet runner secret eksiği kalkınca)
- `M5_REPORT.md` kapanış raporu

## Riskler

| # | Risk | Sınıf | Mitigasyon |
|---|------|-------|------------|
| 1 | systemd timer kurulumu için sunucu erişimi gerek | Dış bağımlılık | M5 madde 2 doc'la, deploy aşamasına bırak |
| 2 | Playwright CI testcontainer DB hazırlığı | P1 | docker-compose service `postgres:16` |
| 3 | Excel formula uyumluluğu (Türkçe locale) | P2 | UTF-8 BOM + tr-TR locale formatlama, M3 CSV gibi |

## Sıradaki Adım

`feature/m5-operational-hardening` branch'inde madde 1 (`SESSION_SIGNING_KEY`
ayrımı) ile başla. Bu en küçük + en yüksek security ROI maddesi.

PR-1 hedef: `feat(m5): split SESSION_SIGNING_KEY from PII_MASTER_KEY`
- Beklenen test: 4-6 yeni test (sign/verify round-trip, tamper, missing env)
- Beklenen build: değişmemeli (8 route + middleware)
- Tahmini süre: 2 saat
