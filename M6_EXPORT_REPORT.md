# M6 Madde 1 — PDF & Excel Export Report

**Prompt ID:** CRM-ANALIZ-M5-MERGE-TAG-M6-EXPORT-004 v1.0
**Tarih:** 2026-04-29
**Branch:** `feature/m6-export-reports`
**Önceki tag:** `v0.5.0` (M5 engineering closure, main HEAD = `1095761`)

## 1. Yönetici Özeti

`/api/export/odenmemis` artık üç formatı destekliyor: CSV (default,
backward-compatible), Excel (`xlsx`/`excel` alias) ve PDF. RBAC gate
(`export:csv`) tüm formatlar için aynı; audit log her formatta ayrı
`aksiyon` ile yazılıyor (`export_odenmemis_csv|xlsx|pdf`). Server-side
saf helper'lar (`lib/export/format.ts`, `xlsx.ts`, `pdf.ts`) test
edilebilir; ağır kütüphaneler (exceljs, pdfkit) sadece sunucu tarafında,
client bundle'a inmedi. Türkçe karakter, TL formatlama, güvenli dosya
adı (path traversal + control char savunması), bilinmeyen format için
typed 400.

30 yeni unit test (toplam **158/158 PASS**), build aynı 9 route +
middleware (32 kB), shared bundle 105 kB.

## 2. Teknik Değişiklikler

| Dosya | Tür | Satır |
|---|---|---|
| `lib/export/format.ts` | yeni — TR helpers + format parser | +102 |
| `lib/export/xlsx.ts` | yeni — exceljs writer | +89 |
| `lib/export/pdf.ts` | yeni — pdfkit writer | +124 |
| `app/api/export/odenmemis/route.ts` | rewrite — `?format=` desteği | +118 (-93 net) |
| `package.json` | +exceljs ^4.4.0, +pdfkit ^0.15.1, +@types/pdfkit ^0.13.9 | +3 |
| `tests/export.format.test.ts` | yeni — 17 test | +113 |
| `tests/export.xlsx.test.ts` | yeni — 7 test | +108 |
| `tests/export.pdf.test.ts` | yeni — 6 test | +73 |

## 3. API Davranışı

| Query | Format | Content-Type | Filename |
|---|---|---|---|
| (yok) | CSV (default) | text/csv; charset=utf-8 | `odenmemis-YYYY-MM-DD.csv` |
| `?format=csv` | CSV | text/csv; charset=utf-8 | `odenmemis-YYYY-MM-DD.csv` |
| `?format=xlsx` | Excel | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | `odenmemis-YYYY-MM-DD.xlsx` |
| `?format=excel` | Excel (alias) | (aynı) | `odenmemis-YYYY-MM-DD.xlsx` |
| `?format=xls` | Excel (alias) | (aynı) | `odenmemis-YYYY-MM-DD.xlsx` |
| `?format=pdf` | PDF | application/pdf | `odenmemis-YYYY-MM-DD.pdf` |
| `?format=foobar` | — | — | **400** "bilinmeyen format: foobar. desteklenen: csv, xlsx, excel, pdf" |
| (yetkisiz) | — | — | **403** AuthError (export:csv yok) |

Backward compatibility: `?format` parametresi olmadan eski CSV davranışı korunuyor.

## 4. Excel Export Detayı

- Sheet adı: "Ödenmemiş"
- 8 kolon: Abone No, Müşteri, İlçe, Mahalle, Paket, Son Hareket, Borç (TL), Fatura Sayısı
- Header row donduruldu (`ySplit=1`)
- Header row bold
- Borç kolonu Excel sayı formatı `#,##0.00` (string değil, gerçek number)
- Son Hareket kolonu Excel date formatı `dd.mm.yyyy`
- Türkçe karakterler (Ç, ş, İ, ğ, ü, ö) doğru render — test ile kanıtlı
- Empty list güvenli (sadece header row)
- Bundle etkisi: exceljs server-side dependency, client'a inmedi

## 5. PDF Export Detayı

- A4 landscape, margin 36pt
- Header: "Ödenmemiş Müşteri Listesi" + tarih + kayıt sayısı
- 8 kolon, her satır 16pt yükseklik
- Helvetica + Helvetica-Bold (built-in PDF fontları, Türkçe Latin-1 karakter desteği)
- 30 satır/sayfa, otomatik sayfa kırılması
- `MAX_ROWS=5000` hard cap (DoS savunması; üstü kesilir, header'a bilgi eklenir)
- `ellipsis: true` ile uzun değerler kolon genişliğine göre kırpılır
- Title metadata sabit (kullanıcı verisi sızdırmıyor)
- Bundle etkisi: pdfkit server-side dependency, client'a inmedi

## 6. Test Kanıtı

```
typecheck (tsc --noEmit, strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes)
  exit=0

lint (next lint)
  ✔ No ESLint warnings or errors → exit=0

test (vitest run) — 15 dosya / 158 test
 ✓ tests/pullday.test.ts                (14)
 ✓ tests/redaction.test.ts              (17)
 ✓ tests/audit-queries.test.ts          (20)
 ✓ tests/auth.session-key.test.ts       (8)
 ✓ tests/analiz.segmentasyon.test.ts    (9)
 ✓ tests/export.format.test.ts          (17)  ← yeni
 ✓ tests/analiz.ltv.test.ts             (9)
 ✓ tests/export.xlsx.test.ts            (7)   ← yeni
 ✓ tests/crypto.test.ts                 (8)
 ✓ tests/adres.test.ts                  (11)
 ✓ tests/export.pdf.test.ts             (6)   ← yeni
 ✓ tests/analiz.ciro.test.ts            (11)
 ✓ tests/auth.roles.test.ts             (7)
 ✓ tests/export.csv.test.ts             (10)
 ✓ tests/auth.password.test.ts          (4)
  Tests 158 passed (158) | Duration 3.78s

build (next build) — 9 routes + middleware (no regression)
  + First Load JS shared by all  105 kB
  ƒ Middleware                   32 kB
```

## 7. Security/KVKK

| Kontrol | Sonuç |
|---|---|
| Hardcoded secret | ✅ 0 match |
| `console.*` source | ✅ yok (sadece doc string literal) |
| `.env*` repo'da | ✅ yok |
| RBAC gate her format için aktif | ✅ `export:csv` capability — `analyst`/`viewer` 403 |
| Audit log her formatta yazılıyor | ✅ `export_odenmemis_{csv|xlsx|pdf}` |
| Path traversal in filename | ✅ `safeDownloadFilename` test 1 |
| Control char in filename | ✅ test 2 |
| PII in PDF /Title metadata | ✅ test 6 (sabit başlık) |
| Bilinmeyen format | ✅ typed 400, value 32 char clamped |
| Bundle regresyonu (client) | ✅ shared bundle aynı 105 kB |

## 8. Dependency Etkisi

```
+ exceljs@^4.4.0          (~600 KB unpacked, server-only)
+ pdfkit@^0.15.1          (~1.5 MB unpacked, server-only)
+ @types/pdfkit@^0.13.9   (devDependency)
```

Ağırlık server tarafında; Next.js dynamic route (`runtime: "nodejs"`)
olarak çalıştığı için cold start etkisi var ama client bundle artmadı.

## 9. Sonraki Adım

M6 madde 2: **Playwright E2E smoke** (login + dashboard + odenmemis +
RBAC + audit). Detay: `M6_BACKLOG.md § 2`.
