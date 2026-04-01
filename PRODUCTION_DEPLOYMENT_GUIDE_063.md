# CRM-ANALIZ-LIVE-HARDENING-VERIFY-063: Production Deployment Guide

**Target:** Production server (analiz.binbirnet.com.tr)
**User:** deploy
**Path:** /var/www/crmanaliz
**Branch:** feature/core-implementation

---

## Prerequisites Checklist

- [ ] SSH access to production server
- [ ] deploy user permissions
- [ ] sudo access (for crontab -e -u deploy)
- [ ] PostgreSQL client tools installed (pg_dump, pg_isready)
- [ ] mail command installed (optional, for email alerts)

---

## STEP 1: Connect to Production

```bash
ssh deploy@analiz.binbirnet.com.tr
```

**Verify:**

```bash
whoami
# Expected: deploy

pwd
# Expected: /home/deploy or similar

sudo -l
# Expected: should show crontab permissions
```

---

## STEP 2: Navigate to Repository

```bash
cd /var/www/crmanaliz
```

**Verify:**

```bash
pwd
# Expected: /var/www/crmanaliz

ls -la
# Expected: apps/, docs/, scripts/, package.json, etc.

git status
# Expected: clean working tree or known state
```

---

## STEP 3: Pull Latest Changes

```bash
git fetch origin
git checkout feature/core-implementation
git pull origin feature/core-implementation
```

**Expected Output:**

```
Updating f80aac0..4743597
Fast-forward
 docs/ISSMANAGER_READINESS_CHECKLIST.md            |  473 +++++
 docs/ops/DEPLOYMENT_CHECKLIST.md                  |  259 +++
 docs/ops/MONITORING_RUNBOOK.md                    |  420 +++++
 docs/releases/CRM-ANALIZ-HARDENING-CLOSURE-062.md | 1945 +++++++++++++++++++++
 docs/releases/CRM-ANALIZ-STATUS-AUDIT-061.md      | 1071 ++++++++++++
 scripts/backup-postgres-daily.sh                  |  118 ++
 scripts/health-monitor.sh                         |  178 ++
 scripts/restore-postgres-backup.sh                |  153 ++
 8 files changed, 4617 insertions(+)
```

**Verify Commit:**

```bash
git log -1 --oneline
# Expected: 4743597 docs: add CRM-ANALIZ-STATUS-AUDIT-061 comprehensive production audit report
# or: 975582b feat(ops): add production monitoring, backup, and hardening infrastructure
```

**Verify Files Exist:**

```bash
ls -l scripts/health-monitor.sh
ls -l scripts/backup-postgres-daily.sh
ls -l scripts/restore-postgres-backup.sh
ls -l docs/ops/MONITORING_RUNBOOK.md

# Expected: all files exist
```

---

## STEP 4: Set Script Permissions

```bash
chmod +x scripts/health-monitor.sh
chmod +x scripts/backup-postgres-daily.sh
chmod +x scripts/restore-postgres-backup.sh
```

**Verify:**

```bash
ls -l scripts/*.sh | grep health-monitor
ls -l scripts/*.sh | grep backup-postgres
ls -l scripts/*.sh | grep restore-postgres

# Expected: -rwxr-xr-x for all scripts
```

---

## STEP 5: Create Log Directories

```bash
sudo mkdir -p /var/log/crmanaliz
sudo chown -R deploy:deploy /var/log/crmanaliz
sudo chmod 755 /var/log/crmanaliz
```

**Verify:**

```bash
ls -ld /var/log/crmanaliz
# Expected: drwxr-xr-x ... deploy deploy ... /var/log/crmanaliz
```

---

## STEP 6: Create Backup Directory

```bash
sudo mkdir -p /var/backups/crmanaliz/postgres
sudo chown -R deploy:deploy /var/backups/crmanaliz
sudo chmod 755 /var/backups/crmanaliz
```

**Verify:**

```bash
ls -ld /var/backups/crmanaliz/postgres
# Expected: drwxr-xr-x ... deploy deploy ... /var/backups/crmanaliz/postgres
```

---

## STEP 7: Test Health Monitor (Manual Run)

```bash
./scripts/health-monitor.sh
```

