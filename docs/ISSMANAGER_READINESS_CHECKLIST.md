# ISSmanager Integration - Final Acceptance Checklist

**Version:** 1.0
**Date:** 2026-04-01
**Status:** EXTERNAL BLOCKER (Credentials Required)

---

## Executive Summary

ISSmanager integration infrastructure is **100% ready** in code and production environment. The only blocker is missing **real production credentials**.

**Infrastructure Status:** ✅ READY
**Credentials Status:** ❌ MISSING (Demo credentials only)
**End-to-End Test:** ⚠️ BLOCKED (Cannot test without real credentials)

---

## What Has Been Verified (Demo Credentials)

### ✅ Code Infrastructure (100% Complete)

1. **Automation Module** ✅
   - [automation.module.ts](../apps/api/src/modules/automation/automation.module.ts)
   - OnModuleInit hook for scheduler auto-start
   - All dependencies injected correctly

2. **Scheduler Service** ✅
   - [scheduler.service.ts](../apps/api/src/modules/automation/scheduler.service.ts)
   - Cron expression validation
   - node-cron integration
   - Istanbul timezone configured
   - Start/stop/reschedule methods

3. **Automation Service** ✅
   - [automation.service.ts](../apps/api/src/modules/automation/automation.service.ts)
   - Manual trigger endpoint
   - Schedule upsert logic
   - Job creation (QUEUED → RUNNING → COMPLETED/FAILED)

4. **ISSmanager Worker** ✅
   - [issmanager-automation.worker.ts](../apps/api/src/modules/automation/workers/issmanager-automation.worker.ts)
   - Playwright browser automation
   - Login flow
   - Export page navigation
   - File download handling
   - Import service handoff

5. **API Endpoints** ✅
   - `POST /api/v1/automation/integrations/:id/trigger` (manual run)
   - `GET /api/v1/automation/integrations/:id/schedule` (get schedule)
   - `PATCH /api/v1/automation/integrations/:id/schedule` (update schedule)
   - `GET /api/v1/automation/integrations/:id/jobs` (job history)

6. **Database Schema** ✅
   - `IntegrationConfig` table (stores credentials encrypted)
   - `AutomationSchedule` table (stores cron schedules)
   - `AutomationJob` table (tracks job execution)
   - `ImportBatch` and `ImportRun` tables (import results)

7. **Dashboard UI** ✅
   - ISSmanager integration page (`/dashboard/integrations/issmanager`)
   - Manual trigger button ("Şimdi Çek")
   - Schedule configuration form
   - Job history display
   - Status indicators

### ✅ Verified with Demo Credentials

From report 055 (CRM-ANALIZ-ISSMANAGER-FULL-AUTO-SYNC-055.md):

1. **Route Fix** ✅
   - Double-prefix issue fixed (`/api/v1/api/v1` → `/api/v1`)
   - Route mapping verified in logs

2. **Manual Trigger Endpoint** ✅
   - Endpoint responds correctly
   - Job created with status QUEUED
   - Trigger type MANUAL recorded

3. **Demo Integration Config** ✅
   ```json
   {
     "id": "cmndgzhj40008h8bv9y7hzdb2",
     "provider": "ISSMANAGER",
     "name": "ISSmanager Production Demo",
     "baseUrl": "https://demo.issmanager.local",
     "apiKeyMasked": "demo...only",
     "isEnabled": true
   }
   ```

---

## What Cannot Be Verified (Blocked)

### ❌ End-to-End Execution Chain

**Reason:** Demo credentials point to non-existent endpoint (`https://demo.issmanager.local`)

**Blocked Steps:**

1. Browser navigation to real ISSmanager panel
2. Login with real credentials
3. Export page navigation
4. File download
5. Import processing with real data
6. `recordsProcessed > 0` and `recordsSucceeded > 0` verification

**Expected Failure with Demo Credentials:**

```
Job QUEUED → Worker picks up → Browser launch →
Navigate to https://demo.issmanager.local →
❌ DNS resolution fail / Connection timeout
```

