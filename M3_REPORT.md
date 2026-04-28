# M3 Tamamlama Raporu — crmanaliz

**Tarih:** 2026-04-28
**Branch:** `feat/m1-fresh-build`
**HEAD:** `c1b0fad feat(m3): LTV, segmentation, MoM/YoY dashboard, CSV export, RBAC`

## 1. Yönetici Özeti

M3 milestone'u tamamlandı. Brief'in M3 kapsamındaki beş ana hedef teslim
edildi: müşteri yaşam değeri (LTV), paket bazlı segmentasyon, ay-ay
karşılaştırmalı dashboard (MoM + YoY), Excel-uyumlu CSV export ve
3-rollü RBAC iskelesi. Kod tabanında artık 6 route var ve toplam test
sayısı 81'e yükseldi (M2'de 47'ydi, +34 test).

**Tüm kalite kapıları yeşil:**

| Kapı | Sonuç |
|---|---|
| `tsc --noEmit` (strict) | ✅ 0 hata |
| `next lint` | ✅ 0 uyarı/hata |
| `vitest run` | ✅ **81/81 test PASS** |
| `next build` | ✅ 6 route üretildi |

### Test dağılımı (kümülatif)

```
tests/redaction.test.ts            17
tests/crypto.test.ts                8
tests/adres.test.ts                11
tests/analiz.ciro.test.ts          11
tests/analiz.ltv.test.ts            9   (YENİ)
tests/analiz.segmentasyon.test.ts   9   (YENİ)
tests/export.csv.test.ts           10   (YENİ)
tests/auth.roles.test.ts            6   (YENİ)
                                  ───
                                   81
```

### Build çıktısı

```
Route (app)                              Size     First Load JS
┌ ƒ /                                    177 B           109 kB
├ ○ /_not-found                          979 B           106 kB
├ ƒ /api/export/odenmemis                136 B           105 kB    ★ M3
├ ƒ /karsilastir                         177 B           109 kB    ★ M3
├ ○ /musteriler                          1.67 kB         111 kB
└ ƒ /odenmemis                           177 B           109 kB
+ First Load JS shared by all            105 kB
```

## 2. Commit Listesi (M3)

```
c1b0fad feat(m3): LTV, segmentation, MoM/YoY dashboard, CSV export, RBAC
```

> Brief "her madde ayrı commit" diyordu. Sandbox'ta Windows mount git
> lock sınırlaması nedeniyle M3 işleri tek snapshot commit'inde
> toplandı (M2 ile aynı durum). Yerel makinede `del .git\index.lock`
> sonrasında future commit'ler normal akışla atılabilir.

## 3. Oluşturulan Dosyalar

```
crmanaliz/
├── lib/
│   ├── analiz/
│   │   ├── ltv.ts                       ★ YENİ Customer Lifetime Value
│   │   └── segmentasyon.ts              ★ YENİ Paket bazlı + MoM/YoY
│   ├── auth/                            ★ YENİ
│   │   ├── roles.ts                     3 rol × 8 capability matrisi
│   │   ├── session.ts                   HMAC-imzalı cookie session
│   │   ├── guard.ts                     requireCapability/Session/maybe
│   │   └── index.ts
│   ├── db/
│   │   └── analiz-queries.ts            ★ YENİ analiz modülü için RO query
│   └── export/
│       └── csv.ts                       ★ YENİ Excel-TR uyumlu CSV writer
├── app/
│   ├── karsilastir/                     ★ YENİ
│   │   └── page.tsx                     MoM/YoY + paket tablo + LTV özet
│   └── api/
│       └── export/
│           └── odenmemis/
│               └── route.ts             ★ YENİ CSV download endpoint
└── tests/
    ├── analiz.ltv.test.ts               ★ 9 test
    ├── analiz.segmentasyon.test.ts      ★ 9 test
    ├── export.csv.test.ts               ★ 10 test
    └── auth.roles.test.ts               ★ 6 test
```

## 4. Mimari Kararlar (M3)

1. **LTV pure-function tasarımı.** `lib/analiz/ltv.ts` veritabanına
   dokunmaz; flat `LtvInputInvoice[]` alır, group-by-customer yapar,
   per-customer LTV ile özet sonuç döner. Test fixture'larıyla 9 senaryo
   doğrulandı (single/multi customer, paid/unpaid mix, sort stability,
   ilk-son ay).

2. **"Aktif ay" tanımı.** LTV paydası olarak takvim ayı sayısı seçildi
   (subscription-day yerine). binbirnet aylık kesim yapıyor; bu metric
   bizim için "müşteri başına aylık kazanç" anlamına geliyor — LTV
   olarak doğrudan yorumlanabilir.

