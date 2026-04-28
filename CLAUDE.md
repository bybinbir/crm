# CLAUDE.md — crmanaliz proje rehberi

> Bu dosya bu repo'da çalışan Claude (veya başka bir LLM ajanı) için kısa,
> bağımsız bir operasyon kılavuzudur. Yeni bir session her başladığında ÖNCE
> okumalıdır. Genel proje brief'i ayrıca `crmanaliz_brief.md` içindedir.

## Tek Cümlelik Konsept

binbirnet (Anamur/Mersin ISP) operatörü için, ISS Manager v2 API'sinden
müşteri ve fatura çekip CRM analizi yapan **tek Next.js uygulaması**
(monorepo değil).

## Çalışma Kuralları (kullanıcı tercihleri)

- **Otonom çalış.** Soru sorma. En doğru profesyonel kararı ver, uygula,
  raporla. Kullanıcı: malii / marskocas@gmail.com / Türkçe.
- **Her milestone bittiğinde rapor**: yönetici özeti + commit listesi +
  dosya listesi + mimari kararlar + riskler + sıradaki milestone.
- **Apple kalitesi UI.** 3 saniyede genel durum anlaşılmalı, gürültü az.
- **Türkçe UI, İngilizce kod.** Domain terimleri Türkçe (`abone`, `fatura`,
  `kalem`, `ödeme türü`); değişken / fonksiyon isimleri ve yorumlar İngilizce.
- **Production-grade.** Conventional commits (`feat:`, `fix:`, `refactor:`,
  `docs:`, `test:`, `chore:`). Küçük, odaklı commit'ler.
- **Yarım iş yok.** Fake / demo / "TODO sonra" yasak. Test edilmemiş "tamam"
  demek yasak.

## Stack — Net

| Katman | Teknoloji |
|---|---|
| Dil | TypeScript 5 strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Frontend | Next.js 15 App Router + Tailwind CSS 4 |
| DB | PostgreSQL 16 + Drizzle ORM + postgres-js |
| Validation | Zod (env, API yanıtı, form input) |
| Logger | pino + custom redaction |
| Test | Vitest |
| Pkg | pnpm 9 |
| Node | ≥ 20.10 |

## Komutlar (her zaman geçerli)

```bash
pnpm install
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm test        # vitest run
pnpm smoke       # canlı ISS Manager v2 sağlık testi
pnpm build       # next build
pnpm db:migrate  # drizzle-kit migrate
```

Her PR / commit için: `typecheck + lint + test` PASS, KVKK redaction
testleri yeşil, sensitive veri commit'te yok.

## ISS Manager v2 API — Hatırlatıcılar

- **Base URL:** `http://192.168.106.118/api`
- **Auth:** `POST /iss/v2/auth/token` (Basic auth + `client_credentials`).
  Token TTL = 1 saat, refresh endpoint YOK — yeniden client_credentials.
- **Read endpoints** (kullanılabilir):
  - `GET /iss/v2/health`
  - `GET /iss/v2/payment-types`
  - `GET /iss/v2/customers?search=...`        (KVKK MASKELİ)
  - `GET /iss/v2/customers/find?find=...`     (KVKK MASKELİ)
  - `GET /iss/v2/invoices?start_date=...&end_date=...`  (**MASKELİ DEĞİL**)
- **Write endpoints** (`/extra-days`, `/invoices/send`) → **kullanma**.
  Kod tabanında geçmesin bile.
- `/invoices` wide-range çağrılarda 45s+ timeout veriyor → 1 günlük window
  + paginated pull stratejisi şart (M2 worker'ı).

## KVKK / Güvenlik

- `lib/issmanager/redaction.ts` → tüm PII alanlarını maskeler. Yeni PII
  alanı eklerken aynı commit'te bu listeye ekle.
- `lib/logger.ts` → pino + path-bazlı redact. `console.log` yasak (ESLint).
- `lib/crypto/encrypt.ts` → AES-256-GCM, master key
  `PII_MASTER_KEY` env'inden. Format: `nonce(12) || tag(16) || ct`.
- `musteriler` / `faturalar` tablosundaki `*_enc` kolonları şifreli.
- DB connection production'da TLS zorunlu.
- `audit_events` ve `pull_runs` her erişimi/sorguyu loglar.

## Mimari Omurga

```
crmanaliz/
├── app/                     Next.js App Router (UI + Route Handlers)
├── components/dashboard/    KPI kartları, panel'ler
├── lib/
│   ├── config.ts            Zod-validated env loader
│   ├── logger.ts            pino + redaction
│   ├── issmanager/          API client (types/auth/client/redaction/errors)
│   ├── crypto/              AES-256-GCM helpers
│   └── db/                  Drizzle schema + client
├── drizzle/                 Migration SQL + journal
├── scripts/                 smoke.ts, pull-day.ts (M2)
├── tests/                   Vitest unit tests
└── .github/workflows/ci.yml
```

## Roadmap (özet)

- **M1** (✅ tamamlandı, 2026-04-28) Repo iskeleti, typed IssmanagerClient,
  redaction + tests, Drizzle şema, AES-256-GCM, smoke, dashboard shell, CI.
- **M2** 1 günlük invoice cron pull, müşteri arama sayfası, günlük ciro
  grafiği, adres parser, 30 gün ödememiş müşteri listesi.
- **M3** LTV, paket segmentasyonu, ay-ay karşılaştırma, PDF/Excel export,
  RBAC.

## Yasaklar (özet)

- WRITE endpoint çağırma
- `any` tipi (justifier yorum yoksa)
- `console.log`
- Plaintext PII logging
- Hardcoded secret / commit'te `.env`
- Browser → ISS Manager API doğrudan istek
- "TODO sonra bakarız" / fake demo / test edilmemiş "tamam"
- Aşırı abstraction, "ileride lazım olur" prematür generikleme
- Gerçek müşteri verisini test fixture'ı olarak kullanmak (anonimleştir)

## Yeni Session İçin İlk Komut

`crmanaliz_brief.md` ve `CLAUDE.md` oku → mevcut milestone'a göre devam et.
Yarım iş varsa bitir, yoksa bir sonraki milestone'a geç. Soru sorma.
