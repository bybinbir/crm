# ISSmanager Automation Testing Guide

**Version:** 1.0
**Date:** 2026-03-30
**Status:** Ready for Credential Activation

---

## Overview

Bu döküman ISSmanager otomatik export-import sisteminin nasıl test edileceğini açıklar.

**Dikkat:** Test için PostgreSQL database ve gerçek ISSmanager credentials gereklidir.

---

## Prerequisites

### 1. Database Setup

```bash
# PostgreSQL başlat (Docker veya native)
# Örnek Docker compose:
docker run -d \
  --name crmanaliz-postgres \
  -e POSTGRES_USER=crmadmin \
  -e POSTGRES_PASSWORD=n1kU9b0d3MxZMHgl8H0VbvhZqbM5jv \
  -e POSTGRES_DB=crmanaliz \
  -p 5432:5432 \
  postgres:16-alpine

# Migration çalıştır
cd apps/api
pnpm prisma migrate deploy

# Seed (admin user)
pnpm prisma db seed
```

### 2. Install Dependencies

```bash
cd /f/crmanaliz
pnpm install
```

### 3. Environment Variables

`apps/api/.env` dosyasında şunlar olmalı:

```env
DATABASE_URL=postgresql://crmadmin:n1kU9b0d3MxZMHgl8H0VbvhZqbM5jv@localhost:5432/crmanaliz
ENCRYPTION_KEY=development-encryption-key-min-32-chars-for-testing-purposes
JWT_ACCESS_SECRET=development-jwt-access-secret-change-in-production-min-32
JWT_REFRESH_SECRET=development-jwt-refresh-secret-change-in-production-min-32
PORT=3001
```

---

## Test Scenarios

### Test 1: Dashboard UI

**Amaç:** Credential giriş formunu test et

**Adımlar:**

1. API ve Web başlat:

```bash
# Terminal 1
cd apps/api
pnpm dev

# Terminal 2
cd apps/web
pnpm dev
```

2. Tarayıcıda aç: `http://localhost:3000`

3. Login: `admin@bullvar.com` / `admin`

4. Navigate: Dashboard → Integrations → ISSmanager

5. **Beklenen Durum:**
   - "ISSmanager Bağlantısı Yapılandırılmadı" mesajı
   - Credential giriş formu görünür:
     - Panel URL input
     - Kullanıcı Adı input
     - Şifre input
     - "Bağlantıyı Kaydet" butonu

6. **Test Giriş:**
   - Panel URL: `https://demo.issmanager.com` (veya gerçek URL)
   - Kullanıcı Adı: `testuser`
   - Şifre: `testpass123`
   - "Bağlantıyı Kaydet" tıkla

7. **Beklenen Sonuç:**
   - Alert: "ISSmanager bağlantısı başarıyla yapılandırıldı!"
   - Sayfa refresh
   - Artık "Otomasyon" bölümü görünür

**PASS Kriteri:** Form çalışıyor, API call yapıyor, config oluşuyor

---

### Test 2: Automation Schedule Management

**Prerequisite:** Test 1'den config mevcut

**Adımlar:**

1. Dashboard → Integrations → ISSmanager

2. "Otomatik Export-Import" bölümünü bul

3. **Varsayılan Durum Kontrolü:**
   - Zamanlama Durumu: "Devre Dışı" veya "Aktif"
   - Çalışma Saati: "Her gün 18:00"

4. **Enable Test:**
   - "▶️ Otomasyonu Başlat" tıkla
   - **Beklenen:** Alert success, durum "Aktif"

5. **Schedule Change Test:**
   - "🕐 Saati Değiştir" tıkla
   - Saat: `22`
   - Dakika: `30`
   - **Beklenen:** "Her gün 22:30" görünür

6. **Disable Test:**
   - "⏸️ Otomasyonu Durdur" tıkla
   - **Beklenen:** Durum "Devre Dışı"

**PASS Kriteri:** Enable/disable ve saat değiştirme çalışıyor

---

### Test 3: Manual Trigger

**Prerequisite:** Test 1'den config mevcut

**Adımlar:**

1. Dashboard → Integrations → ISSmanager

2. "⚡ Şimdi Çek" butonunu tıkla

3. **Beklenen (Gerçek Credential Varsa):**
   - Alert: "Otomatik çekim başlatıldı..."
   - Job history table'da yeni satır
   - Status: RUNNING → EXPORTING → IMPORTING → COMPLETED
   - Records Processed: > 0