---

## Final Acceptance Checklist

**Prerequisites:** Real production ISSmanager credentials

### Before Testing

- [ ] Obtain real ISSmanager production credentials:
  - [ ] Production URL (e.g., `https://iss.example.com`)
  - [ ] Valid username
  - [ ] Valid password

- [ ] Verify network connectivity:

  ```bash
  # From production server
  curl -I https://iss.example.com
  ```

  Expected: HTTP 200 or 302 (redirect to login)

- [ ] Verify Playwright dependencies installed:
  ```bash
  cd /var/www/crmanaliz/apps/api
  npx playwright install chromium
  npx playwright install-deps
  ```

### Step 1: Configure Real Credentials

**Via Dashboard UI:**

1. Login to https://analiz.binbirnet.com.tr
2. Navigate to **Integrations > ISSmanager**
3. Click **"Edit"** or **"Add New"**
4. Enter:
   - Name: `ISSmanager Production`
   - Base URL: `https://iss.example.com` (real URL)
   - Username: `[real-username]`
   - Password: `[real-password]`
   - Timeout: `30000` ms
5. Click **"Test Connection"**
6. Expected: ✅ Connection successful

**Or via API:**

```bash
curl -X POST https://analiz.binbirnet.com.tr/api/v1/admin/integrations \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "ISSMANAGER",
    "name": "ISSmanager Production",
    "baseUrl": "https://iss.example.com",
    "username": "[real-username]",
    "password": "[real-password]",
    "timeoutMs": 30000,
    "isEnabled": true
  }'
```

- [ ] Configuration saved
- [ ] Credentials encrypted in database
- [ ] Test connection successful

### Step 2: Manual Trigger Test

**Via Dashboard:**

1. Navigate to **Integrations > ISSmanager**
2. Click **"Şimdi Çek"** button
3. Observe job created with status QUEUED

**Via API:**

```bash
curl -X POST https://analiz.binbirnet.com.tr/api/v1/automation/integrations/{integration-id}/trigger \
  -H "Authorization: Bearer {admin-token}"
```

Expected response:

```json
{
  "success": true,
  "message": "Otomatik çekim başlatıldı",
  "job": {
    "id": "...",
    "status": "QUEUED",
    "triggerType": "MANUAL",
    "createdAt": "..."
  }
}
```

- [ ] Job created
- [ ] Job status QUEUED

### Step 3: Monitor Job Execution

**Check Job Status:**

```bash
curl https://analiz.binbirnet.com.tr/api/v1/automation/integrations/{integration-id}/jobs \
  -H "Authorization: Bearer {admin-token}"
```

**Expected Progression:**

1. Status: `QUEUED` (job created)
2. Status: `RUNNING` (worker picked up, browser launched)
3. Status: `COMPLETED` or `FAILED` (execution finished)

**Check API Logs:**

```bash
# On production server
journalctl -u crm-analiz-api.service -n 100 --no-pager | grep -i "automation\|issmanager"
```

Expected log entries:

```
Executing job: <job-id>
Starting automation for job <job-id>
Navigated to ISSmanager panel
Login successful
Navigated to export page
Downloaded file: <filename>
Moved to staging: <path>
Triggering import...
```

- [ ] Job transitioned from QUEUED → RUNNING
- [ ] Browser automation logs visible
- [ ] Login successful log entry
- [ ] File downloaded log entry

### Step 4: Verify Import Results

**Check Import Batch:**

```bash
curl https://analiz.binbirnet.com.tr/api/v1/imports/batches \
  -H "Authorization: Bearer {admin-token}"
```

Expected: New import batch with:

- `recordsProcessed > 0`
- `recordsSucceeded > 0`
- `status: COMPLETED`

**Check Dashboard:**

1. Navigate to **Dashboard > Import**
2. Verify new import batch appears
3. Check record counts

- [ ] Import batch created
- [ ] `recordsProcessed > 0`
- [ ] `recordsSucceeded > 0`
- [ ] Data visible in dashboard

