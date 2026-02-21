# ISP CRM Local Analytics Platform (Windows + MongoDB)

## 1) Yönetici Özeti (1 sayfa)
Bu proje, Türkiye’de bir ISP operasyon ekibinin CRM verisini her gün otomatik çekip yerel MongoDB’ye yazan, ardından Windows masaüstü uygulamasıyla analiz/raporlama yapmasını sağlayan hibrit bir mimari sunar. Tasarım ilkesi: **önce resmi API, API yoksa Playwright tabanlı Chrome otomasyonu**. Böylece bilinmeyen/kapalı CRM sistemlerinde bile veri akışı sürdürülebilir olur.

Önerilen teknoloji yığını tek dilde (**.NET 8/C#**) standardize edilmiştir: WPF Desktop UI, .NET tabanlı collector/ETL, MongoDB Driver, Playwright, ClosedXML/QuestPDF. Kimlik bilgileri düz metin yerine Windows DPAPI/Credential Manager ile korunur. Sync pipeline idempotent upsert + fingerprint hash yaklaşımı ile veri tekrarlarını engeller, incremental cursor ile günlük yükü düşürür.

MVP kapsamı çalışan minimum akış sağlar:
- Playwright ile CRM login akışı (selector’lar config’ten).
- Customers + Subscriptions çekme (şu an mock scraping; gerçek selector’lara bağlanacak şekilde soyut).
- MongoDB’ye upsert.
- WPF ekranında “60+ gün süresi dolmuş aboneler” raporu.
- CSV export.

Operasyonel dayanıklılık için retry/backoff, sync_runs kaydı, hata logları ve scheduler tasarımı dahil edilmiştir. Uygulama tek PC’de çalışır; ancak bileşen ayrımı sayesinde aynı kod tabanı ileride merkezi sunucuya taşınabilir.

---

## 2) Mimari + Veri Modeli + Senkron Planı

### A) Mimari bileşenler
- **Data Collector**: CRM’e API veya Playwright ile bağlanır, ham kayıtları alır.
- **ETL/Normalizer**: Alan eşleme, tip dönüşümü, fingerprint hash, dedup.
- **MongoDB Repository**: Upsert + index yönetimi + rapor sorguları.
- **Analytics Engine**: KPI/segment/uyarı sorguları.
- **Desktop UI (WPF)**: Dashboard, listeler, rapor ekranları, export.
- **Scheduler**: Windows Task Scheduler (önerilen) veya uygulama içi timer.

### Veri akış diyagramı
```text
[CRM API/UI] -> [Collector (API first, Playwright fallback)]
            -> [Normalizer + Fingerprint + Versioning]
            -> [MongoDB collections]
            -> [Analytics Engine]
            -> [WPF Desktop UI + Export CSV/Excel/PDF]
            -> [Daily Auto Reports]
```

### Güvenlik tasarımı
- Kullanıcı adı/şifre/token düz metin tutulmaz; DPAPI ile şifreli saklama.
- Config dosyasında yalnızca non-secret alanlar (URL, selector, page size).
- Log masking: PII ve secret alanları log’da maskeleme.
- Rol bazlı local erişim: uygulama klasörü NTFS izinleri.

### Performans stratejisi
- İlk full sync sonrası incremental cursor.
- Batch upsert (collection bazlı).
- Mongo indexleri: `customer_id`, `status`, `updated_at`, `subscription_end_date`.
- Retry + exponential backoff + jitter.

### B) Teknoloji seçimi (net öneri)
- **Windows Desktop: WPF (.NET 8)** (WinUI 3’e göre enterprise desktop kurulumlarında daha olgun data-grid ve MVVM ekosistemi).
- **Collector/Backend: .NET Worker Service yaklaşımı (C# tek dil)**.
- **Web otomasyon: Playwright (Chromium/Chrome/Edge)**.
- **DB: MongoDB + MongoDB C# Driver**.
- **Raporlama: CSV/Excel (ClosedXML), PDF (QuestPDF)**.

### C) MongoDB veri modeli

#### `customers`
```json
{
  "_id": "ObjectId",
  "external_id": "C-1001",
  "full_name": "Ayşe Demir",
  "national_id": "***",
  "district": "Kadıköy",
  "neighborhood": "Fikirtepe",
  "status": "active",
  "created_at": "2025-01-10T10:00:00Z",
  "updated_at": "2026-01-01T07:10:00Z",
  "fingerprint": "SHA256"
}
```
İndeks: `external_id(unique)`, `updated_at`, `status`.

#### `subscriptions`
```json
{
  "_id": "S-9001",
  "customer_id": "C-1001",
  "plan_code": "FIBER-100",
  "monthly_price": 499,
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2025-11-01T00:00:00Z",
  "status": "expired",
  "updated_at": "2026-01-01T07:10:00Z",
  "fingerprint": "SHA256"
}
```
İndeks: `customer_id`, `end_date`, `status`, `updated_at`.

#### `invoices`
```json
{
  "_id": "INV-100",
  "customer_id": "C-1001",
  "subscription_id": "S-9001",
  "amount": 499,
  "due_date": "2025-10-10T00:00:00Z",
  "status": "overdue",
  "updated_at": "2026-01-01T07:10:00Z"
}
```
İndeks: `customer_id`, `due_date`, `status`, `updated_at`.

#### `payments`
```json
{
  "_id": "PAY-300",
  "invoice_id": "INV-100",
  "customer_id": "C-1001",
  "amount": 499,
  "paid_at": "2025-10-20T10:00:00Z",
  "method": "credit_card",
  "status": "completed"
}
```
İndeks: `invoice_id`, `customer_id`, `paid_at`.

#### `tickets`
```json
{
  "_id": "T-99",
  "customer_id": "C-1001",
  "category": "speed",
  "priority": "high",
  "status": "open",
  "opened_at": "2025-12-25T12:00:00Z",
  "updated_at": "2026-01-01T07:10:00Z"
}
```
İndeks: `customer_id`, `status`, `updated_at`.

#### `sync_runs`
```json
{
  "_id": "run_20260101_0700",
  "source": "crm-ui",
  "started_at": "2026-01-01T07:00:00Z",
  "finished_at": "2026-01-01T07:05:10Z",
  "mode": "incremental",
  "records_read": 520,
  "records_written": 499,
  "status": "success",
  "error": "",
  "cursor_date": "2026-01-01T07:05:10Z"
}
```
İndeks: `started_at(desc)`, `status`.

#### `change_log` (opsiyonel)
```json
{
  "_id": "chg_001",
  "entity": "subscriptions",
  "entity_id": "S-9001",
  "change_type": "update",
  "previous_hash": "...",
  "new_hash": "...",
  "changed_at": "2026-01-01T07:10:00Z"
}
```

### D) Senkron stratejisi
- **İlk sync:** full extraction.
- **Sonraki sync:** `updated_at > last_cursor` incremental.
- `updated_at` yoksa: sayfa bazlı tarama + fingerprint hash karşılaştırma.
- Rate limit: 429/5xx için exponential backoff (1s,2s,4s... max 60s).
- Retry: geçici hata için 3-5 deneme.
- Dead letter: parse edilemeyen kayıtları `dead_letter` koleksiyonuna yaz.
- Idempotent yazım: `ReplaceOne(IsUpsert=true)`.

### E) Analizler (12+)
1. Süresi dolmuş ve 60+ gün geçmiş aboneler (kritik).
2. 7/14/30 gün içinde bitecek abonelikler.
3. Vadesi geçen ödemeler.
4. Churn risk skoru (ticket + ödeme gecikmesi + downgrade).
5. ARPU.
6. MRR.
7. Aylık churn rate.
8. İlçe/mahalle dağılımı.
9. Paket bazlı gelir dağılımı.
10. Yeni müşteri kazanımı (gün/hafta/ay).
11. Dondurulan abonelikler.
12. Aktivasyon süresi (satış→kurulum).
13. Tekrarlayan arıza/ticket kümeleri.
14. Tahsilat performansı (günlük/haftalık).

---

## 3) UI Ekranları
- **Dashboard**: son sync zamanı, çekilen kayıt, hata sayısı.
- **Customers**: filtre/arama/detay.
- **Subscriptions**: bitiş tarihi, durum, “60+ gün geçmiş” filtre.
- **Reports**: hazır raporlar + CSV/Excel/PDF export.
- **Scheduler/Settings**: CRM URL, selector, sync saati, Mongo bağlantısı.
- **Logs**: son 500 satır + seviyeye göre filtre.

---

## 4) Kod (repo yapısı + temel dosyalar + çalıştırma)

### Proje yapısı
```text
ISPCRM.sln
src/
  CRM.Core/
  CRM.Infrastructure/
  CRM.Desktop/
docs/
```

### MVP’de çalışanlar
- `ICRMAdapter` arayüzü ile CRM bağımlılığı soyutlandı.
- `PlaywrightCrmAdapter` login ve örnek customers/subscriptions çekimi yapar.
- `MongoRepository` upsert + 60+ gün expired rapor sorgusunu çalıştırır.
- WPF ekranında Sync Now / 60+ Gün Raporu / CSV Export aksiyonları vardır.

### Çalıştırma adımları
1. MongoDB local kur ve çalıştır (`mongodb://localhost:27017`).
2. .NET 8 SDK kur.
3. `src/CRM.Desktop/appsettings.json` içinde CRM URL/selector’ları düzenle.
4. Gerekirse DPAPI ile parola üret ve `CRM_PASS_DPAPI` env set et.
5. `dotnet restore` ardından `dotnet build ISPCRM.sln`.
6. Windows ortamında `dotnet run --project src/CRM.Desktop/CRM.Desktop.csproj`.

### Dağıtım / kurulum
- **Installer önerisi:** MSIX (kurumsal dağıtım, otomatik update), alternatif WiX.
- İlk kurulum sihirbazı: CRM URL, credential kaydı, Mongo test bağlantısı.
- Otomatik güncelleme: MSIX update channel veya kurumsal SCCM/Intune.
- Günlük otomasyon: Windows Task Scheduler ile collector job.