4. **Beklenen (Credential Yanlışsa):**
   - Job status: FAILED
   - Error message görünür

**PASS Kriteri:** Manual trigger API call yapıyor, job oluşuyor

---

### Test 4: API Endpoints (cURL)

**Login:**

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@bullvar.com",
    "password": "admin"
  }' \
  -c cookies.txt

# cookies.txt'de access_token olmalı
```

**Create Integration Config:**

```bash
curl -X POST http://localhost:3001/api/v1/admin/integrations \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "ISSmanager Test",
    "baseUrl": "https://demo.issmanager.com",
    "apiKey": "testuser:testpass123",
    "timeoutMs": 30000
  }'

# Response: {"id": "...", "name": "ISSmanager Test", ...}
```

**Get Integration Configs:**

```bash
curl http://localhost:3001/api/v1/admin/integrations \
  -b cookies.txt

# Response: [{"id": "...", "name": "ISSmanager Test", ...}]
```

**Trigger Manual Run:**

```bash
INTEGRATION_ID="<integration-id-from-above>"

curl -X POST http://localhost:3001/api/v1/automation/integrations/$INTEGRATION_ID/trigger \
  -b cookies.txt

# Response: {"success": true, "message": "Otomatik çekim başlatıldı", "job": {...}}
```

**Get Schedule:**

```bash
curl http://localhost:3001/api/v1/automation/integrations/$INTEGRATION_ID/schedule \
  -b cookies.txt

# Response: {"success": true, "schedule": {...}}
```

**Update Schedule:**

```bash
curl -X PATCH http://localhost:3001/api/v1/automation/integrations/$INTEGRATION_ID/schedule \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "cronExpression": "30 22 * * *",
    "isEnabled": true
  }'

# Response: {"success": true, "message": "...", "schedule": {...}}
```

**Get Job History:**

```bash
curl "http://localhost:3001/api/v1/automation/integrations/$INTEGRATION_ID/jobs?limit=10" \
  -b cookies.txt

# Response: {"success": true, "jobs": [...], "count": 10}
```

**PASS Kriteri:** Tüm endpoint'ler 200/201/202 dönüyor

---

### Test 5: Scheduler Activation

**Prerequisite:** API running, config enabled

**Adımlar:**

1. API loglarını izle:

```bash
cd apps/api
pnpm dev | grep -i "scheduler\|automation"
```

2. **Beklenen Loglar:**

```
[AutomationModule] Starting automation scheduler...
[SchedulerService] Found 1 active schedule(s)
[SchedulerService] Scheduling job for integration <id>: 0 18 * * *
[SchedulerService] Job scheduled successfully: <schedule-id>
[SchedulerService] Automation scheduler started successfully
```

3. **Test Scheduled Run (Time Travel):**
   - Saati 17:59'a ayarla (manuel değil, zamanı değiştir)
   - Veya schedule'ı 1 dakika sonrasına ayarla:

   ```bash
   # Şu anki saat: 15:30
   # Schedule'ı 15:31'e ayarla
   curl -X PATCH http://localhost:3001/api/v1/automation/integrations/$INTEGRATION_ID/schedule \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{
       "cronExpression": "31 15 * * *"
     }'
   ```

4. **1 dakika sonra loglarda:**

```
[SchedulerService] Executing scheduled job for integration: <id>
[AutomationService] Executing job: <job-id>
[ISSManagerAutomationWorker] Starting automation for job <job-id>
```

**PASS Kriteri:** Scheduler zamanında job tetikliyor

---

### Test 6: Import Handoff

**Prerequisite:** Gerçek ISSmanager credentials, successful export

**Adımlar:**

1. Manuel trigger yap (Test 3)

2. Loglarda izle:

```
[ISSManagerAutomationWorker] Starting automation for job <job-id>
[ISSManagerAutomationWorker] Navigated to ISSmanager panel
[ISSManagerAutomationWorker] Login successful
[ISSManagerAutomationWorker] Navigated to export page
[ISSManagerAutomationWorker] Downloaded file: /temp/downloads/issmanager-export-<job-id>.csv
[ISSManagerAutomationWorker] Moved to staging: /temp/staging/issmanager-export-<job-id>.csv
[ISSManagerAutomationWorker] Triggering import for file: ...
[ImportProcessorService] Creating batch for ISSMANAGER_EXPORT
[ImportProcessorService] Processing 1250 rows
[ImportProcessorService] Batch completed: 1248 succeeded, 2 failed
[ISSManagerAutomationWorker] Import completed: 1248 success, 2 failed
[AutomationService] Job <job-id> completed successfully
```

3. Database kontrol:

```sql
SELECT * FROM automation_jobs WHERE id = '<job-id>';
-- status: COMPLETED
-- records_processed: 1250
-- records_succeeded: 1248
-- records_failed: 2

