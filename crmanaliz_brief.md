# crmanaliz — Proje Brief

> Bu dosyayı yeni Cowork session'ında ilk mesaj olarak yapıştır. Kendinden başka hiçbir bağlama ihtiyaç duymaz; yeni Claude bu briefle sıfırdan başlayıp ilk milestone'u bitirebilir.

---

## Kim & Ne

**crmanaliz**, binbirnet (Anamur/Mersin'de İnternet Servis Sağlayıcı) operatörünün **ISSMANAGER** panelinden müşteri ve fatura verisi çekip CRM analizi yapan web pano. Hedef: operatöre Apple seviyesinde rafine, sade, komuta merkezi hissinde bir analiz panosu vermek.

Kullanıcı: **malii** (marskocas@gmail.com), Türkçe konuşur, kısa-doğrudan-sonuç odaklı, "hiç soru sormadan, durmadan çalış" tarzı otonom yaklaşımı sever.

Çalışılacak klasör: `F:\GG\Projeler\crmanaliz` (yeni boş klasör).

## Çalışma Prensibi

- **Otonom çalış.** Soru sorma. En doğru profesyonel kararı ver, uygula, raporla.
- **Apple kalitesi.** Premium ama gösterişsiz. Sade, rafine, 3 saniyede genel durum anlaşılmalı. Gürültü azaltılmalı.
- **Türkçe UI, temiz İngilizce kod.** Domain terimleri Türkçe (abone, fatura, kalem, ödeme türü). Değişken isimleri ve kod yorumları İngilizce.
- **Production-grade.** Testlenebilir, Git tabanlı, küçük odaklı commit'ler. Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
- **Ana hedeften sapma.** Her yeni iş için sor: "Bu CRM analizini daha iyi yapıyor mu?" Hayırsa backlog.
- **Yarım iş bırakma. Fake / demo çözüm kurma. "Sonra bakarız" yaklaşımı yasak.**

## Stack (kilit)

| Katman | Teknoloji |
|---|---|
| Dil | TypeScript 5 strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Frontend | Next.js 15 App Router + Tailwind CSS 4 + shadcn/ui |
| Server | Next.js Server Actions / Route Handlers |
| DB | PostgreSQL 16 + Drizzle ORM + postgres-js |
| Validation | Zod (env, API responses, form input — hepsi) |
| Logger | pino + custom redaction |
| Test | Vitest + Testing Library |
| Lint/Format | ESLint 9 (flat config) + Prettier |
| Pkg manager | pnpm |
| Node | ≥ 20.10 |

Worker (cron pull) ihtiyaç olduğunda eklenir; başlangıçta tek Next app yeterli. Monorepo şart değil — single-app + `lib/` paketleri yeter.

---

## Veri Kaynağı: ISS Manager Customer API V2

### Erişim Linkleri

- **API base URL:** `http://192.168.106.118/api`
- **OpenAPI 3.0.3 (YAML, ~7KB):** `http://192.168.106.118/api-sistem/v2/dokuman/openapi`
- **Postman collection:** `http://192.168.106.118/api-sistem/v2/dokuman/postman`
- **Panel ana sayfası:** `http://192.168.106.118/api-sistem` (client list + dokümantasyon)
- **Yeni client formu:** `http://192.168.106.118/api-sistem/v2/ekle`

### Auth Akışı (canlı kanıtlandı)

```http
POST /api/iss/v2/auth/token HTTP/1.1
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/json

{"grant_type": "client_credentials"}
```

→ HTTP **201**

```json
{
  "data": {
    "token_type": "Bearer",
    "access_token": "issv2_<60_chars>",
    "expires_in": 3600,
    "expires_at": "2026-04-28T13:42:58+03:00",
    "client_id": "iss_v2_<16_chars>"
  },
  "meta": { "request_id": "<uuid>", "timestamp": "...", "version": "v2" },
  "errors": []
}
```

Token TTL = 1 saat. **Refresh endpoint yok** — yeniden client_credentials akışı çalıştırılır. Token cache mutlaka **server-side**; tarayıcıya asla.

### Endpoint Haritası (8)

| Path | Method | Auth | Açıklama |
|---|---|---|---|
| `/iss/v2/health` | GET | yok | Sağlık kontrolü |
| `/iss/v2/auth/token` | POST | basicAuth | Bearer token üret |
| `/iss/v2/customers` | GET | bearer | Müşteri arama. Query: `search` (min 3 char, zorunlu), `records`, `page`, `type` |
| `/iss/v2/customers/find` | GET | bearer | Tam eşleşme. Query: `find` (min 3 char, zorunlu), `records` (1-100), `page` (>=0), `type` |
| `/iss/v2/customers/extra-days` | POST | bearer | **WRITE — KULLANMA** |
| `/iss/v2/invoices` | GET | bearer | Fatura listesi. Query: `start_date` (zorunlu), `end_date` (zorunlu), `payment_type`, `status` (0/1/2) |
| `/iss/v2/invoices/send` | POST | bearer | **WRITE — KULLANMA** |
| `/iss/v2/payment-types` | GET | bearer | 15 ödeme tipi (Nakit, Kredi Kartı, Sanal Pos, Müşteri Bakiyesi, Veresiye, Havale, Ofis kasa, denizbank, Parasut Havale, Pos, EsnekPOS, PayNkolay, FENIKS, Günlük Giderler) |

**Yalnız read endpoint'lerini kullan.** WRITE endpoint'leri (`extra-days`, `invoices/send`) crmanaliz scope'u dışında — kod tabanında geçmesin bile.

### Response Envelope (her yanıtta)

```ts
type Envelope<T> = {
  data: T;                         // tek obje, dizi, veya {records: T[]}
  meta: {
    request_id: string;            // UUID
    timestamp: string;             // ISO-8601, +03:00
    version: "v2";
    pagination?: {
      records: number;
      page: number;
      total_records: number;
      total_pages: number;
    };
  };
  errors: Array<{ code?: string; message?: string }>;
};
```

### Customer Şekli (search/find — KVKK MASKELİ)

```ts
type Customer = {
  isim: string;          // "ALİ*****" — ilk 3-4 char + *****
  soyisim: string;       // "BULU*****"
  firma_unvan: string | null;
  telefon_1: string;     // "+90 ***** 827 92-42" — ortası maskeli, son 6 hane görünür
  email: string | null;  // "sirm*****z@binbirnet"
};
```

> KVKK toggle (`alan_<X>_kvkk`) AÇIK olsa bile veri default maskeli geliyor. Bu API tarafının davranışı; biz değiştiremeyiz. Müşteri arama sadece "kim var" sorusuna cevap verir, ham PII vermez.

### Invoice Şekli (KVKK MASKELEME YOK — DİKKAT)

```ts
type Invoice = {
  abone_no: string;                       // "7110860493"
  unvan: string;                          // "SIRMA GÜRÜZ" — TAM AD
  adres: string;                          // "SAĞLIK MAH. 710 CAD. ... ANAMUR/MERSİN" — TAM ADRES
  fatura_no: string;                      // "1000000003321095"
  genel_toplam: number;                   // 740 (TL)
  urunler: string;                        // "Anamur Süper 25 Wifi"
  fatura_tarihi: string;                  // ISO 8601 UTC: "2026-04-27T14:27:13.000000Z"
  son_odeme_tarihi: string;
  durum: "Ödendi" | "Ödenmedi" | string;
  odendigi_tarih: string | null;
  odeme_turu: string;                     // "Sanal Pos (PayNKolay)"
  kalemler: Array<{
    urun: string;
    adet: number;
    tutar: number;
    kdv: number;
    oiv: number;
    brut: number;
  }>;
};
```

### Boyut & Performans Profili

- ~25-30k toplam müşteri tahmini (binbirnet sample).
- "ali" search → 1364 sonuç (ortalama isim eşleşmesi).
- **/invoices wide range (4 ay) sunucu tarafı timeout veriyor (>45s).** Strateji: **1 günlük window'lar** + records/page paging + paralel worker.
- Aylık ~25k+ fatura → 1 ay query muhtemelen 50-100MB JSON. Streaming parse veya chunked pull şart.
- Tarife profili: "Anamur Süper 16 Wifi" 600 TL/ay, "Anamur Süper 25 Wifi" 740 TL/ay.

### Client Oluşturma (panelden)

URL: `http://192.168.106.118/api-sistem/v2/ekle`. Form alanları (POST `/api-sistem/v2/ekle`):

| Alan | Tip | Not |
|---|---|---|
| `isim` | text | API client adı (örn. `crmanaliz-prod`) |
| `client_id` | text | otomatik üretilir (`iss_v2_<16char>`) |
| `client_secret` | text | boşsa otomatik; kendi değerini girersen onu hash'leyip saklar; **sadece kayıt anında ekranda gösterilir, sonra okunamaz** |
| `expiration` | date | bitiş tarihi (default 1 ay) |
| `status` | toggle | 1 = Açık |
| `izinli_ip` | textarea | satır başına bir IP — **mutlaka doldur** |
| `alan_<X>` | checkbox | field allowlist |
| `alan_<X>_kvkk` | checkbox | KVKK rıza toggle |
| `_token` | hidden | Laravel CSRF |

Bilinen field allowlist anahtarları (`alan_*`): `isim`, `soyisim`, `firma_unvan`, `tckn`, `pasaport`, `telefon_1`, `telefon_2`, `telefon_3`, `email`, `pppoe_k_adi`, `pppoe_k_parola`, `oim_k_adi`, ve daha fazlası. CRM analizi için minimum: `isim`, `soyisim`, `firma_unvan`, `telefon_1`, `email` + KVKK karşılıkları. **TCKN açma** (gerek yok).

Form, başarılı kayıttan sonra `/api-sistem/v2/guncelle/<id>` sayfasına redirect olur ve secret'ı bir kez alert'te gösterir.

---

## KVKK / Güvenlik (NON-NEGOTIABLE)

- /invoices ham PII döküyor. crmanaliz DB'sinde:
  - `unvan`, `adres`, `telefon_1`, `email` için **column-level şifreleme** (AES-256-GCM, KMS veya app-level master key) veya en azından app-level encrypt-on-write.
  - DB connection TLS şart.
  - Audit log: kim, ne zaman, hangi sorgu, kaç kayıt — `pull_runs` ve `audit_events` tabloları.
  - PII'nin loga, error mesajına, monitoring'e, cache'e sızmaması için `redact()` utility her log noktasında zorunlu.
  - Retention: ham invoice 90 gün; aggregate metrik kalıcı; müşteri silme talebine 30 gün içinde yanıt.
- VERBİS perspektifinden: binbirnet veri sorumlusu, crmanaliz veri işleyen — sözleşme gerektirir; bu hukuki, kullanıcıya hatırlat.
- Client secret yalnızca `.env` veya secret manager'da. **Asla commit'te.** `.env.example` repo'da template olarak.
- IP allowlist üretimde sıkı: dev IP + prod sunucu IP. CI runner için ayrı client.
- API auth flow yalnız server'da; tarayıcıdan ISS Manager API'sine doğrudan istek YOK. Browser → Next.js Route Handler → ISS Manager.

---

## Mimari Omurga (önerilen)

```
crmanaliz/
├── app/                          # Next.js App Router
│   ├── (dashboard)/page.tsx      # ana pano
│   ├── musteriler/page.tsx       # müşteri arama
│   ├── faturalar/page.tsx        # fatura listesi + filtreler
│   ├── api/
│   │   ├── musteriler/route.ts   # /customers proxy
│   │   └── faturalar/route.ts    # /invoices proxy
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn primitives
│   └── dashboard/
│       ├── kpi-card.tsx
│       └── charts/
├── lib/
│   ├── issmanager/
│   │   ├── types.ts              # Zod schemas + TS types (Envelope, Customer, Invoice, PaymentType)
│   │   ├── client.ts             # IssmanagerClient class
│   │   ├── auth.ts               # token cache + refresh
│   │   ├── redaction.ts          # PII masker
│   │   ├── errors.ts             # IssmanagerError taxonomy (4xx/5xx/network/parse)
│   │   └── index.ts
│   ├── db/
│   │   ├── schema.ts             # Drizzle tables
│   │   ├── client.ts             # postgres-js + drizzle instance
│   │   └── index.ts
│   ├── analiz/                   # iş mantığı
│   │   ├── churn.ts              # X gün ödemesiz müşteri
│   │   ├── ltv.ts                # müşteri yaşam değeri
│   │   ├── segmentasyon.ts       # paket / ilçe bazlı
│   │   └── ciro.ts               # aylık/günlük ciro agregasyonu
│   ├── adres/                    # TR il/ilçe/mahalle parser
│   │   ├── parser.ts
│   │   └── tr-data.ts
│   ├── crypto/
│   │   ├── encrypt.ts            # AES-256-GCM helpers
│   │   └── key.ts                # master key
│   ├── config.ts                 # Zod-validated env loader
│   └── logger.ts                 # pino + redaction integration
├── scripts/
│   ├── smoke.ts                  # canlı API smoke (health + token + 4 read endpoint)
│   ├── pull-day.ts               # 1 günlük invoice pull
│   └── seed-anonymous.ts         # anonim test fixture üretici
├── drizzle/                      # migration files
├── tests/
│   ├── issmanager/
│   ├── redaction.test.ts
│   └── analiz/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
└── drizzle.config.ts
```

---

## DB Şeması (ilk migration — 0001)

```sql
-- müşteri snapshot (en güncel halini tutar)
CREATE TABLE musteriler (
  abone_no            TEXT PRIMARY KEY,
  isim_enc            BYTEA,                 -- AES-256-GCM
  soyisim_enc         BYTEA,
  firma_unvan_enc     BYTEA,
  telefon_1_enc       BYTEA,
  email_enc           BYTEA,
  il                  TEXT,                  -- "Mersin"
  ilce                TEXT,                  -- "Anamur"
  mahalle             TEXT,                  -- "Sağlık"
  paket_adi           TEXT,                  -- "Anamur Süper 25 Wifi"
  son_aktiflik_tarihi TIMESTAMPTZ,
  durum               TEXT,
  ilk_gorulme         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  son_guncellenme     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hash_pii            TEXT                   -- ham PII'nin SHA-256'sı (dedupe için)
);
CREATE INDEX idx_musteriler_ilce ON musteriler(ilce);
CREATE INDEX idx_musteriler_paket ON musteriler(paket_adi);

-- fatura append-only timeseries
CREATE TABLE faturalar (
  id               BIGSERIAL PRIMARY KEY,
  abone_no         TEXT NOT NULL REFERENCES musteriler(abone_no),
  fatura_no        TEXT NOT NULL UNIQUE,
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
CREATE INDEX idx_faturalar_abone ON faturalar(abone_no);
CREATE INDEX idx_faturalar_tarih ON faturalar(fatura_tarihi);
CREATE INDEX idx_faturalar_durum ON faturalar(durum);

-- pull audit
CREATE TABLE pull_runs (
  id            BIGSERIAL PRIMARY KEY,
  baslangic     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bitis         TIMESTAMPTZ,
  range_start   DATE,
  range_end     DATE,
  endpoint      TEXT NOT NULL,
  kayit_sayisi  INTEGER NOT NULL DEFAULT 0,
  hata_sayisi   INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL,                -- 'running' | 'succeeded' | 'failed'
  hata_detay    TEXT
);

-- erişim audit (kullanıcı paneline erişim)
CREATE TABLE audit_events (
  id            BIGSERIAL PRIMARY KEY,
  ts            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kullanici_id  TEXT,
  aksiyon       TEXT NOT NULL,
  kaynak        TEXT NOT NULL,
  request_id    TEXT,
  ip            INET,
  sonuc         TEXT NOT NULL                 -- 'success' | 'error'
);
CREATE INDEX idx_audit_ts ON audit_events(ts DESC);
```

---

## Komutlar (package.json scripts)

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "typecheck": "tsc --noEmit",
  "lint": "next lint",
  "test": "vitest",
  "smoke": "tsx scripts/smoke.ts",
  "pull:day": "tsx scripts/pull-day.ts",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio"
}
```

---

## .env.example

```dotenv
# ISS Manager v2
ISSMANAGER_BASE_URL=http://192.168.106.118/api
ISSMANAGER_CLIENT_ID=iss_v2_xxxxxxxxxxxxxxxx
ISSMANAGER_CLIENT_SECRET=
# isteğe bağlı: timeout ve retry
ISSMANAGER_TIMEOUT_MS=30000
ISSMANAGER_MAX_RETRY=3

