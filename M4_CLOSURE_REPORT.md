# crmanaliz — M1–M4 Production-Ready Closure

**Prompt ID:** CRM-ANALIZ-M4-CLOSURE-M5-GATE-001 v1.0
**Tarih:** 2026-04-28
**Branch:** `feat/m1-fresh-build`
**HEAD:** `8890590 feat(m4): login UI + middleware route protection + RBAC integration`
**Hedef:** main merge + `v0.4.0` tag, ardından M5 ayrı branch

## 1. Yönetici Özeti

binbirnet (Anamur/Mersin ISP) için CRM analiz panosu sıfırdan tek Next.js 15 +
TypeScript strict + Drizzle + Zod + Vitest projesi olarak inşa edildi.
Brief'in M1, M2, M3 milestone'ları teslim edildi; bonus olarak login UI +
middleware route protection + RBAC capability gate'leri (M4) kapatıldı.

Bu kapanış raporu yeni özellik açmaz. Mevcut M1–M4 iş ürünlerini kanıtlar,
git working tree gürültüsünü temizler, main merge + `v0.4.0` tag için PR
hazırlığını yapar ve M5'in ayrı branch'te başlatılmasının ön şartlarını
netleştirir.

## 2. Kapsam

- **M1 — Foundation:** Next.js 15 App Router iskeleti, typed `IssmanagerClient`
  (token + read endpoints + redaction + error sınıfları), Drizzle şema,
  AES-256-GCM `encrypt.ts` + `key.ts`, pino logger + KVKK redaction path'ları,
  `pnpm smoke` canlı health probe, dashboard shell, GitHub Actions CI.
- **M2 — Operasyonel Sürüm:** 1 günlük invoice cron pull worker
  (`scripts/pull-day.ts`), `pull_runs` ve `audit_events` log tabloları, müşteri
  arama sayfası (KVKK maskeli), günlük ciro grafiği (SVG, kütüphanesiz), TR
  adres parser (Anamur/Mersin), 30 gün ödememiş müşteri listesi.
