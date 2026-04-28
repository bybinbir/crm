# crmanaliz

binbirnet (Anamur/Mersin ISP) operatörü için CRM analiz panosu. ISS Manager
v2 API'sinden müşteri ve fatura verisi çekip rafine, sade, "komuta merkezi"
hissinde bir Next.js dashboard'da gösterir.

> Bu repo tek bir Next.js uygulamasıdır. Frontend, server action'lar, API
> route'ları, smoke script ve Drizzle migration'ları aynı kod tabanında yaşar.
> Monorepo yok — `lib/` altında alan-bazlı paketler var.

## Mimari Özet

| Katman | Teknoloji |
|---|---|
| Dil | TypeScript 5 strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Frontend | Next.js 15 App Router + Tailwind CSS 4 |
| Server | Server Actions + Route Handlers |
| DB | PostgreSQL 16 + Drizzle ORM + postgres-js |
| Validation | Zod (env, API yanıtları, form input) |
| Logger | pino + KVKK redaction |
| Test | Vitest |
| Pkg | pnpm 9 |

## Hızlı Başlangıç

Önkoşullar: Node ≥ 20.10, pnpm ≥ 9, çalışan bir PostgreSQL 16, ISS Manager
v2 panelinden alınmış bir client_id / client_secret.

```bash
# 1) Bağımlılıklar
pnpm install

# 2) Env şablonu
cp .env.example .env.local

# 3) Master encryption key üret (32 byte hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Çıktıyı .env.local içindeki PII_MASTER_KEY satırına yapıştır.

# 4) Migration uygula
pnpm db:migrate

# 5) Dashboard'u dev modunda aç
pnpm dev
# → http://localhost:3000
```

## Kalite Kapıları

| Komut | Açıklama |
|---|---|
| `pnpm typecheck` | `tsc --noEmit`, strict mode |
| `pnpm lint` | ESLint flat config, console yasak |
| `pnpm test` | Vitest — redaction + crypto |
| `pnpm smoke` | Canlı ISS Manager v2 sağlık kontrolü |
| `pnpm build` | Production Next.js derleme |

Her PR'da `typecheck + lint + test` yeşil olmalı. CI workflow'u
`.github/workflows/ci.yml` altında.

## Proje Haritası

```
crmanaliz/
├── app/                      Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx              Ana pano (KPI grid)
│   └── globals.css           Premium tema (oklch, Tailwind 4 @theme)
├── components/
│   └── dashboard/
│       └── kpi-card.tsx
├── lib/
│   ├── config.ts             Zod-validated env
│   ├── logger.ts             pino + redaction
│   ├── issmanager/           Tipli API client
│   │   ├── auth.ts           Token cache
│   │   ├── client.ts         IssmanagerClient
│   │   ├── errors.ts         Hata taksonomisi
│   │   ├── redaction.ts      KVKK redact utility
│   │   ├── types.ts          Zod şemaları + TS tipleri
│   │   └── index.ts
│   ├── crypto/
│   │   ├── encrypt.ts        AES-256-GCM kolon şifreleme
│   │   └── key.ts            Master key loader
│   └── db/
│       ├── client.ts         postgres-js + Drizzle
│       ├── schema.ts         musteriler, faturalar, pull_runs, audit_events
│       └── index.ts
├── drizzle/
│   ├── 0001_initial.sql      İlk migration
│   └── meta/_journal.json
├── scripts/
│   └── smoke.ts              Canlı API sağlık testi
├── tests/
│   ├── crypto.test.ts        AES-GCM round-trip
│   └── redaction.test.ts     PII maskeleme
└── .github/workflows/
    └── ci.yml                typecheck + lint + test
```

## KVKK Notları

ISS Manager v2 `/invoices` endpoint'i **maskelenmemiş** PII döküyor: tam
isim, tam adres. Bu nedenle:

- `lib/issmanager/redaction.ts` her log noktasında zorunludur. `pino` config
  ek olarak path-bazlı redaction yapıyor (`lib/logger.ts`).
- `musteriler` ve `faturalar` tablosundaki `*_enc` kolonları AES-256-GCM ile
  şifreli (`lib/crypto/encrypt.ts`). Anahtar `PII_MASTER_KEY` env'inde,
  asla commit'lenmez.
- DB connection production'da TLS zorunlu (`sslmode=require`).
- WRITE endpoint'leri (`/extra-days`, `/invoices/send`) bu kod tabanında
  yer almaz; tarayıcıdan ISS Manager API'sine doğrudan istek YOK.
- VERBİS perspektifinden binbirnet veri sorumlusu, crmanaliz veri işleyendir.
  Sözleşme gerekir.

## Yasaklar

- WRITE endpoint çağrısı (`/extra-days`, `/invoices/send`)
- `any` tipi (zorunlu olmadıkça)
- `console.log` — `lib/logger` kullan
- Plaintext PII logging
- Hardcoded secret
- Browser'dan ISS Manager API'sine doğrudan istek
- "TODO sonra bakarız"
- Test edilmemiş "tamam" demek
- Aşırı abstraction, prematür generikleme

## Roadmap

- **M1** (✅ tamamlandı) Repo iskeleti, IssmanagerClient, redaction + tests,
  Drizzle, AES-256-GCM, smoke script, dashboard kabuğu, CI.
- **M2** 1 günlük invoice cron pull, müşteri arama sayfası, günlük ciro
  grafiği, adres parser (Anamur ilçe/mahalle), 30 gün ödememiş müşteri
  listesi.
- **M3** LTV, paket bazlı segmentasyon, ay-ay karşılaştırma, PDF/Excel
  export, RBAC.

## Lisans

Lisans belirtilmemiştir. Kod sahibi: malii (binbirnet).