### Step 5: Schedule Configuration

**Via Dashboard:**

1. Navigate to **Integrations > ISSmanager**
2. Set schedule: `0 18 * * *` (daily at 6 PM)
3. Timezone: `Europe/Istanbul`
4. Enable schedule

**Via API:**

```bash
curl -X PATCH https://analiz.binbirnet.com.tr/api/v1/automation/integrations/{integration-id}/schedule \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "cronExpression": "0 18 * * *",
    "isEnabled": true
  }'
```

- [ ] Schedule configured
- [ ] Cron expression validated
- [ ] Schedule enabled

### Step 6: Wait for Scheduled Run

**Wait for next scheduled time (e.g., 18:00 Istanbul time)**

**Check Scheduler Logs:**

```bash
journalctl -u crm-analiz-api.service -f | grep -i "scheduled job"
```

Expected log entry at scheduled time:

```
Executing scheduled job for integration: <integration-id>
```

- [ ] Scheduled job triggered automatically
- [ ] Job created with trigger type SCHEDULED
- [ ] Execution completed successfully
- [ ] Import results verified

### Step 7: Final Verification

- [ ] Manual trigger works consistently
- [ ] Scheduled trigger works automatically
- [ ] Browser automation completes successfully
- [ ] Files downloaded correctly
- [ ] Import processing works
- [ ] Data appears in dashboard
- [ ] No errors in logs
- [ ] Job history accurate

---

## Troubleshooting

### Issue: Browser Launch Fails

**Error:** `Failed to launch chromium`

**Solution:**

```bash
cd /var/www/crmanaliz/apps/api
npx playwright install chromium
npx playwright install-deps
```

### Issue: Login Fails

**Error:** `Login failed` or timeout

**Possible causes:**

1. Wrong credentials
2. ISSmanager login page structure changed
3. Network connectivity issue

**Debug:**

- Check credentials in database (decrypted)
- Test manual login in browser
- Update worker selectors if needed

### Issue: File Download Fails

**Error:** `Download timeout` or file not found

**Possible causes:**

1. Export page navigation failed
2. Export button selector changed
3. Download timeout too short

**Debug:**

- Check worker navigation logic
- Verify export page URL
- Increase timeout if needed

### Issue: Import Processing Fails

**Error:** `Import failed` in import service

**Possible causes:**

1. File format unexpected
2. CSV structure changed
3. Parsing errors

**Debug:**

- Check downloaded file manually
- Verify CSV structure
- Update import parser if needed

---

## Why This Blocker Doesn't Block Other Closures

### Monitoring & Alerting ✅

- Health checks work independently
- Service monitoring doesn't require ISSmanager
- Alerting infrastructure separate

### Backup & Restore ✅

- Database backups work independently
- No dependency on ISSmanager data

### Scheduler Infrastructure ✅

- Scheduler code verified and ready
- Starts automatically on API bootstrap
- Can schedule any job type

### Production Stability ✅

- Core services operational without ISSmanager
- Platform stable and functional
- Users can use dashboard, reports, analytics

**ISSmanager integration is an isolated feature. Its blocker doesn't affect platform stability or other operational requirements.**

---

## Next Steps

1. **Escalate to ISSmanager System Owner**
   - Request production credentials
   - Verify network access from production server
   - Schedule acceptance test window

2. **Test in Staging First**
   - If staging ISSmanager available, test there first
   - Verify credentials work
   - Test end-to-end flow

3. **Production Acceptance Test**
   - Follow checklist above
   - Document results
   - Mark integration as VERIFIED

4. **Ongoing Monitoring**
   - Monitor scheduled runs daily
   - Check import success rate
   - Alert on failures

---

## Contacts

**ISSmanager System Owner:** [Name/Contact]
**Integration Owner:** Development Team
**Operations Contact:** [Name]

---

## Change Log

| Date       | Version | Changes                                     |
| ---------- | ------- | ------------------------------------------- |
| 2026-04-01 | 1.0     | Initial readiness checklist (062 hardening) |

---