**Expected Output:**

```
[TIMESTAMP] =========================================
[TIMESTAMP] CRM Analiz Health Monitor - Starting
[TIMESTAMP] =========================================
[TIMESTAMP] Checking API health...
[TIMESTAMP] ✅ API health check: PASS (HTTP 200)
[TIMESTAMP] Checking Web health...
[TIMESTAMP] ✅ Web health check: PASS (HTTP 200)
[TIMESTAMP] Checking PostgreSQL connection...
[TIMESTAMP] ✅ PostgreSQL check: PASS
[TIMESTAMP] Checking disk usage...
[TIMESTAMP] ✅ Disk usage check: PASS (XX%)
[TIMESTAMP] Checking systemd services...
[TIMESTAMP] ✅ Service crm-analiz-api.service: RUNNING
[TIMESTAMP] ✅ Service crm-analiz-web.service: RUNNING
[TIMESTAMP] ✅ Service postgresql@16-main.service: RUNNING
[TIMESTAMP] ✅ Service nginx.service: RUNNING
[TIMESTAMP] =========================================
[TIMESTAMP] ✅ All health checks PASSED
[TIMESTAMP] =========================================
```

**Verify Log File:**

```bash
cat /var/log/crmanaliz/health-monitor.log
# Expected: same output as above
```

**Exit Code:**

```bash
echo $?
# Expected: 0 (success)
```

**If Any Check Fails:**

- Document which check failed
- Document error message
- Check service status: `systemctl status <service-name>`
- Check network: `curl -I https://analiz.binbirnet.com.tr/api/v1/health`
- Check database: `pg_isready -h localhost -p 5432 -d crmanaliz`

---

## STEP 8: Test Backup Script (Manual Run)

```bash
./scripts/backup-postgres-daily.sh
```

**Expected Output:**

```
[TIMESTAMP] =========================================
[TIMESTAMP] CRM Analiz PostgreSQL Backup - Starting
[TIMESTAMP] =========================================
[TIMESTAMP] Starting backup: crmanaliz@localhost:5432
[TIMESTAMP] Target file: /var/backups/crmanaliz/postgres/crmanaliz_YYYY-MM-DD_HH-MM-SS.sql.gz
[TIMESTAMP] ✅ Backup completed successfully: /var/backups/crmanaliz/postgres/crmanaliz_YYYY-MM-DD_HH-MM-SS.sql.gz (XXX MB)
[TIMESTAMP] Applying retention policy: keep backups for 7 days
[TIMESTAMP] No old backups to delete
[TIMESTAMP] =========================================
[TIMESTAMP] Backup Summary:
[TIMESTAMP]   - Current backups: 1
[TIMESTAMP]   - Total size: XXX MB
[TIMESTAMP]   - Latest: /var/backups/crmanaliz/postgres/crmanaliz_YYYY-MM-DD_HH-MM-SS.sql.gz
[TIMESTAMP] =========================================
[TIMESTAMP] ✅ Backup process completed successfully
[TIMESTAMP] =========================================
```

**Verify Backup File:**

```bash
ls -lh /var/backups/crmanaliz/postgres/
# Expected: crmanaliz_YYYY-MM-DD_HH-MM-SS.sql.gz with reasonable size (> 1MB)

# Test gzip integrity
gunzip -t /var/backups/crmanaliz/postgres/crmanaliz_*.sql.gz
echo $?
# Expected: 0 (valid gzip)
```

**Verify Log File:**

```bash
cat /var/log/crmanaliz/backup.log
# Expected: backup process log
```

**If Backup Fails:**

- Check PostgreSQL connection: `pg_isready -h localhost -p 5432 -d crmanaliz`
- Check pg_dump availability: `which pg_dump`
- Check permissions: `ls -ld /var/backups/crmanaliz/postgres`
- Check PGPASSWORD environment or .pgpass file

---

## STEP 9: Install Cron Jobs

**Open Crontab:**

```bash
crontab -e
```

**Add These Lines:**

```
# CRM Analiz Health Monitor (every 5 minutes)
*/5 * * * * /var/www/crmanaliz/scripts/health-monitor.sh

# CRM Analiz PostgreSQL Backup (daily at 2 AM)
0 2 * * * /var/www/crmanaliz/scripts/backup-postgres-daily.sh
```

