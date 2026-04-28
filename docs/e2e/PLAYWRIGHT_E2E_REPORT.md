# M6 Madde 2 — Playwright E2E Smoke Report

**Prompt ID:** CRM-ANALIZ-M6-E2E-PLAYWRIGHT-005 v1.0
**Tarih:** 2026-04-29
**Branch:** `feature/m6-e2e-playwright`

## 1. Yönetici Özeti

5 spec dosyası, 18 test senaryosu, deterministic anonim seed (2 user + 5
müşteri + 30 fatura + 10 audit event), GitHub Actions postgres:16
service ile uçtan uca CI job. Lokal çalıştırmak için `docker compose -f
docker-compose.e2e.yml up postgres` + `pnpm db:migrate` + `pnpm
seed:e2e` + `pnpm e2e`.

**Kapanış:** PARTIALLY CLOSED — engineering/config/spec tarafı tamam;
chromium binary indirildi ve runtime kanıtlandı. Gerçek senaryoları
yeşil koşturmak için DB + `next start` lazım (sandbox'ta yok); CI'daki
e2e job postgres service ile çalıştırınca ilk gerçek geçiş kanıtı oluşacak.

## 2. Spec Matrisi

| Spec | Senaryo Sayısı | Kapsam |
|---|---|---|
| `e2e/login.spec.ts` | 3 | anonymous redirect, hatalı parola, başarılı login (HttpOnly cookie) |
| `e2e/dashboard.spec.ts` | 2 | Genel Durum heading + KPI'lar görünür, PII sızıntısı yok |
| `e2e/odenmemis.spec.ts` | 5 | sayfa render, csv/xlsx/pdf endpoint'leri 200/401/403, unknown format 400 |
| `e2e/rbac.spec.ts` | 4 | middleware redirect, operator izin, viewer reddi, viewer export reddi |
| `e2e/audit.spec.ts` | 4 | tablo render, filtre form preserve, malformed param clamp, PII yok |
| **Toplam** | **18** | — |

## 3. Altyapı Dosyaları

| Dosya | Amaç |
|---|---|
| `playwright.config.ts` | Chromium project, tr-TR locale, Europe/Istanbul TZ, retain-on-failure trace+video, `webServer` `pnpm start -p $PORT` |
| `e2e/_helpers.ts` | `E2E_OPERATOR`, `E2E_VIEWER`, `login()`, `logout()` |
| `scripts/seed-e2e.ts` | Deterministic + idempotent seed, `NODE_ENV=production`'da hard-abort |
| `docker-compose.e2e.yml` | postgres:16-alpine, tmpfs data, port 55432 |
| `.github/workflows/ci.yml` | Yeni `e2e` job: postgres service + migrate + seed + build + chromium install + `pnpm e2e` + artifact upload (report+traces) |
| `package.json` | `seed:e2e`, `e2e`, `e2e:ui`, `e2e:report` scripts; `@playwright/test` devDep |

## 4. Çalıştırma

### Lokal
```bash
# 1. DB
docker compose -f docker-compose.e2e.yml up -d postgres

# 2. Env (DATABASE_URL'i compose port'una göre ayarla)
export DATABASE_URL="postgres://crmanaliz:crmanaliz_e2e@localhost:55432/crmanaliz_e2e?sslmode=disable"
export PII_MASTER_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
export SESSION_SIGNING_KEY="fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"
export ISSMANAGER_BASE_URL="http://example.invalid/api"
export ISSMANAGER_CLIENT_ID="iss_v2_test"
export ISSMANAGER_CLIENT_SECRET="test"

# 3. Schema + seed
pnpm db:migrate
pnpm seed:e2e

# 4. Build + run
pnpm build
pnpm e2e

# Veya UI mode (Playwright UI):
pnpm e2e:ui

# Sonuçları görüntüle
pnpm e2e:report
```

### CI
PR açıldığında `e2e` job otomatik koşar. Failure'da
`playwright-report` + `playwright-traces` artifact'ları 7 gün saklanır.

## 5. Test Verisi (Anonim)

```
Users:
  e2e-operator@example.invalid / operator-pw-12345  (role: operator)
  e2e-viewer@example.invalid   / viewer-pw-12345    (role: viewer)

Customers (abone_no 9001..9005):
  Test Müşteri 1..5, ilçe Anamur/Bozyazı, mahalle/paket sabit

Invoices: 30 fatura E2E-0000..E2E-0029, çift index'liler ödenmiş
Audit Events: 10 event (login.success/fail, export_*, view.*, rbac.deny, ...)
```

`@example.invalid` non-routable TLD (RFC 6761) — hiçbir şekilde gerçek
e-posta/domain'a denk gelmez. Parola değerleri sadece test ortamı için
kullanılır; production seed `seed-user.ts` ile farklı.

## 6. Sandbox Çalıştırma Notu

Lokal sandbox'ta postgres yok ve sandbox'tan `next start` kalıcı
süreç olarak tutulamadığı için tam e2e koşusu yapılamadı. Doğrulanan:

- **Playwright config:** `pnpm exec playwright test --list` — 18 test
  başarıyla parse edildi.
- **Chromium binary:** `pnpm exec playwright install chromium` —
  chromium-1217 + chromium_headless_shell-1217 + ffmpeg-1011 indirildi
  (`/sessions/zen-festive-rubin/.cache/ms-playwright/`).
- **Runtime:** dummy port'a karşı sanity koşusu Playwright'ın chromium'u
  başlatabildiğini ve trace/screenshot/video pipeline'ının çalıştığını
  gösterdi. Connection refused beklenen davranış (sunucu yok).

İlk gerçek yeşil koşu CI postgres service üzerinde olacaktır.

## 7. Kabul Kriterleri

- [x] 5 spec dosyası, 15+ senaryo (18 senaryo)
- [x] Deterministic anonim seed (2 user + 5 müşteri + 30 fatura + 10 audit)
- [x] CI e2e job + postgres:16 service + artifact upload
- [x] tr-TR locale + Europe/Istanbul timezone Playwright'ta set
- [x] Trace + video retain-on-failure
- [ ] CI'da ilk gerçek yeşil koşu (PR push'lanınca yakalanır)
- [ ] Build + e2e toplam < 10 dk hedefi (CI metric)

## 8. Sonraki Adım

M6 madde 3: **Canlı deploy + ISS pull + systemd timer verification**
(`M6_BACKLOG.md § 3`). Bu bir engineering değil deployment koordinasyon
görevi: prod credentials + sunucu erişimi gelince checklist'i çalıştır.
