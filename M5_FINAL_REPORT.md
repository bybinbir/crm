# M5 — Operational Hardening Final Report

**Prompt ID Chain:**
1. CRM-ANALIZ-M5-SESSION-SIGNING-KEY-001
2. CRM-ANALIZ-M5-DAILY-CRON-002
3. CRM-ANALIZ-M5-AUDIT-UI-AND-CLOSURE-003
**Tarih:** 2026-04-28
**Branch:** `feature/m5-operational-hardening`
**Önceki tag:** `v0.4.0`
**Önerilen tag:** `v0.5.0`

## 1. Yönetici Özeti

M5 — Operational Hardening sürümü, başlangıçta tasarlanan 5 maddeden 3'ü
ile **engineering-closure** seviyesine getirildi. Geri kalan 2 madde
(PDF/Excel export, Playwright e2e smoke) **M6'ya** kaydırıldı.

| Madde | Konu | Durum |
|---|---|---|
| 1 | SESSION_SIGNING_KEY ayrımı | ✅ FULLY CLOSED |
| 2 | Daily pull systemd timer | ⚠️ PARTIALLY CLOSED (canlı pull dış bağımlılık) |
| 3 | Audit Log UI | ✅ FULLY CLOSED |
| 4 | PDF/Excel export | → M6 |
| 5 | Playwright e2e smoke | → M6 |

Tüm kalite kapıları yeşil: typecheck 0 hata, lint 0 uyarı, vitest
**128/128 PASS**, next build 9 route + middleware (32 kB), security/KVKK
checklist temiz. Bundle regresyonsuz.

**Kapanış kararı: FULLY CLOSED — ENGINEERING.** Canlı 1-day pull ve
systemd timer fire doğrulamaları prod credentials + intranet erişimi
geldiğinde tamamlanır; bunlar deployment blocker, M5 engineering
closure'ını düşürmez.

## 2. M5 Kapsam Kararı (yeniden sınırlandırma)

Başlangıç planı 5 madde (SESSION_SIGNING_KEY, daily cron, audit UI,
PDF/Excel, Playwright). Üçüncü prompt'ta scope yeniden değerlendirildi:

- **M5'te kal:** SESSION_SIGNING_KEY, daily cron, audit UI — bunlar
  production'a açılmadan **engineering** olarak kapanması gereken
  güvenlik + operasyonel hardening başlıkları.
- **M6'ya taşı:** PDF/Excel export (P2, kullanıcı talebi geldiğinde),
  Playwright e2e smoke (P1 kalite ama M5 closure'ını bloke etmiyor;
  CI testcontainer + Playwright kurulumu ayrı bir mühendislik turu).

Karar gerekçesi: M5'in temel hedefi **production'a açılış öncesi
güvenlik + operasyonel sertleştirme**. PDF/Excel ve e2e smoke önemli
ama açılış-bloke edici değil, bağımsız PR'larla M6'da işlenebilir.

## 3. Tamamlananlar

### 3.1 SESSION_SIGNING_KEY ayrımı — `a482272` + `4fd8dea`
- `lib/config.ts`: yeni Zod schema entry + superRefine reuse-rejection
- `lib/auth/key.ts` (yeni): `getSessionSigningKey()` cache'li helper
- `lib/auth/session.ts`: HMAC kaynağı PII_MASTER_KEY'den ayrıldı
- `lib/logger.ts` + `lib/issmanager/redaction.ts`: redact path'ler
- `tests/auth.session-key.test.ts`: 8 test (sign/verify, decoupling,
  fail-fast, reuse reject, redaction, no-leak)
- `.env.example`: yeni env bölümü

### 3.2 Daily Pull Timer Workflow — `d9a04fe`
- `lib/jobs/pull-day.ts` (yeni): pure testable core, dependency-injected
  runner, `--dry-run`, exit-code disiplini, redacted error path
- `scripts/pull-day.ts`: ince CLI wrapper
- `package.json`: `smoke:pull-day` script
- `deploy/systemd/crmanaliz-daily-pull.{service,timer}` (yeni):
  hardened oneshot unit + `OnCalendar=*-*-* 02:30:00` `Persistent=true`
  `RandomizedDelaySec=15min`
- `tests/pullday.test.ts`: 14 test (parseArgs, dry-run, happy path,
  partial failure, catastrophic redaction)
- `.github/workflows/ci.yml`: SESSION_SIGNING_KEY env + smoke step

### 3.3 Audit Log UI — `(current)`
- `lib/auth/roles.ts`: `view:audit-log` capability (operator-only)
- `lib/db/audit-queries.ts` (yeni): pure helpers + listAuditEvents
  (clampPage/clampPageSize/parseIsoDateOrNull/sanitiseFilterString/
  parseAuditQuery/buildAuditWhere)
- `app/yonetim/denetim/page.tsx` (yeni): server component, RBAC gate,
  pagination links
- `app/yonetim/denetim/filter-bar.tsx` (yeni): server-side GET form
- `components/yonetim/audit-log-table.tsx` (yeni): Apple-grade tablo
- `tests/audit-queries.test.ts`: 20 test (clamp, parse, build-where)
- `tests/auth.roles.test.ts`: view:audit-log gate testleri

## 4. M6'ya Taşınanlar

### 4.1 PDF/Excel Export
Detay: `M6_BACKLOG.md` § 1.

### 4.2 Playwright E2E Smoke
Detay: `M6_BACKLOG.md` § 2.

### 4.3 Canlı deploy + ISS pull + systemd verification
Detay: `M6_BACKLOG.md` § 3 (deployment checklist).

## 5. Test Kanıtı