SELECT * FROM import_batches WHERE id = '<batch-id>';
-- source_type: ISSMANAGER_EXPORT
-- status: COMPLETED
-- total_rows: 1250

SELECT COUNT(*) FROM customers;
-- Yeni customer kayıtları eklenmiş olmalı
```

**PASS Kriteri:** Export → Staging → Import → Database akışı çalışıyor

---

## Troubleshooting

### Problem: "Can't reach database"

**Solution:**

```bash
# PostgreSQL running mi?
docker ps | grep postgres

# Eğer yoksa:
docker start crmanaliz-postgres

# Veya yeni başlat:
docker run -d --name crmanaliz-postgres \
  -e POSTGRES_USER=crmadmin \
  -e POSTGRES_PASSWORD=n1kU9b0d3MxZMHgl8H0VbvhZqbM5jv \
  -e POSTGRES_DB=crmanaliz \
  -p 5432:5432 \
  postgres:16-alpine
```

### Problem: "Login failed - still on login page"

**Causes:**

- ISSmanager credentials yanlış
- Base URL yanlış
- ISSmanager panel yapısı değişmiş

**Debug:**

```typescript
// Worker'da headless: false yap (geçici)
browser = await chromium.launch({
  headless: false, // Browser'ı görebilirsin
  timeout: 30000,
});
```

Playwright trace ekle:

```typescript
const context = await browser.newContext({
  acceptDownloads: true,
  recordVideo: { dir: 'traces/' },
});
```

### Problem: "Import failed: File not found"

**Check:**

```bash
ls -la temp/staging/
# Dosya orada mı?

# Permissions
chmod 755 temp/
chmod 755 temp/staging/
```

### Problem: "Scheduler not triggering"

**Debug:**

```bash
# Aktif schedule var mı?
curl http://localhost:3001/api/v1/automation/integrations/$INTEGRATION_ID/schedule \
  -b cookies.txt

# isEnabled: true olmalı

# Loglar
tail -f apps/api/logs/* | grep -i scheduler
```

---

## Success Criteria

### Minimum (PARTIAL)

- ✅ Dashboard UI çalışıyor
- ✅ Credential form çalışıyor
- ✅ Manual trigger API call yapıyor
- ✅ Schedule update API call yapıyor
- ✅ Scheduler başlıyor (log'da)
- ✅ Job history API'si çalışıyor
- ❌ Gerçek credential yok, live test yapılamadı

**STATUS:** PARTIAL - Infrastructure ready, needs credentials

### Full (PASS)

- ✅ Tüm yukarıdakiler +
- ✅ Gerçek ISSmanager login başarılı
- ✅ Export download başarılı
- ✅ Import processing başarılı
- ✅ RecordsProcessed > 0
- ✅ RecordsSucceeded > 0
- ✅ Database'de yeni customer kayıtları

**STATUS:** PASS - End-to-end working

---

## Next Steps After Testing

1. **Production Deployment:**

   ```bash
   # Build
   pnpm build

   # Environment variables (production)
   # .env.production ile güncellenecek

   # Database migration
   cd apps/api
   pnpm prisma migrate deploy

   # Start
   pm2 start ecosystem.config.js
   ```

2. **Monitoring:**
   - Automation job success rate
   - Scheduler run times
   - Import errors
   - Disk space (staging files)

3. **Maintenance:**
   - Staging cleanup (eski dosyaları sil)
   - Log rotation
   - Database backup
   - Credential rotation

---

## Contact

**Questions:** System Administrator
**Documentation:** See `docs/releases/CRM-ANALIZ-ISSMANAGER-FULL-AUTO-SYNC-054C.md`
**Support:** [Internal Issue Tracker]

---

**Last Updated:** 2026-03-30
**Version:** 1.0
**Status:** Ready for Credential Activation