# PostgreSQL
DATABASE_URL=postgres://crmanaliz:secret@localhost:5432/crmanaliz?sslmode=disable

# Şifreleme (32 byte hex)
PII_MASTER_KEY=

# Logger
LOG_LEVEL=info
NODE_ENV=development
```

---

## İlk Milestone (M1 — yetenek kanıtı)

Done criteria: aşağıdakilerin **tamamı** bitmiş ve commit edilmiş olmalı. Her madde ayrı commit.

1. **Repo iskeleti.** `package.json` (Next 15, TS strict, Tailwind 4, Drizzle, Zod, Vitest), `tsconfig.json`, `.env.example`, `.gitignore`, `README.md`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `drizzle.config.ts`. `pnpm install` başarılı, `pnpm typecheck` PASS.
2. **Config + logger.** `lib/config.ts` (Zod-validated env), `lib/logger.ts` (pino + redaction wiring).
3. **Typed IssmanagerClient.** `lib/issmanager/{types,auth,client,redaction,errors,index}.ts`. Token cache (in-memory, TTL'e göre), 4 read endpoint method (`getPaymentTypes`, `searchCustomers`, `findCustomer`, `listInvoices`), Zod-validated response, retry (exponential, max 3, sadece 5xx ve network).
4. **Redaction utility + tests.** `lib/issmanager/redaction.ts`, `tests/redaction.test.ts` — birim testler PII alanlarının maskelendiğini, `null`/`undefined`'ın crash etmediğini, deep nested obj'lerin gezildiğini doğrulasın.
5. **Drizzle şema + migration.** `lib/db/schema.ts` + `drizzle/0001_initial.sql`. `pnpm db:migrate` lokalde geçer.
6. **Şifreleme yardımcısı.** `lib/crypto/{encrypt,key}.ts`, AES-256-GCM, master key env'den. Round-trip unit test.
7. **Smoke script.** `pnpm smoke` → health + token + 4 read endpoint çalıştır + redacted JSON çıktı + exit code 0/1.
8. **Dashboard MVP shell.** App Router ana sayfa, 4 boş KPI kartı (Müşteri Sayısı, Paket Dağılımı, Aylık Ciro, Ödeme Oranı), Türkçe UI, shadcn/ui base, Tailwind temiz tipografi, premium görünüm.
9. **README.** Kurulum (Postgres + .env + pnpm + migrate + dev), proje haritası, KVKK uyarısı, lisans yok.
10. **CI taslağı (opsiyonel, M1.5).** `.github/workflows/ci.yml` — typecheck + lint + test.

**Done sonrası rapor şunları içersin:**
1. Yönetici özeti
2. Yapılan işler (commit listesi)
3. Oluşturulan/güncellenen dosyalar
4. Mimari kararlar
5. Riskler / notlar
6. Sıradaki milestone (M2)

---

## M2 (M1 sonrası, plan)

- 1 günlük invoice cron pull (manuel script önce, sonra cron job).
- Müşteri arama sayfası (panelden /customers proxy + filtreler).
- İlk gerçek KPI: günlük ciro grafiği (recharts veya chart.js).
- Adres parser (Anamur ilçe/mahalle normalize, TR posta kodu lookup).
- Churn proxy: son 30 gün ödemesi olmayan müşteri sayısı + listesi.

## M3 (sonraki)

- LTV (müşteri yaşam değeri) hesaplaması.
- Paket bazlı dönüşüm/iptal segmentasyonu.
- Ay-ay karşılaştırmalı dashboard.
- Export: PDF/Excel rapor.
- RBAC (operatör, analist, salt-okur rolleri).

---

## Yasaklar / Anti-Patterns

- WRITE endpoint çağırma (`extra-days`, `invoices/send`) — kod tabanında geçmesin bile.
- `any` tipi (zorunlu değilse).
- `console.log` — `logger` kullan, redaction'lı.
- Hardcoded secret.
- Client secret commit.
- Plaintext PII logging.
- "TODO sonra bakarız."
- Test edilmemiş "tamam" demek.
- Gerçek müşteri verisini fixture olarak kullanmak — anonimleştir.
- Ham invoice verisini şifrelenmemiş cache'e (Redis/CDN) koymak.
- Browser'dan ISS Manager API'sine doğrudan istek.
- Aşırı abstraction. Gereksiz monorepo. "İleride lazım olabilir" prematür generikleme.

---

## Done Criteria (her commit/PR için)

- `pnpm typecheck` PASS.
- `pnpm lint` PASS.
- `pnpm test` PASS.
- KVKK redaction unit test'leri yeşil.
- README'de ilgili bölüm güncel.
- Conventional commit message.
- Hassas veri (PII, secret) commit'te yok.

---

## İlk Komut

`F:\GG\Projeler\crmanaliz` boş. `package.json`'dan başla. Tooling, lib, scripts, app sırasıyla yaz. Soru sorma. Her milestone bittiğinde rapor ver.

**Hadi başla.**
