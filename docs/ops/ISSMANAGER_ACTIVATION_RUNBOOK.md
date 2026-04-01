# ISS Manager Integration Activation Runbook

**Document Type**: Operational Runbook
**Audience**: Operations Team, Customer Onboarding
**Status**: Ready for Use
**Last Updated**: 2026-04-01

---

## Overview

This runbook provides step-by-step instructions for activating the ISS Manager integration after real credentials are provided by the customer.

**Prerequisites**:

- CRM Analiz platform deployed and operational
- Access to production dashboard (https://194.15.45.47:3000 or configured URL)
- Real ISS Manager instance URL
- Real ISS Manager API key
- SSH access to production server (for verification)

**Outcome**:

- ISS Manager integration configured with real credentials
- Connection tested and verified
- Automated daily sync operational
- Data flowing from ISS Manager to CRM Analiz

---

## Step 1: Gather Required Information

Obtain the following from customer/ISS Manager administrator:

**Required Credentials**:

- [ ] ISS Manager instance URL (e.g., `https://issmanager.customer.com/api`)
- [ ] ISS Manager API key or authentication credentials
- [ ] Timezone confirmation (default: Europe/Istanbul)

**Optional Configuration**:

- [ ] Sync schedule (default: daily at 18:00 Istanbul)
- [ ] Timeout value (default: 30000ms / 30 seconds)

---

## Step 2: Access CRM Analiz Dashboard

1. Navigate to production dashboard:

   ```
   https://194.15.45.47:3000
   ```

   (or configured production URL)

2. Login with admin credentials:
   - Username: `admin@crmanaliz.local`
   - Password: [provided during platform setup]

3. Navigate to Integrations page:
   - Click "Integrations" in left sidebar
   - Or go to `/integrations` path

---

## Step 3: Configure ISS Manager Integration

1. Locate "ISS Manager CRM Integration" in integrations list

2. Click "Edit" or "Configure" button

3. Update the following fields:

   **Base URL**:
   - Enter real ISS Manager API endpoint
   - Format: `https://domain.com/api`
   - Example: `https://issmanager.customer.com/api`

   **API Key**:
   - Enter real ISS Manager API key
   - Will be encrypted automatically on save
   - Encryption: AES-256-GCM with production ENCRYPTION_KEY

   **Timeout** (optional):
   - Default: 30000 (30 seconds)
   - Increase if large data volumes expected
   - Decrease if faster failure detection needed

4. **Important**: Verify URL format
   - Must start with `https://`
   - Must end with `/api` (or correct ISS Manager endpoint path)
   - No trailing slash
   - No placeholders like "example.com"

---

## Step 4: Test Connection

1. Click "Test Connection" button in dashboard

2. Wait for test result (10-30 seconds)

3. **Expected Results**:

   **✅ Success**:

   ```
   Status: SUCCESS
   Message: "Connection successful"
   Response time: <time>ms
   ```

   - Proceed to Step 5

   **❌ DNS Resolution Failure**:

   ```
   Error: ERR_NAME_NOT_RESOLVED
   ```

   - **Fix**: Verify domain name is correct and accessible
   - Check: Run `ping <domain>` from production server
   - Check: Firewall allows outbound HTTPS (port 443)

   **❌ Connection Refused**:

   ```
   Error: ERR_CONNECTION_REFUSED
   ```

   - **Fix**: Verify ISS Manager service is running
   - Check: Port is correct (usually 443 for HTTPS)
   - Check: Server firewall allows connection

   **❌ SSL Certificate Error**:

   ```
   Error: ERR_CERT_AUTHORITY_INVALID or ERR_CERT_DATE_INVALID
   ```

   - **Fix**: Ensure SSL certificate is valid and not expired
   - Check: `openssl s_client -connect <domain>:443`

   **❌ Authentication Failed**:

   ```
   Error: 401 Unauthorized or 403 Forbidden
   ```

   - **Fix**: Verify API key is correct
   - Check: API key has necessary permissions in ISS Manager
   - Check: API key is not expired

   **❌ Endpoint Not Found**:

   ```
   Error: 404 Not Found
   ```

   - **Fix**: Verify endpoint path (should end with `/api` or correct path)
   - Check: ISS Manager API documentation for correct path

4. If test fails, review error message and apply fixes above

5. Repeat test until successful

---

## Step 5: Save and Enable Integration

1. Click "Save" button (only enabled after successful test)

2. Verify configuration is enabled:
   - Check "Enabled" toggle is ON
   - Status should change to "ACTIVE"

3. Note the confirmation message:
   ```
   Integration configured successfully.
   Next scheduled run: <timestamp>
   ```

---

## Step 6: Verify Database Configuration

SSH into production server and verify integration config:

```bash
ssh root@194.15.45.47

sudo -u postgres psql -d crmanaliz -c "
  SELECT
    id,
    provider,
    name,
    base_url,
    status,
    is_enabled,
    TO_CHAR(last_test_at, 'YYYY-MM-DD HH24:MI:SS') as last_test,
    last_test_status
  FROM integration_configs
  WHERE provider = 'ISSMANAGER';
"
```

**Expected Output**:

```
id:                cmxissmanager00000001
provider:          ISSMANAGER
name:              ISS Manager CRM Integration
base_url:          https://issmanager.customer.com/api  ← REAL URL
status:            ACTIVE  ← Changed from PENDING
is_enabled:        t
last_test_at:      2026-04-01 XX:XX:XX  ← Recent timestamp
last_test_status:  SUCCESS
```

**✅ Proceed if**:

- base_url is real (not example.com)
- status is ACTIVE
- last_test_status is SUCCESS

**❌ Stop if**:

- base_url still shows placeholder
- status is PENDING or FAILED
- last_test_status is FAILED or NULL

---

## Step 7: Check Automation Schedule

Verify the automation schedule is active:

```bash
sudo -u postgres psql -d crmanaliz -c "
  SELECT
    id,
    cron_expression,
    timezone,
    is_enabled,
    TO_CHAR(last_run_at, 'YYYY-MM-DD HH24:MI:SS TZ') as last_run,
    last_run_status
  FROM automation_schedules
  WHERE integration_config_id = 'cmxissmanager00000001';
"
```

**Expected Output**:

```
id:               cmxschedule00000001
cron_expression:  0 18 * * *  ← Daily at 18:00
timezone:         Europe/Istanbul
is_enabled:       t
last_run_at:      2026-04-01 XX:XX:XX
last_run_status:  FAILED (from placeholder) or null
```

**✅ Proceed if**:

- cron_expression is correct (default: 0 18 \* \* \*)
- timezone is correct (Europe/Istanbul)
- is_enabled is true

---

## Step 8: Force Scheduled Execution (Optional but Recommended)

To verify the integration works immediately (instead of waiting for 18:00):

1. **Update cron to fire in 2 minutes**:

   ```bash
   # Get current time in Istanbul timezone
   TZ='Europe/Istanbul' date '+%H:%M'
   # Example output: 14:25

   # Calculate time 2 minutes from now
   # If current is 14:25, set cron to: 27 14 * * *

   sudo -u postgres psql -d crmanaliz -c "
     UPDATE automation_schedules
     SET cron_expression = '<MM> <HH> * * *',
         updated_at = NOW()
     WHERE id = 'cmxschedule00000001';
   "
   ```

2. **Restart API to pick up new schedule**:

   ```bash
   systemctl restart crm-analiz-api.service

   # Verify scheduler picked up new time
   journalctl -u crm-analiz-api.service -n 20 --no-pager | grep "Scheduling job"
   ```

   **Expected log**:

   ```
   [SchedulerService] Scheduling job for integration cmxissmanager00000001: <MM> <HH> * * *
   [SchedulerService] Job scheduled successfully: cmxschedule00000001
   ```

3. **Wait for execution** (2 minutes)

4. **Check job result**:

   ```bash
   sudo -u postgres psql -d crmanaliz -c "
     SELECT
       id,
       trigger_type,
       status,
       TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created,
       records_processed,
       records_succeeded,
       records_failed,
       import_batch_id,
       LEFT(error_message, 200) as error_short
     FROM automation_jobs
     ORDER BY created_at DESC
     LIMIT 1;
   "
   ```

5. **Restore production cron**:

   ```bash
   sudo -u postgres psql -d crmanaliz -c "
     UPDATE automation_schedules
     SET cron_expression = '0 18 * * *',
         updated_at = NOW()
     WHERE id = 'cmxschedule00000001';
   "

   systemctl restart crm-analiz-api.service
   ```

---

## Step 9: Verify Execution Results

### Check Latest Job

```bash
sudo -u postgres psql -d crmanaliz -c "
  SELECT
    j.id,
    j.trigger_type,
    j.status,
    j.created_at,
    j.files_processed,
    j.records_processed,
    j.records_succeeded,
    j.records_failed,
    j.import_batch_id,
    j.error_message
  FROM automation_jobs j
  ORDER BY j.created_at DESC
  LIMIT 1;
"
```

### Result Scenarios

#### ✅ Scenario A: Complete Success

```
status: COMPLETED
files_processed: 1
records_processed: <N>
records_succeeded: <N>
records_failed: 0
import_batch_id: <uuid>
error_message: NULL
```

**Next Steps**:

- Proceed to Step 10 (Verify Data)
- Integration is fully operational

#### ⚠️ Scenario B: Auth Success, Parse Failure

```
status: FAILED
error_message: "Invalid CSV format" or "Missing required field"
```

**Troubleshooting**:

- Check worker logs: `journalctl -u crm-analiz-api.service | grep ISSManagerAutomationWorker`
- CSV format may differ from expected
- Contact development team to adjust parser

#### ⚠️ Scenario C: Auth Failed

```
status: FAILED
error_message: "401 Unauthorized" or "403 Forbidden" or "Invalid API key"
```

**Troubleshooting**:

- Verify API key is correct
- Check API key permissions in ISS Manager
- Re-test connection via dashboard
- Update credentials if needed

#### ⚠️ Scenario D: Network/Timeout Error

```
status: FAILED
error_message: "ERR_CONNECTION_REFUSED" or "Timeout exceeded"
```

**Troubleshooting**:

- Check ISS Manager server is running
- Verify firewall allows outbound HTTPS
- Increase timeout if needed (dashboard or database)

---

## Step 10: Verify Imported Data

If job status is COMPLETED:

### Check Import Batch

```bash
sudo -u postgres psql -d crmanaliz -c "
  SELECT
    id,
    source_type,
    status,
    file_path,
    total_records,
    successful_records,
    failed_records,
    LEFT(validation_errors::text, 200) as errors_short
  FROM import_batches
  WHERE id = '<import_batch_id_from_job>';
"
```

**Expected**:

```
status: COMPLETED
total_records: <N>
successful_records: <N>
failed_records: 0 (or small number)
```

### Check Imported Customers

```bash
sudo -u postgres psql -d crmanaliz -c "
  SELECT COUNT(*) as customer_count
  FROM customers
  WHERE import_batch_id = '<import_batch_id>';
"
```

**Expected**:

- Count matches `successful_records` from import batch

### Check for Duplicates (Idempotency Test)

```bash
sudo -u postgres psql -d crmanaliz -c "
  SELECT customer_code, COUNT(*) as duplicate_count
  FROM customers
  GROUP BY customer_code
  HAVING COUNT(*) > 1;
"
```

**Expected**:

- Zero results (no duplicates)
- If duplicates exist, check import logic

---

## Step 11: Monitor Next Scheduled Run

1. **Check next run time**:
   - Default: Daily at 18:00 Istanbul (15:00 UTC)

2. **Monitor logs before scheduled time**:

   ```bash
   journalctl -u crm-analiz-api.service -f | grep -E '(SchedulerService|AutomationService|ISSManagerAutomationWorker)'
   ```

3. **At 18:00, verify execution**:
   - Check logs for "[SchedulerService] Executing scheduled job"
   - Wait for completion (1-5 minutes depending on data volume)
   - Check job result (repeat Step 9)

4. **Verify writeback fields updated**:

   ```bash
   sudo -u postgres psql -d crmanaliz -c "
     SELECT
       last_sync_at,
       status
     FROM integration_configs
     WHERE provider = 'ISSMANAGER';
   "
   ```

   **Expected**:

   ```
   last_sync_at: <recent timestamp>
   status: ACTIVE
   ```

---

## Step 12: Final Verification Checklist

- [ ] Real credentials configured (not placeholder)
- [ ] Connection test passed
- [ ] Integration status is ACTIVE
- [ ] Schedule is enabled (cron: 0 18 \* \* \*)
- [ ] Forced execution completed successfully (if performed)
- [ ] Authentication succeeded (no 401/403 errors)
- [ ] Data fetched from ISS Manager
- [ ] CSV parsed successfully
- [ ] Records imported to customers table
- [ ] No duplicate customer_codes
- [ ] Import batch status is COMPLETED
- [ ] Next scheduled run configured
- [ ] Production cron restored (if changed)
- [ ] Monitoring in place

---

## Troubleshooting Guide

### Problem: Dashboard Not Accessible

**Symptoms**: Cannot reach https://194.15.45.47:3000

**Checks**:

```bash
systemctl status crm-analiz-web.service
journalctl -u crm-analiz-web.service -n 50
```

**Solution**:

```bash
systemctl restart crm-analiz-web.service
```

### Problem: API Service Down

**Symptoms**: Dashboard shows "API Error" or connection refused

**Checks**:

```bash
systemctl status crm-analiz-api.service
journalctl -u crm-analiz-api.service -n 50
```

**Solution**:

```bash
systemctl restart crm-analiz-api.service
```

### Problem: Scheduled Jobs Not Running

**Symptoms**: Jobs not created at scheduled time

**Checks**:

```bash
# Check scheduler logs
journalctl -u crm-analiz-api.service | grep SchedulerService

# Check schedule in database
sudo -u postgres psql -d crmanaliz -c "
  SELECT id, cron_expression, is_enabled
  FROM automation_schedules;
"
```

**Solution**:

- Verify `is_enabled = true`
- Verify cron expression is valid
- Restart API service

### Problem: Large Data Volumes Cause Timeout

**Symptoms**: Jobs fail with "Timeout exceeded" after 30 seconds

**Solution**:

1. Increase timeout in integration config:

   ```bash
   sudo -u postgres psql -d crmanaliz -c "
     UPDATE integration_configs
     SET timeout_ms = 60000
     WHERE id = 'cmxissmanager00000001';
   "
   ```

2. Restart API service:
   ```bash
   systemctl restart crm-analiz-api.service
   ```

### Problem: Playwright Browser Crashes

**Symptoms**: Jobs fail with "Browser closed" or "Target closed"

**Checks**:

```bash
# Check Playwright dependencies
ls -la /home/deploy/.cache/ms-playwright/

# Check permissions
ls -la /home/deploy/.cache/ms-playwright/ | grep deploy
```

**Solution**:

```bash
# Reinstall Playwright browsers if needed
cd /var/www/crmanaliz/apps/api
npx playwright install chromium
chown -R deploy:deploy /home/deploy/.cache/ms-playwright
```

---

## Success Criteria

Integration activation is complete when:

1. ✅ Real credentials configured (not placeholder domain)
2. ✅ Connection test passed
3. ✅ Integration status = ACTIVE
4. ✅ First successful sync completed
5. ✅ Data visible in customers table
6. ✅ No duplicates created
7. ✅ Automated schedule operational
8. ✅ Monitoring confirmed working

---

## Rollback Procedure

If activation fails and you need to revert:

1. **Disable integration**:

   ```bash
   sudo -u postgres psql -d crmanaliz -c "
     UPDATE automation_schedules
     SET is_enabled = false
     WHERE integration_config_id = 'cmxissmanager00000001';
   "
   ```

2. **Restart API**:

   ```bash
   systemctl restart crm-analiz-api.service
   ```

3. **Verify scheduler disabled**:

   ```bash
   journalctl -u crm-analiz-api.service -n 20 | grep SchedulerService
   ```

   **Expected**: No "Scheduling job" messages for ISS Manager

4. **Restore placeholder** (if needed for testing):
   ```bash
   sudo -u postgres psql -d crmanaliz -c "
     UPDATE integration_configs
     SET base_url = 'https://iss-manager.example.com/api',
         status = 'PENDING'
     WHERE id = 'cmxissmanager00000001';
   "
   ```

---

## Support Contacts

**Platform Issues**:

- Check documentation: `docs/` directory
- Review verification reports: `docs/releases/CRM-ANALIZ-ISSMANAGER-*`

**ISS Manager API Issues**:

- Contact ISS Manager vendor/administrator
- Reference: `docs/ISSMANAGER_INTEGRATION_REQUIREMENTS.md`

---

**Document Version**: 1.0
**Last Updated**: 2026-04-01
**Status**: Ready for operational use
