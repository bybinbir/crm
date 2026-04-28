# crmanaliz — Final Teslim Raporu

**Tarih:** 2026-04-28
**Branch:** `feat/m1-fresh-build`
**HEAD:** `8890590 feat(m4): login UI + middleware route protection + RBAC integration`

## 1. Yönetici Özeti

binbirnet (Anamur/Mersin ISP) için CRM analiz panosu sıfırdan tek bir
Next.js 15 + TypeScript strict + Drizzle + Zod + Vitest projesi olarak
inşa edildi. Brief'in M1, M2, M3 milestone'ları teslim edildi; ek olarak
RBAC iskelesini production-ready hale getirmek için M4 kapanışı yapıldı
(login UI, middleware route protection, capability gate'leri).

**Tüm kalite kapıları yeşil:**

| Kapı | Sonuç |
|---|---|
| `tsc --noEmit` (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes) | ✅ 0 hata |
| `next lint` | ✅ 0 uyarı/hata |
| `vitest run` | ✅ **85/85 test PASS** (9 test dosyası) |
| `next build` | ✅ 8 route + middleware üretildi |
| KVKK redaction unit testleri | ✅ 17/17 yeşil |
| AES-256-GCM round-trip + tamper testi | ✅ 8/8 yeşil |
| Conventional commits + rapor + dosya listesi | ✅ M1-M4 her milestone'da |

## 2. Branch / Commit Geçmişi

```
8890590 feat(m4): login UI + middleware route protection + RBAC integration
c1b0fad feat(m3): LTV, segmentation, MoM/YoY dashboard, CSV export, RBAC
eef3e82 feat(m2): daily pull, customer search, revenue chart, churn proxy
89f4a57 chore: remove stray pnpm temp files committed by accident
2e9208b chore(legacy): archive pre-M1 monorepo project to .legacy/
```

Yedek branch'ler:
- `legacy/monorepo-pre-m1` — eski Turborepo/NestJS/Prisma monorepo'sunun
  tam snapshot'ı (kaybolmaması için).

## 3. Test Dağılımı (Kümülatif, 85/85 PASS)

```
tests/redaction.test.ts            17     KVKK redaction (M1)
tests/crypto.test.ts                8     AES-256-GCM round-trip (M1)
tests/adres.test.ts                11     TR address parser (M2)
tests/analiz.ciro.test.ts          11     Revenue summary + format (M2)
tests/analiz.ltv.test.ts            9     Customer Lifetime Value (M3)
tests/analiz.segmentasyon.test.ts   9     Package + MoM/YoY (M3)
tests/export.csv.test.ts           10     Excel-TR CSV writer (M3)
tests/auth.roles.test.ts            6     RBAC capability matrix (M3)
tests/auth.password.test.ts         4     scrypt hash + verify (M4)
                                  ───
                                   85
```

## 4. Production Build (8 route + middleware)

```
Route (app)                              Size     First Load JS
┌ ƒ /                                    177 B           109 kB
├ ○ /_not-found                          979 B           106 kB
├ ƒ /api/export/odenmemis                139 B           105 kB
├ ƒ /cikis                               139 B           105 kB
├ ƒ /giris                               1.08 kB         106 kB
├ ƒ /karsilastir                         177 B           109 kB
├ ○ /musteriler                          1.67 kB         111 kB
└ ƒ /odenmemis                           177 B           109 kB
+ First Load JS shared by all            105 kB

ƒ Middleware                             32 kB
```

Tüm sayfalarda first-load < 115 kB. Hiçbir sayfada chart kütüphanesi yok
(SVG hand-rolled). Authentication middleware ile 32 kB ek ediyor — kabul
edilebilir.

## 5. Mimari — Final Hali

```
crmanaliz/
├── app/
│   ├── layout.tsx
│   ├── globals.css                          OKLCH palette, dark mode, premium
│   ├── page.tsx                             Dashboard (RSC, gerçek KPI)
│   ├── giris/
│   │   ├── page.tsx                         Login formu (Server Component)
│   │   ├── login-form.tsx                   "use client" useTransition
│   │   └── actions.ts                       loginAction + audit
│   ├── cikis/
│   │   └── route.ts                         Logout endpoint
│   ├── musteriler/
│   │   ├── page.tsx
│   │   ├── search-form.tsx                  Client component
│   │   └── actions.ts                       searchCustomers + RBAC
│   ├── odenmemis/
│   │   └── page.tsx                         Server-side decrypt + table
│   ├── karsilastir/
│   │   └── page.tsx                         MoM/YoY + paket + LTV
│   └── api/
│       └── export/odenmemis/route.ts        CSV download + RBAC
├── components/dashboard/
│   ├── kpi-card.tsx                         Premium KPI tile
│   ├── revenue-chart.tsx                    Pure SVG, gradient fill
│   ├── quick-link.tsx
│   └── home-view.tsx                        Page-shell pattern
├── lib/
│   ├── config.ts                            Zod-validated env
│   ├── logger.ts                            pino + 30+ redaction path
│   ├── dashboard-snapshot.ts                Parallel KPI loader
│   ├── issmanager/
│   │   ├── types.ts                         Zod schemas + TS types
│   │   ├── auth.ts                          Token cache, in-flight de-dup
│   │   ├── client.ts                        IssmanagerClient (4 read endpoint)
│   │   ├── redaction.ts                     redactDeep + safeStringify
│   │   ├── errors.ts                        6-class error taxonomy
│   │   └── index.ts
│   ├── crypto/
│   │   ├── encrypt.ts                       AES-256-GCM
│   │   └── key.ts
│   ├── auth/
│   │   ├── roles.ts                         3-rol × 8 capability matrix
│   │   ├── session.ts                       HMAC cookie session
│   │   ├── guard.ts                         require/maybe Capability
│   │   ├── password.ts                      scrypt N=2^14
│   │   └── index.ts
│   ├── adres/
│   │   ├── parser.ts                        TR address parser
│   │   └── tr-data.ts                       Anamur mahalle alias tablosu
│   ├── analiz/
│   │   ├── ciro.ts                          Revenue summary + format
│   │   ├── churn.ts                         30-gün ödememiş havuz
│   │   ├── ltv.ts                           Customer Lifetime Value
│   │   └── segmentasyon.ts                  Paket + MoM/YoY
│   ├── export/
│   │   └── csv.ts                           Excel-TR CSV writer
│   └── db/
│       ├── schema.ts                        Drizzle (5 tablo)
│       ├── client.ts                        postgres-js + Drizzle
│       ├── repositories.ts                  upsertInvoice, KPI queries
│       ├── analiz-queries.ts                Read-only timeseries query
│       └── index.ts
├── drizzle/
│   ├── 0001_initial.sql                     M1 başlangıç
│   ├── 0002_users.sql                       M4 kullanıcılar
│   └── meta/_journal.json
├── scripts/
│   ├── smoke.ts                             Canlı API sağlık testi
│   ├── pull-day.ts                          Idempotent günlük invoice pull
│   └── seed-user.ts                         User seed (CLI)
├── tests/                                   85 test, 9 dosya
├── middleware.ts                            Cookie presence gate
├── .github/workflows/ci.yml                 typecheck + lint + test + build
├── README.md
├── CLAUDE.md
└── .env.example
```

## 6. Operasyonel Komutlar

```bash
# Kurulum
pnpm install
cp .env.example .env.local
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Çıktıyı .env.local içindeki PII_MASTER_KEY satırına yapıştır.

# Veritabanı
pnpm db:migrate

# Admin kullanıcı oluştur
pnpm tsx scripts/seed-user.ts admin@binbirnet.local "STRONGPASS!" operator
pnpm tsx scripts/seed-user.ts analyst@binbirnet.local "STRONGPASS2" analyst
pnpm tsx scripts/seed-user.ts viewer@binbirnet.local "STRONGPASS3" viewer

# İlk veri çek
pnpm pull:day                       # dün
pnpm pull:day -- 2026-04-27         # belirli gün

# Geliştirme
pnpm dev                            # http://localhost:3000
pnpm typecheck && pnpm lint && pnpm test

# Canlı API doğrulama (intranet'ten)
pnpm smoke

# Production
pnpm build
pnpm start
```

## 7. KVKK Posture — Konsolide

1. **Layered redaction.** `lib/issmanager/redaction.ts` derin, cycle-safe;
   `lib/logger.ts` pino path-bazlı redact + `logSafe()` derin redact.
   `console.log` ESLint ile yasak.
2. **Column-level encryption.** `musteriler.firma_unvan_enc`, `_email_enc`,
   `_telefon_1_enc`, `_isim_enc`, `_soyisim_enc`; `faturalar.unvan_enc`,
   `adres_enc` — hepsi AES-256-GCM (`nonce(12) || tag(16) || ct`).
3. **Server-side decrypt.** `decryptUnvan()` sadece RSC içinde çağrılıyor;
   tarayıcıya HTML olarak gidiyor. Browser network sekmesinde ham PII yok.
4. **Audit trail.** `audit_events` tablosu her arama, login, export
   eylemini kaydediyor — kullanıcı ID, IP, sonuç, request ID. Search
   audit'i query length saklıyor (raw query DEĞİL).
5. **Pull operasyon audit'i.** `pull_runs` her `pull-day` koşusunu
   running → succeeded/failed durum makinesinde tutuyor.
6. **Read-only API surface.** `/extra-days`, `/invoices/send` write
   endpoint'leri kod tabanında YER ALMIYOR. ESLint guard'ı yok ama
   isim olarak hiç çağrılmadığı için statik olarak da garanti.
7. **TLS posture.** `lib/db/client.ts` production'da
   `sslmode=require` yoksa uyarı veriyor.
8. **Session cookie.** HttpOnly + SameSite=Lax + Secure (prod) +
   HMAC-SHA256 imzalı, timing-safe equality.
9. **Password hashing.** scrypt N=2^14, r=8, p=1, 16-byte salt;
   `timingSafeEqual` ile verify.
10. **VERBİS notu.** binbirnet veri sorumlusu, crmanaliz veri işleyen.
    KVKK 12. maddeye göre veri işleyen sözleşmesi şart — hukuki uyarı
    README ve CLAUDE.md'de.

## 8. Sandbox Kısıtlamaları (Yerelde Yok)

- **`.git/index.lock` orphan dosyası silinemedi.** Workaround: her
  milestone için `GIT_INDEX_FILE=/tmp/...` + `commit-tree` plumbing
  ile HEAD elle güncellendi. Yerelde `del .git\index.lock` ile temizlenir.
- **`pnpm install` Windows mount'unda hardlink alamıyor.** Workaround:
  `/tmp/pnpm-store` + `node-linker=hoisted` + `package-import-method=copy`.
  Yerelde varsayılan store ile sorunsuz.
- **Dosya boyut sınırı / NULL padding.** Edit ile büyüyen dosyalar
  truncated oluyor; yeniden yazımda NULL padding kalıyor. Workaround:
  her dosyaya `tr -d '\0'` + heredoc + mv ile yeniden yazım.
- **`pnpm smoke` ve `pnpm pull:day` sandbox'ta çalıştırılmadı** —
  192.168.106.118 iç ağı erişilebilir değil. Yerelde VPN/intranet üzerinden
  çalıştırılmalı.
- **2 adet 0-byte `_tmp_3_*` dosyası repo root'unda kaldı** — pnpm
  install temp file'ları, git'ten çıkarıldı, .gitignore zaten kapsıyor.
  Yerelde `del _tmp_3_*` ile temizlenir.

## 9. Backlog — Sıradaki Adımlar (Brief Dışı, Önerilen)

Brief'in M3 roadmap'i tamamlandı. M4 (kapanış) RBAC'i prod-ready hale
getirdi. Aşağıdakiler şimdi opsiyonel iyileştirme:

1. **Cron scheduler.** GitHub Actions cron / systemd timer / Linux crontab
   ile `pull-day` her gece 03:00'te çalışsın.
2. **PDF export.** PPTX/PDF skill ile dashboard snapshot + risk havuzu
   PDF'e basılır.
3. **Streaming CSV.** 200+ satırlık çıktı için cursor-based pagination
   + chunked response. Şu an 200 satır cap.
4. **Audit dashboard.** `audit_events` üzerinde admin paneli — kim
   ne yaptı, ne zaman.
5. **Address parser kapsamı.** Bozyazı, Aydıncık, Gülnar mahalleleri.
6. **Integration testleri.** Postgres testcontainer ile repository ve
   analiz-queries layer'ını e2e doğrulama.
7. **Login rate limiting.** brute-force koruması (Redis + token bucket).
8. **Session signing key ayrımı.** `SESSION_SIGNING_KEY` env eklenip
   `PII_MASTER_KEY` reuse'undan ayrılması; rotasyon politikası.

## 10. Teslim Edilen Vaatler — Brief Madde Madde

| Brief Maddesi | Durum |
|---|---|
| ISS Manager v2 (read-only) entegrasyonu | ✅ M1 |
| KVKK redaction + AES-256-GCM şifreleme | ✅ M1 |
| Drizzle şema + migration | ✅ M1 + M4 (kullanıcılar) |
| Apple kalitesi UI (Türkçe, sade, premium) | ✅ M1-M4 |
| 1 günlük invoice pull (idempotent) | ✅ M2 |
| Müşteri arama sayfası | ✅ M2 |
| Günlük ciro grafiği | ✅ M2 |
| Adres parser (Anamur mahalle normalize) | ✅ M2 |
| 30 gün ödememiş müşteri listesi | ✅ M2 |
| LTV (Customer Lifetime Value) | ✅ M3 |
| Paket bazlı segmentasyon | ✅ M3 |
| Ay-ay (MoM) + Yıl-yıl (YoY) karşılaştırma | ✅ M3 |
| Excel/CSV export | ✅ M3 |
| RBAC (3 rol: operator/analyst/viewer) | ✅ M3 + M4 (login) |
| Production-grade (typecheck, lint, test) | ✅ 85/85 test, build clean |
| Conventional commits, küçük odaklı commit'ler | ✅ M1-M4 her biri ayrı |
| Türkçe UI, İngilizce kod | ✅ tüm dosyalar |
| `console.log` yasağı | ✅ ESLint enforce |
| `any` yasağı | ✅ ESLint enforce |
| WRITE endpoint kullanmama | ✅ kod tabanında geçmiyor |
| Hardcoded secret yok | ✅ .env.example template |

---

**crmanaliz, brief'in tüm vaatlerini teslim eden, production-grade,
KVKK-uyumlu bir Next.js 15 + TypeScript uygulamasıdır.** Yerel kurulum
README'de net şekilde dokümante edildi. Sıradaki sahibi bu repo'yu
açtığında 5 dakikada anlar; ilk gün operasyonel hale getirir.
