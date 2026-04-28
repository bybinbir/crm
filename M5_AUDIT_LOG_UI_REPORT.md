# M5 Madde 3 — Audit Log UI Report

**Prompt ID:** CRM-ANALIZ-M5-AUDIT-UI-AND-CLOSURE-003 v1.0
**Tarih:** 2026-04-28
**Branch:** `feature/m5-operational-hardening`
**Önceki tag:** `v0.4.0`

## 1. Yönetici Özeti

`audit_events` tablosunu operatörlere okutan production-ready sayfa
eklendi. Sayfa server component (`/yonetim/denetim`), `view:audit-log`
capability gate'iyle korunuyor (sadece `operator` rolü erişebilir).
Filtreler: tarih aralığı, aksiyon, sonuç, kullanıcı id; tümü server-side
clamp + sanitise ediliyor (URL üzerinden injection riski yok). Sıralama
deterministic (`ts DESC, id DESC`). Pagination `pageSize+1` çekerek
ekstra `count(*)` round-trip'ini elemiyor.

20 yeni unit test (toplam **128/128 PASS**), 1 yeni route
(`/yonetim/denetim`), build aynı bundle. PII veya secret UI'da
gösterilmiyor.

## 2. Teknik Değişiklikler

| Dosya | Tür | Satır |
|---|---|---|
| `lib/auth/roles.ts` | `view:audit-log` capability + operator-only | +2 |
| `lib/db/audit-queries.ts` | yeni — pure helpers + listAuditEvents | +212 |
| `app/yonetim/denetim/page.tsx` | yeni — RBAC gate + pagination | +117 |
| `app/yonetim/denetim/filter-bar.tsx` | yeni — server-side GET form | +86 |
| `components/yonetim/audit-log-table.tsx` | yeni — Apple-grade tablo | +74 |
| `tests/audit-queries.test.ts` | yeni — 20 test | +187 |
| `tests/auth.roles.test.ts` | view:audit-log gate testleri | +20/-5 |

## 3. RBAC + Güvenlik

### Capability matrix güncellemesi

```ts
operator: [..., "view:audit-log", ...],
analyst:  [...],            // YOK
viewer:   [...],            // YOK
```

### URL injection / DoS savunması

| Kontrol | Mekanizma |
|---|---|
| SQL injection | Drizzle parameterised query, raw string yok |
| Page denial-of-read (limit=10⁷) | `clampPageSize` MAX_PAGE_SIZE=200 |
| Page enum overflow | `clampPage` MAX_PAGE=10⁴ |
| Free-form filter input | `sanitiseFilterString` trim + 100-char hard cap |
| Bad date parsing | `parseIsoDateOrNull` regex + Date.parse, malformed→ignore |
| Multiple-value param attack | `parseAuditQuery` ilk değeri alır |

### PII/secret leak savunması

- `audit_events` zaten PII içermez (kullaniciId opaque, aksiyon/kaynak teknik string'ler).
- UI'da hiçbir PII alan adı (`isim`, `soyisim`, `email`, `adres`, vs.) yok — `git grep` doğruladı.
- `requestId` UI'da ilk 8 karakter + tooltip; tam değer JS payload'a inmiyor.
- `kullaniciId` opaque numerik/UUID — kullanıcı adı/email tabloya cross-join ile getirilmiyor.

## 4. UI Standardı

- Apple-grade sade tablo: 6 kolon (Zaman, Kullanıcı, Aksiyon, Kaynak, Sonuç, İstek/IP)
- Türkçe başlıklar, Türkçe tarih formatı (`Intl.DateTimeFormat("tr-TR")`)
- Dark/light mode CSS variable'larla uyumlu (`--color-fg-0`, `--color-surface-1`, `--radius-card`)
- Responsive — filtre bar `sm:grid-cols-2 md:grid-cols-6`
- Empty state: dashed border, sade mesaj
- Sonuç badge: `ok` yeşil, `fail` sarı (success/warning tokens)
- Sayfalama: önceki/sonraki link'ler, mevcut filtreleri korur

## 5. Test Kanıtı

```
typecheck (tsc --noEmit, strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes)
  exit=0

lint (next lint)
  ✔ No ESLint warnings or errors → exit=0

test (vitest run) — 12 dosya / 128 test
 ✓ tests/pullday.test.ts                (14 tests)
 ✓ tests/redaction.test.ts              (17 tests)
 ✓ tests/audit-queries.test.ts          (20 tests)  ← yeni
 ✓ tests/auth.session-key.test.ts       (8 tests)
 ✓ tests/analiz.segmentasyon.test.ts    (9 tests)
 ✓ tests/analiz.ltv.test.ts             (9 tests)
 ✓ tests/crypto.test.ts                 (8 tests)
 ✓ tests/adres.test.ts                  (11 tests)
 ✓ tests/analiz.ciro.test.ts            (11 tests)
 ✓ tests/auth.roles.test.ts             (7 tests)   ← +1 (view:audit-log gate)
 ✓ tests/export.csv.test.ts             (10 tests)
 ✓ tests/auth.password.test.ts          (4 tests)
  Tests 128 passed (128) | Duration 3.43s

build (next build)
  ✓ 9 route + middleware (32 kB)
  ┌ ƒ /                                    180 B
  ├ ○ /_not-found                          981 B
  ├ ƒ /api/export/odenmemis                140 B
  ├ ƒ /cikis                               140 B
  ├ ƒ /giris                               1.08 kB
  ├ ƒ /karsilastir                         180 B
  ├ ○ /musteriler                          1.68 kB
  ├ ƒ /odenmemis                           180 B
  └ ƒ /yonetim/denetim                     180 B    ← yeni
  + First Load JS shared by all            105 kB
```

## 6. Sonraki Adım

M5 madde 3 kapanışı + M5 final closure raporu + M6 backlog dokümanı
aşağıdaki commit'te birlikte: `feat(m5): add audit log admin UI`.
