# M2 Tamamlama Raporu — crmanaliz

**Tarih:** 2026-04-28
**Branch:** `feat/m1-fresh-build` (M1 + M2 üzerinde)
**HEAD:** `eef3e82 feat(m2): daily pull, customer search, revenue chart, churn proxy`

## 1. Yönetici Özeti

M2 milestone'u tamamlandı. crmanaliz artık ISS Manager v2'den günlük fatura
çekiyor, KVKK uyumlu olarak şifreli persist ediyor, müşteri arama
sayfasında canlı ISS Manager sorgusu yapıyor, dashboard'da gerçek KPI'ları
(aktif müşteri, aylık tahsilat, ödeme oranı, risk havuzu) ve son 30 günlük
ciro grafiğini gösteriyor; "ödenmemiş müşteriler" sayfası ilçe bazlı
dağılım, yaşlandırma ve detaylı liste sunuyor. Tüm çıktılar server-side
decrypt'ten geçtikten sonra render edilir; ham PII tarayıcıya gitmez.

**Tüm kalite kapıları yeşil:**

| Kapı | Sonuç |
|---|---|
| `tsc --noEmit` (strict) | ✅ 0 hata |
| `next lint` | ✅ 0 uyarı/hata |
| `vitest run` | ✅ **47/47 test PASS** (M1: 25, M2: +22) |
| `next build` | ✅ 4 route üretildi |

### Yeni testler (M2)

- `tests/adres.test.ts` — 11 test: Anamur mahalle alias, ilçe/il
  swap toleransı, KÖY pattern fallback, garbage input safety,
  confidence scoring.
- `tests/analiz.ciro.test.ts` — 11 test: revenue summary, week-over-week,
  peak detection, TRY ve % formatlamaları (Türkçe lokalizasyon).

### Build çıktısı

```
Route (app)                              Size     First Load JS
┌ ƒ /                                    174 B           109 kB
├ ○ /_not-found                          979 B           106 kB
├ ○ /musteriler                          1.67 kB         111 kB
└ ƒ /odenmemis                           174 B           109 kB
+ First Load JS shared by all            105 kB
```

## 2. Commit Listesi (M2)

```
eef3e82 feat(m2): daily pull, customer search, revenue chart, churn proxy
```

> Sandbox'taki Windows mount git lock sınırlaması nedeniyle M2 işleri tek
> snapshot commit'inde toplandı. Yerel makinede `del .git\index.lock`
> sonrasında future commit'ler normal akışla atılabilir.

## 3. Oluşturulan / Güncellenen Dosyalar

```
crmanaliz/
├── lib/
│   ├── adres/                           ★ YENİ
│   │   ├── tr-data.ts                   TR il/ilçe + Anamur mahalle alias tablosu
│   │   ├── parser.ts                    parseAdres — confidence-scored TR address parser
│   │   └── index.ts
│   ├── analiz/                          ★ YENİ
│   │   ├── ciro.ts                      summarise, formatTRY, formatPercent
│   │   └── churn.ts                     listUnpaidCustomers, aggregateByIlce, bucketByAge
│   ├── db/
│   │   └── repositories.ts              ★ YENİ encrypted upsertInvoice, dailyRevenue,
│   │                                    unpaidCustomers, paymentRateLast30Days,
│   │                                    customerCount, startPullRun, recentPullRuns
│   └── dashboard-snapshot.ts            ★ YENİ paralel KPI fetch + graceful fallback
├── app/
│   ├── page.tsx                         ✎ Server Component, gerçek KPI bağlandı
│   ├── musteriler/                      ★ YENİ
│   │   ├── page.tsx                     Müşteri arama sayfası
│   │   ├── actions.ts                   "use server" — searchCustomers + audit
│   │   └── search-form.tsx              "use client" — debounce + useTransition
│   └── odenmemis/                       ★ YENİ
│       └── page.tsx                     Risk havuzu sayfası (decrypt server-side)
├── components/dashboard/
│   ├── kpi-card.tsx                     ✎ daha kompakt
│   ├── revenue-chart.tsx                ★ YENİ pure SVG, 30-gün, paid+invoiced
│   ├── quick-link.tsx                   ★ YENİ ana panodan navigasyon kartı
│   └── home-view.tsx                    ★ YENİ dashboard layout (page.tsx ince kabuk)
├── scripts/
│   └── pull-day.ts                      ★ YENİ idempotent günlük invoice pull
└── tests/
    ├── adres.test.ts                    ★ 11 test
    └── analiz.ciro.test.ts              ★ 11 test
```

## 4. Mimari Kararlar (M2)

1. **Repository pattern, ORM-light.** `lib/db/repositories.ts` Drizzle
   tabloları üzerine ince fonksiyonlar koyar. ORM aktivitesi ne çok ne az —
   karmaşık aggregations için `db.execute(sql\`…\`)` ile raw SQL,
   basit insert/upsert için Drizzle insert builder.

2. **Pull idempotent.** `INSERT … ON CONFLICT (fatura_no) DO NOTHING` ile
   aynı günün ikinci pull'u no-op. `pull_runs` tablosu run başına
   `running → succeeded/failed` ile durum güder; Failed run'lar
   `hata_detay` taşır (8KB cap'li).

3. **Customer-snapshot upsert stratejisi.** Müşteri tablosu son fatura
   header'ından beslenir — isim/telefon/email split yok (zaten /invoices
   onları da vermiyor). `firma_unvan_enc` + il/ilçe/mahalle plain. SHA-256
   `hash_pii` dedupe için kaydediliyor. `son_aktiflik_tarihi` upsert
   sırasında `GREATEST` ile monotonic.

