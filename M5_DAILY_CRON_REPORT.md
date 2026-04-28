# M5 Madde 2 — Production Daily Pull Timer Report

**Prompt ID:** CRM-ANALIZ-M5-DAILY-CRON-002 v1.0
**Tarih:** 2026-04-28
**Branch:** `feature/m5-operational-hardening`
**HEAD (kapanışta):** `feat(m5): add production daily pull timer workflow`
**Önceki tag:** `v0.4.0`

## 1. Yönetici Özeti

Günlük ISS Manager v2 invoice pull job'u production-grade hale getirildi.
Saf, test edilebilir core (`lib/jobs/pull-day.ts`) ile CLI wrapper
(`scripts/pull-day.ts`) ayrıştırıldı; runner argv parser, dry-run modu,
kesin exit-code disiplini (0 / 1 / 2) ve PII-redacted hata logu kazandı.
Production tetikleyicisi olarak **systemd timer** seçildi (ISS Manager v2
intranet IP'sinde, Vercel cron erişemez). 14 yeni test eklendi (toplam
**107/107 PASS**), build çıktısı (8 route + middleware, 32 kB)
regresyonsuz. CI workflow'a `smoke:pull-day` job'u + eksik
`SESSION_SIGNING_KEY` env'i eklendi.

Canlı 1 günlük gerçek pull doğrulaması production credentials gerektiriyor;
bu dış bağımlılık olduğu için kapanış kararı **PARTIALLY CLOSED**.

## 2. Origin Push Durumu

Linux sandbox `f:/crm-analiz-repo.git` URL'ini SSH host olarak yorumladığı
için push başarısız:

```
ssh: Could not resolve hostname f: Name or service not known
fatal: Could not read from remote repository.
```

Lokal git ref'leri tutarlı; push **operasyonel blocker**, engineering
değil. Windows tarafında çalıştırılacak komutlar:

```powershell
cd F:\GG\Projeler\crmanaliz
git push origin main
git push origin feat/m1-fresh-build
git push origin feature/m5-operational-hardening
git push origin v0.4.0
git ls-remote origin refs/heads/main refs/heads/feat/m1-fresh-build refs/heads/feature/m5-operational-hardening refs/tags/v0.4.0
```

## 3. Teknik Değişiklikler

### `lib/jobs/pull-day.ts` (yeni, ~285 satır)
Saf core, test edilebilir:
- `parseArgs()` — `--dry-run`, `--date=YYYY-MM-DD`, positional date, default
  yesterday UTC, structured error return.
- `formatIsoDate()` / `parseIsoDate()` / `defaultRunDate()`.
- `runDailyPull(options, deps)` — dependency injection (PullClient,
  startPullRun, upsertInvoice, clock, log).
- Dry-run early-return (DB, network, DB write hiçbiri çağrılmaz).
- Page loop, MAX_PAGES=200 hard cap (runaway upstream defense).
- Per-invoice upsert error counter, partial failure path.
- Catch-all error path: `redactDeep` ile sızıntısız error JSON.
- Result: `{ summary, exitCode: 0 | 1 }` döner; CLI exit code'u kullanır.

### `scripts/pull-day.ts` (rewrite, 82 satır)
İnce CLI wrapper:
- `argv.slice(2)` parse, exit 2 unknown arg / bad date için.
- `--dry-run` modunda client/DB stub'ları throw'lar (yanlışlıkla çağrı
  durumunda hemen patlar).
- Production yolunda gerçek `IssmanagerClient`, `startPullRun`,
  `upsertInvoice` injekte eder; `closeDb()` her durumda finally'de.
- Stdout: tek satır JSON summary (systemd journal / log aggregator
  parseable). Stderr: insan-okur progress.

### `package.json`
- Yeni script: `smoke:pull-day` → `tsx scripts/pull-day.ts --dry-run`

### `deploy/systemd/crmanaliz-daily-pull.service`
Production unit dosyası:
- `Type=oneshot`, dedicated `crmanaliz` user/group
- `EnvironmentFile=/etc/crmanaliz/env` (secret manager loader)
- `TimeoutStartSec=5min`, `Restart=no` (transient failure pinning yok)
- Hardening: `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`,
  `PrivateTmp`, `PrivateDevices`, `ProtectKernelTunables`,
  `ProtectKernelModules`, `RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6`,
  `LockPersonality`, `RestrictNamespaces`, `SystemCallFilter=@system-service`
- `StandardOutput/Error=journal` (sytemd journal entegrasyonu)

### `deploy/systemd/crmanaliz-daily-pull.timer`
- `OnCalendar=*-*-* 02:30:00` (gece sessiz saat, yesterday's faturalar
  stabil)