**Save and Exit** (Ctrl+O, Enter, Ctrl+X for nano)

**Verify Crontab:**

```bash
crontab -l
# Expected: should show both lines above
```

---

## STEP 10: Wait and Verify Cron Execution

**Wait 5-10 minutes for first health check run**

**Check Log Growth:**

```bash
watch -n 30 "tail -20 /var/log/crmanaliz/health-monitor.log"
```

**Expected:** New entries every 5 minutes

**Verify Cron is Running:**

```bash
grep CRON /var/log/syslog | tail -20
# or
journalctl -u cron | tail -20

# Expected: lines showing cron executing health-monitor.sh
```

---

## STEP 11: Verify Scheduler Runtime

**Check API Service Logs for Scheduler Startup:**

```bash
journalctl -u crm-analiz-api.service | grep -i "scheduler" | tail -20
```

**Expected Output:**

```
[AutomationModule] Starting automation scheduler...
[SchedulerService] Found N active schedule(s)
[SchedulerService] Automation scheduler started successfully
```

**If "Found 0 active schedules":**

- This is normal if no ISSmanager schedules configured yet
- Scheduler infrastructure is working
- Status: PASS (infrastructure), PARTIAL (no active jobs)

**Check for Scheduler Errors:**

```bash
journalctl -u crm-analiz-api.service | grep -i "Failed to start scheduler"
# Expected: no output (no errors)
```

---

## STEP 12: Test Manual Automation Trigger (Optional - Requires Auth)

**Get Admin JWT Token:**

```bash
# Login via API
curl -X POST https://analiz.binbirnet.com.tr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bullvar.com","password":"YOUR_PASSWORD"}' \
  | jq -r '.accessToken'

# Save token to variable
TOKEN="<paste-token-here>"
```

**Get Integration ID:**

```bash
curl -s https://analiz.binbirnet.com.tr/api/v1/admin/integrations \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.[0].id'

# Save integration ID
INTEGRATION_ID="<paste-id-here>"
```

**Trigger Manual Run:**

```bash
curl -X POST https://analiz.binbirnet.com.tr/api/v1/automation/integrations/$INTEGRATION_ID/trigger \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Otomatik çekim başlatıldı",
  "job": {
    "id": "<job-id>",
    "status": "QUEUED",
    "triggerType": "MANUAL",
    "createdAt": "<timestamp>"
  }
}
```

**Check Job Execution:**

```bash
# Wait 5-10 seconds, then check job status
curl -s https://analiz.binbirnet.com.tr/api/v1/automation/integrations/$INTEGRATION_ID/jobs \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.[] | {id, status, triggerType, createdAt}'
```

**Expected:** Job status should transition from QUEUED → RUNNING → COMPLETED or FAILED

**Check API Logs for Execution:**

```bash
journalctl -u crm-analiz-api.service -n 50 | grep -i "automation\|issmanager"
```

**Expected Log Entries:**

```
Executing job: <job-id>
Starting automation for job <job-id>
[... execution logs ...]
```

**If Job Stays QUEUED:**

- Worker may not be picking up jobs
- Check for errors in API logs
- Status: PARTIAL (job created but not executing)

**If Job Fails with Demo Credentials:**

- This is expected (per 055/062 reports)
- Infrastructure working, credentials missing
- Status: PASS (infrastructure), EXTERNAL_BLOCKER (credentials)

---

## STEP 13: Verify Operational Health

**Check Disk Usage:**

```bash
df -h /
df -h /var/backups
df -h /var/log
```

**Check Service Status:**

```bash
systemctl status crm-analiz-api.service
systemctl status crm-analiz-web.service
systemctl status postgresql@16-main.service
systemctl status nginx.service
```

**Check API Health:**

```bash
curl -s https://analiz.binbirnet.com.tr/api/v1/health | jq
```

**Check Web:**

```bash
curl -I https://analiz.binbirnet.com.tr
```

---

## STEP 14: Document Results

**Create Verification Report:**