```
typecheck (tsc --noEmit, strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes)
  exit=0

lint (next lint)
  ✔ No ESLint warnings or errors → exit=0

test (vitest run) — 12 dosya / 128 test (M1-M2-M3 + M4 + M5/1 + M5/2 + M5/3)
 ✓ tests/pullday.test.ts                (14)
 ✓ tests/redaction.test.ts              (17)
 ✓ tests/audit-queries.test.ts          (20)
 ✓ tests/auth.session-key.test.ts       (8)
 ✓ tests/analiz.segmentasyon.test.ts    (9)
 ✓ tests/analiz.ltv.test.ts             (9)
 ✓ tests/crypto.test.ts                 (8)
 ✓ tests/adres.test.ts                  (11)
 ✓ tests/analiz.ciro.test.ts            (11)
 ✓ tests/auth.roles.test.ts             (7)
 ✓ tests/export.csv.test.ts             (10)
 ✓ tests/auth.password.test.ts          (4)
  Tests 128 passed (128)

build (next build) — 9 routes + middleware
  /                       109 kB
  /_not-found             106 kB
  /api/export/odenmemis   105 kB
  /cikis                  105 kB
  /giris                  106 kB
  /karsilastir            109 kB
  /musteriler             111 kB
  /odenmemis              109 kB
  /yonetim/denetim        109 kB    ← yeni (M5/3)
  Middleware              32 kB

smoke:pull-day --dry-run
  exit=0, JSON summary OK, exit-code discipline (0/1/2) verified
```

## 6. Security/KVKK Kanıtı

| Kontrol | Sonuç |
|---|---|
| Hardcoded secret pattern | ✅ 0 match |
| `console.*` source code | ✅ yok (sadece doc string literal'leri) |
| `.env*` repo'da | ✅ yok, sadece `.env.example` |
| Audit UI'da PII alan adı | ✅ yok (`isim`, `soyisim`, `email`, `adres` grep 0 match) |
| URL injection / DoS savunması | ✅ clamp + sanitise + Drizzle param query |
| Session HMAC ↔ PII key decoupled | ✅ M5/1 |
| systemd unit hardening | ✅ 15+ direktif (NoNewPrivileges, ProtectSystem=strict, …) |
| Daily-pull error redaction | ✅ `redactDeep` catch-all |
| RBAC matrix `view:audit-log` operator-only | ✅ test 4 ile kanıtlı |
| Production fail-fast (eksik env) | ✅ M5/1 superRefine |
| Pre-M5 session invalidation kabul | ✅ doc + test |

## 7. Git Durumu

```
branch (current)              feature/m5-operational-hardening
HEAD (M5 madde 3 commit'i sonrası)  feat(m5): add audit log admin UI

main                          aa901f6  (= v0.4.0)
feat/m1-fresh-build           aa901f6
feature/m5-operational-hard.  HEAD = aa901f6 + 4 commits

M5 commit chain:
  d9a04fe  feat(m5): add production daily pull timer workflow
  4fd8dea  docs(m5): SESSION_SIGNING_KEY decoupling closure report
  a482272  feat(m5): split session signing key from PII master key
  aa901f6  docs(closure): M1-M4 final report ... (= v0.4.0 = main)
  + audit-ui commit (this delivery)
```

## 8. Origin Push Durumu

`origin = f:/crm-analiz-repo.git` Linux sandbox'tan SSH host olarak
yorumlanıyor → push fail. **Operasyonel blocker, engineering değil.**

Windows-side komutları:
```powershell
cd F:\GG\Projeler\crmanaliz
git push origin main feat/m1-fresh-build feature/m5-operational-hardening
git push origin v0.4.0
```

## 9. Dış Blocker'lar

| # | Blocker | Sınıf | Çözüm |
|---|---------|-------|-------|
| 1 | Origin push (Linux sandbox `f:/...` resolve edemiyor) | Operasyonel | Windows-side push |
| 2 | DATABASE_URL TLS prod env eksik | Dış bağımlılık | secret manager |
| 3 | PII_MASTER_KEY 32-byte üretim | Dış bağımlılık | `node -e "..."` |
| 4 | SESSION_SIGNING_KEY 32-byte üretim | Dış bağımlılık | `node -e "..."` (PII'den ayrı) |
| 5 | ISS Manager v2 prod client_credentials | Dış bağımlılık | intranet runner |
| 6 | systemd timer canlı doğrulama | Dış bağımlılık | sunucu erişimi olduğunda |
| 7 | 1-day gerçek pull canlı doğrulama | Dış bağımlılık | credentials sonrası |

## 10. Release / Tag Önerisi

**Tag adı:** `v0.5.0`
**Mesaj:** "CRM Analiz M5 operational hardening engineering closure"

**Komut sırası (Windows tarafından):**
```powershell
cd F:\GG\Projeler\crmanaliz
git switch main
git merge --ff-only feature/m5-operational-hardening
git tag -a v0.5.0 -m "CRM Analiz M5 operational hardening engineering closure"
git push origin main feature/m5-operational-hardening v0.5.0
```

Engineering tarafı v0.5.0'a hazır. Production rollout için
`M5_DAILY_CRON_REPORT.md § 8` deployment checklist'i çalıştırılır.

## Kapanış Kararı

**FULLY CLOSED — ENGINEERING.** Tüm M5 madde 1, 2, 3 engineering
deliverable'ları yeşil; M6'ya kaydırılan 2 madde (PDF/Excel,
Playwright) M5 production-açılış kapsamı dışında. Canlı doğrulamalar
deployment phase'ine bırakıldı, bunlar M5 closure'ını düşürmez.