- `RandomizedDelaySec=15min` (multi-env üst kademe yük dağıtımı)
- `Persistent=true` (kutu kapalıysa boot sonrası çalıştır)

### `tests/pullday.test.ts` (yeni, 14 test, ~255 satır)
Network/DB stub'lı:
1-3. `formatIsoDate` / `parseIsoDate` round-trip + reject malformed
4. `parseArgs` no-args = yesterday UTC
5. `parseArgs` positional date
6. `parseArgs` --date= named flag
7. `parseArgs` --dry-run
8. `parseArgs` unknown arg rejected
9. `parseArgs` malformed date rejected
10. `defaultRunDate` returns yesterday UTC midnight
11. `runDailyPull` dry-run early-return — client.listInvoices not called,
    handle.{ok,fail}Calls = 0
12. `runDailyPull` happy path — pagination + insert/dup count + handle.ok
13. `runDailyPull` partial upsert failure → status=failed, exit 1, handle.fail
14. `runDailyPull` client throws → redacted error log, no PII leak, exit 1

### `.github/workflows/ci.yml`
- Quality + build job env'lerine `SESSION_SIGNING_KEY` eklendi
  (M5 madde 1'de unutulmuştu — CI'da tests env-injekt ediyordu, build prod
  modunda config import'unda fail-fast veriyor olabilirdi)
- Yeni step: `pnpm smoke:pull-day` (network/DB'siz dry-run sanity)
- `branches: [..., "feature/**"]` eklendi (M5 PR'larını CI yakalasın)

## 4. Cron / systemd Timer Tasarımı

### Karar: systemd timer (Vercel cron alternatif)

Faktör | systemd timer | Vercel cron
---|---|---
ISS Manager v2 (intranet 192.168.106.118) erişimi | ✅ aynı subnet | ❌ public internet'ten erişemez
DB (intranet PostgreSQL) erişimi | ✅ same host/network | ❌ Vercel'den TLS tunnel gerek
Failure ile retry kontrolü | ✅ Persistent=true + sonraki tick | partial — Vercel max 1 hour
Log retention / journal | ✅ journalctl + rotation | Vercel function logs (24h-7d)
Secret loading | ✅ EnvironmentFile=/etc/... | Vercel env vars
Cost | ✅ var olan sunucu | minimal ama Vercel hesabı gerek

**Sonuç:** Production yolu systemd timer. Vercel cron varyantı sadece
referans olarak repo'da kalır (uygulanmıyor; gelecek `apps/web` Vercel'de
host edilirse `vercel.json` cron entry eklenebilir).

### Failure davranışı

- HTTP/network/parse hatası → `exit 1` → `pull_runs.status=failed` →
  systemd `Restart=no` → 24 saat sonra timer tekrar deneyecek
  (`Persistent=true` ile sunucu kapalıysa boot'ta da)
- Per-invoice upsert hatası → tek tek loglanır, sayım yapılır → run sonu
  `status=failed`, ancak başarılı insert'ler kaybolmaz (idempotent)
- Argv hatası → `exit 2` → systemd FAILED state, journalctl'da görünür
- Kritik exception → `redactDeep` ile sızıntısız log, exit 1

### Idempotency

`upsertInvoice` `ON CONFLICT (fatura_no) DO NOTHING` kullandığı için aynı
gün için tekrar çalıştırma güvenli. `pull_runs` tablosuna her run yeni
satır yazılır (audit trail).

## 5. Security / KVKK Etkisi

| Kontrol | Sonuç |
|---|---|
| Hardcoded secret | ✅ yok (grep 0 match) |
| `console.*` source code | ✅ yok (sadece doc string literal'leri) |
| `.env*` repo'da | ✅ yok, sadece `.env.example` |
| Secret in error message | ✅ `redactDeep` catch-all'da, summary sadece counter/date |
| PII log (PageNo + invoice fatura_no'dan başka şey) | ✅ yok — log'lar fatura_no ve sayılar; isim/adres/email yok |
| systemd unit hardening | ✅ NoNewPrivileges, ProtectSystem=strict, hardening 15+ direktif |
| EnvironmentFile permission | doc'ta `chmod 600 /etc/crmanaliz/env` notu |
| CI placeholder secret reuse | ✅ PII_MASTER_KEY ≠ SESSION_SIGNING_KEY (superRefine'ı geçer) |
| Production fail-fast (eksik env) | ✅ M5 madde 1'den miras |

### KVKK
- Pull edilen invoice verisi (`unvan`, `adres`) DB'ye AES-256-GCM encrypted
  kolonlarla yazılır (M1 mimari). Runner sadece API çağrısı yapar; cleartext
  PII runner sürecinin RAM'inde geçicidir, log'a düşmez.
- Argv'de tarih dışında PII yok.
- systemd journal'da fatura_no görünür — fatura numarası KVKK kapsamında
  PII değil (üreticiyle/müşteriyle birebir eşlemiyor).

## 6. Test Kanıtı

```
=== TYPECHECK ===   tsc --noEmit (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes)
exit=0 → 0 hata

=== LINT ===        next lint
✔ No ESLint warnings or errors → exit=0

=== TEST ===        vitest run
 ✓ tests/pullday.test.ts                (14 tests) 8ms     ← yeni
 ✓ tests/redaction.test.ts              (17 tests) 8ms
 ✓ tests/auth.session-key.test.ts       (8 tests)  35ms
 ✓ tests/analiz.segmentasyon.test.ts    (9 tests)  10ms
 ✓ tests/analiz.ltv.test.ts             (9 tests)  5ms
 ✓ tests/crypto.test.ts                 (8 tests)  24ms
 ✓ tests/adres.test.ts                  (11 tests) 6ms
 ✓ tests/analiz.ciro.test.ts            (11 tests) 19ms
 ✓ tests/export.csv.test.ts             (10 tests) 4ms
 ✓ tests/auth.roles.test.ts             (6 tests)  3ms
 ✓ tests/auth.password.test.ts          (4 tests)  178ms

 Test Files  11 passed (11)
 Tests       107 passed (107)
 Duration    2.09s

=== BUILD ===       next build
✓ Compiled successfully | ✓ Generating static pages (4/4)
Route (app)                              Size     First Load JS
┌ ƒ /                                    177 B           109 kB
├ ○ /_not-found                          981 B           106 kB
├ ƒ /api/export/odenmemis                140 B           105 kB
├ ƒ /cikis                               140 B           105 kB
├ ƒ /giris                               1.08 kB         106 kB
├ ƒ /karsilastir                         177 B           109 kB
├ ○ /musteriler                          1.68 kB         111 kB
└ ƒ /odenmemis                           177 B           109 kB
ƒ Middleware                             32 kB

=== SMOKE: pnpm smoke:pull-day (dry-run) ===
> crmanaliz pull-day 2026-04-27 (dry-run)
{"date":"2026-04-27","endpoint":"/iss/v2/invoices","seen":0,"inserted":0,"errors":0,"pages":0,"durationMs":0,"dryRun":true,"status":"dry-run"}
exit=0

=== EXIT CODE DISCIPLINE ===
dry-run OK     exit=0    (expect 0)  ✓
unknown arg    exit=2    (expect 2)  ✓
bad date       exit=2    (expect 2)  ✓
```

### Çalıştırılamayan smoke'lar (dış bağımlılık)

| Smoke | Sebep | Risk seviyesi |
|---|---|---|
| Gerçek 1-day pull (192.168.106.118) | Linux sandbox'tan intranet erişim yok + ISS Manager v2 prod credentials yok | P2 — kod path'i 14 unit test ile kanıtlı, gerçek istek için credentials yeterli |
| systemd timer fire (`systemctl start ...`) | Sunucu erişimi sandbox'tan yok | P2 — unit dosyası syntax doğru; canlı host'ta `systemctl daemon-reload` + `enable --now` |
| `pull_runs` row insert canlı DB | DATABASE_URL prod yok | P2 — repository unit test stub'lı; canlı'da migration sonrası schema hazır |

## 7. Git Durumu

```
branch (current)              feature/m5-operational-hardening
HEAD (kapanış öncesi)         4fd8dea docs(m5): SESSION_SIGNING_KEY decoupling closure report
HEAD (kapanış sonrası)        feat(m5): add production daily pull timer workflow

main                          aa901f6  (= v0.4.0)
feat/m1-fresh-build           aa901f6
feature/m5-operational-hard.  4fd8dea + new (3 ahead of v0.4.0)
v0.4.0                        aa901f6

origin push status            BLOCKED → Windows-side execution required
```

M5 madde 2 commit kapsamı (yalnızca):
- lib/jobs/pull-day.ts (yeni)
- scripts/pull-day.ts (rewrite)
- package.json (smoke:pull-day script)
- deploy/systemd/crmanaliz-daily-pull.service (yeni)
- deploy/systemd/crmanaliz-daily-pull.timer (yeni)
- tests/pullday.test.ts (yeni)
- .github/workflows/ci.yml (SESSION_SIGNING_KEY + smoke:pull-day step)
- M5_DAILY_CRON_REPORT.md (bu dosya, ayrı docs commit'inde olabilir)
- M5_KICKOFF_PLAN.md (madde 2 status güncellemesi)

## 8. Açık Riskler ve Dış Blocker'lar

| # | Risk | Sınıf | Aksiyon |
|---|------|-------|---------|
| 1 | Origin push (Linux sandbox `f:/...` resolve edemiyor) | Operasyonel | Windows tarafından push |
| 2 | DATABASE_URL TLS prod env eksik | Dış bağımlılık | secret manager |
| 3 | PII_MASTER_KEY 32-byte üretim | Dış bağımlılık | `node -e "..."` + secret manager |
| 4 | SESSION_SIGNING_KEY 32-byte üretim (PII'den ayrı) | Dış bağımlılık | aynı komut, ayrı çağrı, secret manager |
| 5 | ISS Manager v2 prod client_credentials | Dış bağımlılık | intranet runner'da tanımla |
| 6 | systemd timer canlı doğrulama | Dış bağımlılık | sunucu erişimi olduğunda `systemctl enable --now`, `journalctl -u ...` |
| 7 | 1-day gerçek pull canlı doğrulama | Dış bağımlılık | credentials geldikten sonra `pnpm pull:day -- $(date +%Y-%m-%d -d yesterday)` |
| 8 | Stale `.git/*.lock` Windows mount delete reddi | Operasyonel | Windows-side `git gc` |

### Production Deployment Checklist

```
[ ]  /etc/crmanaliz/env oluştur, chmod 600
[ ]  içine: NODE_ENV, LOG_LEVEL, ISSMANAGER_BASE_URL, ISSMANAGER_CLIENT_ID,
     ISSMANAGER_CLIENT_SECRET, DATABASE_URL (TLS), PII_MASTER_KEY, SESSION_SIGNING_KEY
[ ]  /opt/crmanaliz/current → release symlink
[ ]  pnpm install --frozen-lockfile (offline mirror veya tarball deploy)
[ ]  pnpm db:migrate
[ ]  /var/log/crmanaliz dizinini oluştur, crmanaliz:crmanaliz sahip
[ ]  sudo cp deploy/systemd/crmanaliz-daily-pull.{service,timer} /etc/systemd/system/
[ ]  sudo systemctl daemon-reload
[ ]  sudo systemctl enable --now crmanaliz-daily-pull.timer
[ ]  doğrulama:
     systemctl list-timers crmanaliz-daily-pull.timer
     sudo systemctl start crmanaliz-daily-pull.service   # manual fire
     journalctl -u crmanaliz-daily-pull.service -n 200 --no-pager
[ ]  smoke:
     sudo -u crmanaliz pnpm smoke:pull-day
     sudo -u crmanaliz pnpm pull:day -- --date=$(date -d yesterday +%Y-%m-%d)
```

### Rollback

systemd timer'ı durdur, son release'e dön:
```
sudo systemctl disable --now crmanaliz-daily-pull.timer
sudo systemctl stop crmanaliz-daily-pull.service
ln -sfn /opt/crmanaliz/releases/<previous> /opt/crmanaliz/current
```

Code rollback: `git revert <m5-madde-2-commit>` ya da `git reset --hard
v0.4.0` (feature branch'te).

## 9. Sonraki M5 Maddesi — Madde 3: Audit Log UI

**Branch:** `feature/m5-operational-hardening` (devam) veya yeni
`feature/m5-audit-log-ui`.

**Kapsam:**
- `app/yonetim/denetim/page.tsx` — server component, RBAC `admin` only
- `app/yonetim/denetim/actions.ts` — pagination + filtre (kullanıcı, tarih, action)
- `lib/db/audit-queries.ts` — drizzle helpers
- `components/yonetim/audit-table.tsx` — Apple-grade tablo, az gürültü
- `lib/auth/roles.ts` capability matrix'e `view_audit_log` (sadece admin)
- 4-6 yeni test: query helpers, RBAC gate, pagination math

**P-sınıf:** P2 (operasyonel; canlı incident analizinde kritik ama ilk
production deploy için zorunlu değil).

## Kapanış Kararı

**PARTIALLY CLOSED** — tüm lokal quality gate'ler yeşil (typecheck 0,
lint 0, vitest 107/107, build 8 route + middleware), exit-code disiplini
kanıtlandı, dry-run smoke çalıştı, security checklist temiz, systemd unit
syntax doğrulandı (kod path'i + hardening direktifleri review-ready).
**Canlı 1-day pull** ve **systemd timer fire** doğrulamaları sadece
production credentials + intranet erişimi geldiğinde tamamlanabilir;
bunlar engineering değil dış bağımlılık. Credentials'tan sonra
deployment checklist'i çalıştırılınca **FULLY CLOSED**'a yükselir.