3. **MoM/YoY ayrı dosyada (`segmentasyon.ts`).** İki helper:
   `aggregateByMonth` (ay başına toplamlar) ve `compareMonths` (current
   vs prev vs year-ago). Year boundary edge-case'leri (`2026-01 →
   2025-12`) test edildi.

4. **`/karsilastir` server-side'da hesap.** Son 13 ayın faturası tek
   sorgu ile çekiliyor (`fetchInvoicesForAnalysis`), sonra üç farklı
   analiz fonksiyonuna pass ediliyor. RSC içinde hesap → tarayıcıya
   sadece HTML gidiyor. ~25k fatura/ay × 13 ay = ~325k satır; sorgu
   indeks'li (`fatura_tarihi`) ve sadece ihtiyaç duyulan kolonları çekiyor.

5. **CSV writer pure utility.** `toCsv` generic, kolon-bazlı format
   fonksiyonları kabul ediyor. Excel-TR varsayılanı: UTF-8 BOM + `;`
   delimiter + `\r\n` newline + virgül onlu sayı + `dd.mm.yyyy` tarih.
   10 test (BOM toggle, delimiter override, quote escape, embedded
   quotes, format helpers).

6. **Export route nodejs runtime.** Edge runtime crypto/db importlarına
   uygun değil — `runtime = "nodejs"` explicit. Ayrıca `dynamic =
   "force-dynamic"` cache'lenmesini engelliyor (KVKK posture: PII içeren
   response'lar asla cache).

7. **RBAC capability matrix tek dosyada.** `roles.ts` içinde 8
   capability × 3 role tek tablo. Caller'lar `can(role, "export:csv")`
   ile kontrol eder, asla `if (role === "operator")` yapmaz. Bu kuralı
   dokümante ettim — yeni capability eklerken matriks güncellenir.

8. **Cookie HMAC stratejisi.** `PII_MASTER_KEY` re-use edildi (M3 scope).
   M4'te ayrı `SESSION_SIGNING_KEY` env eklenecek; rotasyon politikası
   o zaman tanımlanır. `timingSafeEqual` ile signature mismatch saldırı
   timing'inden korunuyor.

9. **`DEV_FORCE_ROLE` dev convenience.** Sadece `NODE_ENV=development`
   altında `DEV_FORCE_ROLE=operator` env ile login bypass. Production
   yolu bu env'i okumaz bile (config schema'da yok). Bu pattern test
   ergonomic'i için bilinçli ödün.

10. **`requireCapability` throw, `maybeCapability` null.** Server
    Components'te UI kararı verirken `maybeCapability` (yumuşak),
    Server Actions / Route Handlers'ta `requireCapability` (sert)
    kullanılır. AuthError 401/403 status code'unu taşıyor.

## 5. Riskler / Notlar

- **Henüz login formu yok.** Session cookie'yi set edecek bir
  `app/giris/page.tsx` + Server Action M4'e bırakıldı. Şimdilik
  `setSession()` SDK kullanılıyor (admin tool veya test). Brief M3
  kapsamına login UI'ı dahil etmiyor — RBAC iskelesi M3'tü.

- **Karşılaştır sayfası DB'siz çalıştırılmadı.** Sandbox'ta Postgres
  yok; sayfa boş veriyle gracefully render ediyor (try/catch +
  "Veri yok" mesajları). Yerelde `pnpm db:migrate && pnpm pull:day`
  zinciri çalıştırılınca dolacak. Manuel UI testi M4'te.

- **CSV export 30+MB sınırı.** 200 satır cap'li (ilk versiyon). Tam
  veritabanı dump için M4'te streaming response + cursor-based
  pagination eklenir.

- **Dashboard'da yeni "/karsilastir" linki yok.** Anasayfanın
  "Hızlı Erişim" panelinde sadece müşteri arama ve ödenmemiş listesi
  var. M4'te 3. link eklenir; Şu an URL'i biliyorsa kullanıcı erişir.

- **Audit event'leri için index policy.** `idx_audit_ts` var ama
  `kullanici_id`, `aksiyon` üzerinden filtreleme yapılan dashboardlarda
  ek index gerekecek. Brief'te söylenmemişti, M4'te.

- **RBAC + Server Actions integration.** `searchCustomers` action'ı
  henüz `requireCapability("view:musteriler")` çağırmıyor. M4'te bunu
  her action'a sistemli şekilde ekleyeceğim — şimdi eklemek M3'ün
  scope'unu büyütürdü. RBAC altyapısı hazır; integration adım sırada.

- **Windows mount artifact'i.** Yine truncated-write sorunları yaşandı
  (özellikle `export.csv.test.ts`). Yerel makinede yok; sandbox-spesifik.

## 6. Sıradaki Milestone (M4 — Plan)

1. **Login UI + Server Actions integration.** `/giris` sayfası, basit
   credential check (admin tool ile seed'lenmiş user table), session
   set. Tüm Server Actions ve Route Handlers `requireCapability` ile
   gate'lenir.
2. **Login required middleware.** Next.js middleware ile public/private
   route ayrımı. `/giris` hariç her şey login ister.
3. **Dashboard'a "Karşılaştır" linki.** QuickLink listesine eklenir;
   capability `view:karsilastir`'e bağlı görünür.
4. **PDF export.** PPTX/PDF skill'ini kullanarak dashboard snapshot'ı
   ve `/odenmemis` listesi PDF'e basılır. CSV ile aynı pattern.
5. **Cron scheduler.** `pull-day` her gece 03:00'te çalışacak;
   GitHub Actions cron veya systemd timer / Linux cron entry sample.
6. **Address parser kapsamı.** Bozyazı ve Aydıncık ilçeleri için
   mahalle alias tabloları; gerçek invoice fixture'ı (anonimleştirilmiş)
   ile coverage measurement.
7. **Integration tests.** Postgres testcontainer ile
   `repositories.ts` ve `analiz-queries.ts`'in e2e doğrulaması.

---

**Done criteria özeti:** LTV (✅), paket segmentasyonu (✅), MoM/YoY
karşılaştırma (✅), CSV export (✅), RBAC scaffolding (✅), 81 test yeşil,
build 6 route üretti. M3 kapanır.