- **M3 — Analiz Katmanı:** LTV hesabı, paket segmentasyonu, MoM/YoY karşılaştırma,
  Excel-uyumlu UTF-8 BOM CSV export, RBAC matrix (admin/analyst/viewer
  capability'leri).
- **M4 — Auth Closure (bonus):** scrypt N=2^14 ile parola hash, `kullanicilar`
  tablosu rol CHECK constraint, idempotent seed scripti, `/giris` Server Action
  + login form, `/cikis` route, cookie-based session middleware, RBAC
  capability gate'leri server action'larda ve route handler'larda.

## 3. Git Temizliği Sonucu

### Önce
- 339 `AD` (added then deleted in workdir) — eski monorepo dosyaları index'te
- 70 `D ` (deleted in index)
- 11 `MM` (modified in both)
- 3 `RD` (renamed in index, deleted in workdir)
- 28 `??` (untracked) — WISP_PHASE_9/10 raporları + 4 stray temp + iş ürünleri
- index ve workdir birbirini götürüyor, net etki ≈ 0 ama `git status` 700+ satır

### Uygulanan
1. Stale `.git/index.lock`, `.git/HEAD.lock`, `.git/objects/maintenance.lock`,
   `.git/refs/heads/feat/m1-fresh-build.lock` Windows mount tarafından
   silinemediği için `mv` ile `_*.old` adına alındı (operasyonu engellemiyor).
2. `git reset --mixed HEAD` → index HEAD'e döndü.
3. 4 adet `_tmp_3_*` stray temp dosyası `.quarantine_wisp/` altına taşındı
   (cross-mount delete yasak olduğu için).
4. 6 adet `WISP_PHASE_9*/WISP_PHASE_10*` rapor + patch (bu projeyle ilgisiz)
   `.quarantine_wisp/` altına taşındı.
5. `.gitignore`'a `.quarantine_wisp/` eklendi.
6. `crmanaliz_brief.md` zaten kökte mevcut, geri koyma gerekmedi.

### Sonra
```
M  .gitignore                  (3 satır eklendi — .quarantine_wisp/ ignore)
?? FINAL_REPORT.md             (M1–M4 final teslim raporu, commit edilecek)
?? PROD_VERIFY_REPORT.md       (production readiness raporu, commit edilecek)
?? M4_CLOSURE_REPORT.md        (bu dosya, commit edilecek)
```

`git diff --cached --stat`: empty
`git diff --stat`: sadece `.gitignore` 3 satır

`git clean -fdx` çalıştırılmadı.

## 4. M1–M4 Quality Gate Kanıtı

Quality gate'ler Linux native ext4 mount'ta (`/sessions/zen-festive-rubin/native-build/crmanaliz`) kuruldu, çünkü Windows mount NTFS permission'ları pnpm install sırasında EPERM unlink hatası veriyor (bu çalıştırma kanıtı, kalıcı kod sorunu değil).

```
=== TYPECHECK ===   tsc --noEmit (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes)
exit=0   →   0 hata

=== LINT ===        next lint
✔ No ESLint warnings or errors
exit=0

=== TEST ===        vitest run
 ✓ tests/redaction.test.ts             (17 tests) 7ms
 ✓ tests/analiz.segmentasyon.test.ts   (9 tests) 10ms
 ✓ tests/analiz.ltv.test.ts            (9 tests) 5ms
 ✓ tests/adres.test.ts                 (11 tests) 7ms
 ✓ tests/crypto.test.ts                (8 tests) 43ms
 ✓ tests/analiz.ciro.test.ts           (11 tests) 22ms
 ✓ tests/export.csv.test.ts            (10 tests) 5ms
 ✓ tests/auth.roles.test.ts            (6 tests) 3ms
 ✓ tests/auth.password.test.ts         (4 tests) 182ms

 Test Files  9 passed (9)
      Tests  85 passed (85)
   Duration  1.77s
exit=0

=== BUILD ===       next build
✓ Compiled successfully
✓ Generating static pages (4/4)

Route (app)                              Size     First Load JS
┌ ƒ /                                    177 B           109 kB
├ ○ /_not-found                          981 B           106 kB
├ ƒ /api/export/odenmemis                140 B           105 kB
├ ƒ /cikis                               140 B           105 kB
├ ƒ /giris                               1.08 kB         106 kB
├ ƒ /karsilastir                         177 B           109 kB
├ ○ /musteriler                          1.68 kB         111 kB
└ ƒ /odenmemis                           177 B           109 kB
+ First Load JS shared by all            105 kB
ƒ Middleware                             32 kB
exit=0
```

**Hedef ile birebir eşleşme:** typecheck 0 hata, lint 0 uyarı, vitest 85/85, build 8 route + middleware. KVKK redaction 17/17, AES-256-GCM 8/8, RBAC 6/6, auth.password 4/4 yeşil.

## 5. Security / KVKK Kanıtı

| Kontrol | Sonuç |
|---|---|
| Repo'da `.env`, `.env.local`, `.env.production` | ✅ yok, sadece `.env.example` |
| `.gitignore` `.env*` coverage | ✅ tüm 5 varyant kapalı |
| Hardcoded secret pattern | ✅ yok |
| `console.log` (test dışı kaynak kodu) | ✅ yok (sadece `lib/crypto/key.ts` içindeki kullanıcıya verilen örnek string literal) |
| AES-256-GCM key length enforcement | ✅ `lib/config.ts` Zod regex `/^[0-9a-fA-F]{64}$/` |
| Production TLS warning | ✅ `lib/db/client.ts:27` `sslmode=require` kontrolü |
| Logger redaction (PII alanları) | ✅ `access_token`, `client_secret`, `headers.authorization`, `isim`, `soyisim`, `firma_unvan`, `telefon_*`, `email`, `unvan`, `adres`, `PII_MASTER_KEY` |
| Session HMAC source | ⚠️ `PII_MASTER_KEY` HEM PII şifrelemesi HEM session HMAC için kullanılıyor (`lib/auth/session.ts:128`). **M5 madde 1: `SESSION_SIGNING_KEY`'i ayır.** Şu an risk değil çünkü her iki kullanım da master key'in private kalmasını gerektiriyor. |

## 6. PR Açıklaması (base: main, head: feat/m1-fresh-build)

```
title: feat: CRM Analiz M1–M4 production-ready engineering closure

## Amaç
binbirnet ISP CRM analiz panosunun M1–M4 milestone'larını main'e
taşımak ve v0.4.0 tag'ini atmak. Yeni özellik yok — M1–M4 zaten
feat/m1-fresh-build üzerinde commit'lenmiş; bu PR sadece kapanış
dokümanı + .gitignore temizliği + main entegrasyonu.

## Kapsam
- M1: Repo iskeleti, IssmanagerClient, redaction, AES-256-GCM, smoke,
  dashboard shell, CI
- M2: Daily pull cron, customer search, revenue chart, churn proxy,
  TR address parser
- M3: LTV, package segmentation, MoM/YoY, CSV export, RBAC matrix
- M4: Login UI, scrypt password, kullanicilar tablosu, middleware
  route protection, RBAC capability gate'leri

## Test Kanıtı
- typecheck (tsc --noEmit, strict): 0 hata
- lint (next lint): 0 uyarı
- vitest run: 9 dosya / 85 test PASS (1.77s)
  - redaction 17, crypto 8, adres 11, analiz.ciro 11, analiz.ltv 9,
    analiz.segmentasyon 9, export.csv 10, auth.roles 6, auth.password 4
- next build: 8 route + middleware (32 kB), tüm First Load JS < 115 kB

## Security/KVKK Kanıtı
- .env repo'da yok, .gitignore tüm varyantları kapalı
- Hardcoded secret yok, console.log yok
- AES-256-GCM key 64-hex zorunluluğu Zod ile
- Logger redaction tüm PII alanları + token/secret kapalı
- DB production TLS warning aktif

## Mimari Kararlar
- Tek Next.js app (monorepo değil)
- ISS Manager v2 sadece read endpoint'leri
- Browser → ISS Manager doğrudan istek YOK (server-side proxy)
- Drizzle ORM + postgres-js
- Chart yok (SVG hand-rolled)

## Riskler / Dış Blocker
- DATABASE_URL TLS + PII_MASTER_KEY (32-byte) production env eksik
- ISS Manager v2 prod credentials intranet runner'da bekliyor
- Bu iki nokta engineering değil dış bağımlılık

## Rollback Planı
- Squash merge sonrası geri alma: git revert <merge-sha>
- v0.4.0 tag silme: git tag -d v0.4.0
- feat/m1-fresh-build branch'i korunuyor (`legacy/monorepo-pre-m1`
  zaten ayrı), 5 commit geri alınabilir.

## Deploy Etkisi
Henüz prod deploy yok; intranet runner secrets bekliyor.
```

## 7. Kalan Riskler

| # | Risk | Sınıf | Sahibi | Aksiyon |
|---|------|-------|---------|---------|
| 1 | DATABASE_URL TLS prod env eksik | Dış bağımlılık | malii | secret manager doldurulduktan sonra deploy |
| 2 | PII_MASTER_KEY prod 32-byte üretim | Dış bağımlılık | malii | `node -e "..."` ile üret, secret manager'a koy |
| 3 | ISS Manager v2 prod client_credentials | Dış bağımlılık | malii | intranet runner'da tanımla, smoke + 1 günlük pull doğrula |
| 4 | SESSION_SIGNING_KEY = PII_MASTER_KEY | Teknik borç (P2) | M5 | M5 madde 1 olarak ayrılacak |
| 5 | Stale `.git/*.lock` Windows mount delete reddi | Operasyonel | malii | bir Windows-side `git gc` veya manuel sil; engineering blocker değil |

## 8. Sıradaki: M5 Operational Hardening (ayrı branch)

Branch: `feature/m5-operational-hardening` (main + v0.4.0 sonrası açılacak).

Sıralı kapsam:
1. `SESSION_SIGNING_KEY` env ayrımı (HMAC source ayır, config.ts + Zod, auth/session.ts)
2. Günlük cron net kuruluş (Vercel cron veya systemd timer — kararı VPN/intranet erişimine göre M5 başında ver)
3. Audit log UI (`/yonetim/denetim` sayfası, sadece admin)
4. PDF/Excel export (M3 CSV vardı; PDF için `pdfkit` veya server-side template, Excel için `exceljs`)
5. Playwright e2e smoke: login + dashboard + 30-gün ödememiş + RBAC gate

## 9. Kapanış Kararı

**FULLY CLOSED** — M1–M4 engineering kapsamı kanıtlandı. Dış env eksiklikleri
engineering değil dış bağımlılık olarak raporlandı. Yeni feature açılmadı.
main merge + v0.4.0 tag ön şartları sağlandı.