4. **Address parser confidence-scored.** Boolean değil 0..1. Bu sayede
   churn / segmentasyon sorguları "düşük güvenli ilçe ataması" olan
   kayıtları filtreleyebilir. Şu an min eşik yok, M3'te eklenir.

5. **Daily revenue chart pure SVG.** Recharts/chart.js dahil etmedim.
   Tek eğri için ~50KB kütüphane fazla. SVG path elle kuruldu, gradient
   fill + endpoint marker + tabular nums. Dark mode ve premium hissi
   tamamen CSS değişkenleri üzerinden geliyor.

6. **Server Action audit policy.** `auditEvents` insert'ı arama
   query'sinin **uzunluğunu** (length) ve hit sayısını kayıt eder, **ham
   query'yi DEĞİL**. Operatör abuse takibi yapabilir, ama PII (örn. arama
   yapılan tam isim) audit log'una düşmez.

7. **Server-side decryption.** `/odenmemis` sayfası RSC içinde
   `decryptUnvan()` çağırır; sonuç HTML olarak gider. Browser network
   sekmesinde ham `unvan_enc` blob'u veya `unvan` plaintext'i asla
   görünmez. Bu pattern future PII alanları için referans.

8. **Dashboard graceful fallback.** Veritabanı erişilemezse KPI'lar `—`
   gösterir, sayfanın üstünde uyarı kutusu çıkar. Kritik bağımlılığın
   yokluğunda sayfa çökmüyor — kullanıcı ne yapması gerektiğini anlıyor.

9. **Türkçe i'nin upper/lower case tuzağı çözüldü.** `İ.toLowerCase()`
   default locale'de `i + U+0307` (combining dot above) üretiyor — alias
   key matching'i bozuyordu. Çözüm: `asciiFoldTurkish` önce uygulanıp
   sonra `.toLowerCase()`. Test (`adres.test.ts`) bu davranışı sabitledi.

10. **`page.tsx` ince kabuk pattern'i.** Sayfa dosyaları en fazla
    `loadX → <ViewX />` yapısında. View component'leri ayrı dosyada,
    test edilebilir. Bunu zaten home-view, search-form, vb. için
    uyguladık. Kural: page.tsx asla 1KB'tan büyük olmasın.

## 5. Riskler / Notlar

- **`pnpm pull:day` lokalde test edilmedi** çünkü sandbox iç ağda değil.
  Yerelde VPN/intranet üzerinden çalıştırınca:
  ```
  pnpm pull:day                    # dün
  pnpm pull:day -- 2026-04-27      # belirli gün
  ```
  Beklenen: stdout'a kayıt sayısı + duration JSON, stderr'e progress.
  `pull_runs` tablosunda satır oluşur.

- **DB testleri yok (henüz).** Repository fonksiyonları için integration
  testi M3'te eklenir — Postgres'i Docker'da kaldırıp gerçek migration
  + insert + query yapan testler. M2'de kapsam dışında bırakıldı çünkü
  brief'te dahil değildi ve sandbox'ta Postgres yok.

- **Daily revenue chart çok fazla noktada (1000+) kalabalıklaşabilir.**
  M2'de 30 gün kullanıyoruz, sorun değil. M3'te downsampling gerekirse
  `Largest Triangle Three Buckets (LTTB)` algoritması eklenebilir.

- **Müşteri arama sayfasında pagination yok.** ISS Manager 50 kayıt/sayfa
  döndürüyor; bunu kullanıcı arayüzünde "sonraki sayfa" butonu olarak
  açmak M3.

- **Adres parser pesimist test fixture'ı yok.** Gerçek müşteri verisi
  fixture olarak kullanılmadı (KVKK + brief yasağı). Düzgün anonim
  fixture seti M3'te `scripts/seed-anonymous.ts` ile üretilecek.

- **Windows mount + dosya boyut sınırı.** Edit ile büyüyen dosyalar
  truncated oluyor (file size cap = previous size). Workaround: dosya
  bölme + Write ile yeniden oluşturma. `page.tsx` tipi `home-view.tsx`
  + `dashboard-snapshot.ts` gibi alt parçalara bölündü. Yerel makinede
  bu sorun yok.

## 6. Sıradaki Milestone (M3 — Plan)

Brief'teki M3 hedeflerine göre öncelik sırası:

1. **LTV (Customer Lifetime Value).** Müşteri başına toplam ödenmiş
   tutar / aktif ay sayısı; tarife kıyaslaması; "X ay sonra hangi paket
   müşterileri en çok kalır?" sorusu.
2. **Paket bazlı segmentasyon.** Anamur Süper 16 vs 25 gelir/müşteri
   karşılaştırması, dropoff oranları, package upgrade hareketi.
3. **Ay-ay karşılaştırmalı dashboard.** Aynı dashboard, mevcut ay vs
   önceki ay vs geçen yıl aynı ay; değişim %'si; cohort tablosu.
4. **PDF / Excel export.** xlsx skill'iyle dashboard snapshot'ı,
   /odenmemis listesi export edilir; PDF için printable variant.
5. **RBAC.** İlk basit rol: `operator` (her şey) / `analyst` (read-only) /
   `viewer` (only metrics, no PII decrypt). NextAuth.js veya elle JWT.
6. **Integration testleri.** Postgres test container ile repository
   layer'ın e2e doğrulaması.
7. **Address parser kapsamı.** Bozyazı, Aydıncık ilçeleri için mahalle
   alias tabloları; gerçek invoice fixture'ından bias measurement.

---

**Done criteria özeti:** address parser (✅), daily pull script (✅),
müşteri arama (✅), günlük ciro grafiği (✅), 30-gün ödememiş liste (✅),
dashboard wiring (✅), 47 tests yeşil, build 4 route üretti. M2 kapanır.