```bash
cat > /tmp/hardening-verification-results.txt <<EOF
===========================================
CRM Analiz Hardening Verification Results
Date: $(date)
Operator: $(whoami)
Server: $(hostname)
===========================================

1. Git Status:
$(cd /var/www/crmanaliz && git log -1 --oneline)

2. Scripts Deployed:
$(ls -l /var/www/crmanaliz/scripts/*.sh)

3. Crontab Installed:
$(crontab -l | grep -A1 "CRM Analiz")

4. Health Monitor Status:
$(tail -10 /var/log/crmanaliz/health-monitor.log)

5. Backup Status:
$(ls -lh /var/backups/crmanaliz/postgres/ | tail -5)

6. Scheduler Status:
$(journalctl -u crm-analiz-api.service | grep -i "scheduler" | tail -5)

7. Service Health:
API: $(systemctl is-active crm-analiz-api.service)
Web: $(systemctl is-active crm-analiz-web.service)
DB: $(systemctl is-active postgresql@16-main.service)
Nginx: $(systemctl is-active nginx.service)

===========================================
EOF

cat /tmp/hardening-verification-results.txt
```

**Save Results:**
Copy output and paste into verification report in Windows environment.

---

## Troubleshooting

### Health Monitor Fails

**Check API:**

```bash
curl -I https://analiz.binbirnet.com.tr/api/v1/health
```

**Check Web:**

```bash
curl -I https://analiz.binbirnet.com.tr
```

**Check Database:**

```bash
pg_isready -h localhost -p 5432 -d crmanaliz
```

**Check Services:**

```bash
systemctl status crm-analiz-api.service
systemctl status crm-analiz-web.service
```

### Backup Fails

**Check PostgreSQL:**

```bash
pg_isready -h localhost -p 5432 -d crmanaliz
```

**Check pg_dump:**

```bash
which pg_dump
pg_dump --version
```

**Check Permissions:**

```bash
ls -ld /var/backups/crmanaliz/postgres
```

**Test pg_dump manually:**

```bash
pg_dump -h localhost -p 5432 -U crmanaliz -d crmanaliz --format=plain | head -20
```

### Cron Not Running

**Check Cron Service:**

```bash
systemctl status cron
```

**Check Crontab:**

```bash
crontab -l
```

**Check Syslog:**

```bash
grep CRON /var/log/syslog | tail -20
```

---

## Success Criteria

**Monitoring:**

- [ ] Health monitor script runs manually without errors
- [ ] Log file created: /var/log/crmanaliz/health-monitor.log
- [ ] All checks (API, Web, DB, Disk, Services) PASS
- [ ] Cron job installed and verified
- [ ] Cron execution confirmed (5-min interval)

**Backup:**

- [ ] Backup script runs manually without errors
- [ ] Backup file created: /var/backups/crmanaliz/postgres/crmanaliz\_\*.sql.gz
- [ ] Backup file size reasonable (> 1MB)
- [ ] gzip integrity verified
- [ ] Log file created: /var/log/crmanaliz/backup.log
- [ ] Cron job installed (daily 2 AM)

**Scheduler:**

- [ ] Scheduler startup logs found in API service logs
- [ ] "Starting automation scheduler..." log entry present
- [ ] "Automation scheduler started successfully" log entry present
- [ ] No "Failed to start scheduler" errors

**Manual Trigger:**

- [ ] Trigger endpoint responds correctly
- [ ] Job created with QUEUED status
- [ ] Job ID returned in response

**Services:**

- [ ] All systemd services active (API, Web, DB, Nginx)
- [ ] API health endpoint returns 200 OK
- [ ] Web application accessible

---

## Rollback (If Needed)

**Remove Cron Jobs:**

```bash
crontab -e
# Delete the two CRM Analiz lines
```

**Revert Git:**

```bash
cd /var/www/crmanaliz
git reset --hard f80aac0  # Previous commit before hardening
```

**No Service Restart Needed** (scripts are external to running services)

---

## Next Steps After Verification

1. Document results in CRM-ANALIZ-LIVE-HARDENING-VERIFY-063.md
2. Update status: PASS / PARTIAL / FAIL for each component
3. Make final closure decision
4. Commit verification report to repository

---
