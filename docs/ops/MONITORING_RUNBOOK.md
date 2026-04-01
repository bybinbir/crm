# CRM Analiz Monitoring & Operations Runbook

**Version:** 1.0
**Last Updated:** 2026-04-01
**Owner:** Operations Team

---

## Overview

This runbook describes monitoring, alerting, and operational procedures for CRM Analiz production environment.

**Production URL:** https://analiz.binbirnet.com.tr
**Architecture:** Native systemd services (Dockerless)
**Server:** Ubuntu Linux + systemd

---

## Health Monitoring

### Automated Health Checks

**Script:** [scripts/health-monitor.sh](../../scripts/health-monitor.sh)

**Checks:**

- API health endpoint (HTTP 200)
- Web application (HTTP 200)
- PostgreSQL connection
- Disk usage (threshold: 85%)
- systemd service status

**Installation:**

```bash
# 1. Make script executable
chmod +x /var/www/crmanaliz/scripts/health-monitor.sh

# 2. Test manually
sudo -u deploy /var/www/crmanaliz/scripts/health-monitor.sh

# 3. Install cron job (runs every 5 minutes)
sudo crontab -e -u deploy
```

Add line:

```
*/5 * * * * /var/www/crmanaliz/scripts/health-monitor.sh
```

**Logs:** `/var/log/crmanaliz/health-monitor.log`

### Email Alerts (Optional)

Configure email alerts by setting environment variables:

```bash
export ALERT_ENABLED=true
export ALERT_EMAIL=ops@example.com
```

Requires `mail` command (install: `sudo apt-get install mailutils`)

---

## Manual Health Checks

### API Health

```bash
curl https://analiz.binbirnet.com.tr/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-04-01T10:00:00.000Z",
  "version": "0.1.0",
  "uptime": 123456.789
}
```

### Web Application

```bash
curl -I https://analiz.binbirnet.com.tr/
```

Expected: `HTTP/1.1 200 OK`

### Database Connection

```bash
pg_isready -h localhost -p 5432 -d crmanaliz
```

Expected: `accepting connections`

### Service Status

```bash
systemctl status crm-analiz-api.service
systemctl status crm-analiz-web.service
systemctl status postgresql@16-main.service
systemctl status nginx.service
```

Expected: `Active: active (running)`

---

## Backup Procedures

### Automated Daily Backup

**Script:** [scripts/backup-postgres-daily.sh](../../scripts/backup-postgres-daily.sh)

**Schedule:** Daily at 2:00 AM
**Retention:** 7 days
**Location:** `/var/backups/crmanaliz/postgres/`

**Installation:**

```bash
# 1. Make script executable
chmod +x /var/www/crmanaliz/scripts/backup-postgres-daily.sh

# 2. Test manually
sudo -u deploy /var/www/crmanaliz/scripts/backup-postgres-daily.sh

# 3. Install cron job
sudo crontab -e -u deploy
```

Add line:

```
0 2 * * * /var/www/crmanaliz/scripts/backup-postgres-daily.sh
```

**Logs:** `/var/log/crmanaliz/backup.log`

### Manual Backup

```bash
cd /var/www/crmanaliz
sudo -u deploy ./scripts/backup-postgres-daily.sh
```

### List Backups

```bash
ls -lh /var/backups/crmanaliz/postgres/
```

### Restore from Backup

**Script:** [scripts/restore-postgres-backup.sh](../../scripts/restore-postgres-backup.sh)

⚠️ **WARNING:** This will DROP and recreate the database!

```bash
# 1. Stop API service
sudo systemctl stop crm-analiz-api.service

# 2. Choose backup file
ls /var/backups/crmanaliz/postgres/

# 3. Restore
sudo -u deploy ./scripts/restore-postgres-backup.sh \
  /var/backups/crmanaliz/postgres/crmanaliz_YYYY-MM-DD_HH-MM-SS.sql.gz

# 4. Start API service
sudo systemctl start crm-analiz-api.service

# 5. Verify
curl https://analiz.binbirnet.com.tr/api/v1/health
```

---

## Service Management

### Start Services

```bash
sudo systemctl start crm-analiz-api.service
sudo systemctl start crm-analiz-web.service
```

### Stop Services

```bash
sudo systemctl stop crm-analiz-api.service
sudo systemctl stop crm-analiz-web.service
```

### Restart Services

```bash
sudo systemctl restart crm-analiz-api.service
sudo systemctl restart crm-analiz-web.service
```

### Check Logs

```bash
# API logs (last 100 lines)
journalctl -u crm-analiz-api.service -n 100 --no-pager

# Web logs (last 100 lines)
journalctl -u crm-analiz-web.service -n 100 --no-pager

# Follow logs (live tail)
journalctl -u crm-analiz-api.service -f
```

### Service Configuration

Service files location: `/etc/systemd/system/`

- `crm-analiz-api.service`
- `crm-analiz-web.service`

After editing service files:

```bash
sudo systemctl daemon-reload
sudo systemctl restart <service-name>
```

---

## Troubleshooting

### API Not Responding

1. Check service status:

   ```bash
   systemctl status crm-analiz-api.service
   ```

2. Check logs for errors:

   ```bash
   journalctl -u crm-analiz-api.service -n 50 --no-pager
   ```

3. Check database connection:

   ```bash
   pg_isready -h localhost -p 5432 -d crmanaliz
   ```

4. Restart service:
   ```bash
   sudo systemctl restart crm-analiz-api.service
   ```

### Web Not Loading

1. Check nginx status:

   ```bash
   systemctl status nginx.service
   ```

2. Check web service status:

   ```bash
   systemctl status crm-analiz-web.service
   ```

3. Check nginx logs:

   ```bash
   tail -50 /var/log/nginx/error.log
   ```

4. Test nginx config:

   ```bash
   sudo nginx -t
   ```

5. Restart services:
   ```bash
   sudo systemctl restart crm-analiz-web.service
   sudo systemctl restart nginx.service
   ```

### Database Connection Issues

1. Check PostgreSQL status:

   ```bash
   systemctl status postgresql@16-main.service
   ```

2. Check PostgreSQL logs:

   ```bash
   tail -50 /var/log/postgresql/postgresql-16-main.log
   ```

3. Test connection manually:

   ```bash
   psql -U crmanaliz -d crmanaliz -h localhost -c "SELECT 1;"
   ```

4. Check disk space:
   ```bash
   df -h /var/lib/postgresql
   ```

### High Disk Usage

1. Check disk usage:

   ```bash
   df -h
   ```

2. Find large files:

   ```bash
   du -sh /var/* | sort -h | tail -10
   ```

3. Clean old logs:

   ```bash
   journalctl --vacuum-time=7d
   ```

4. Clean old backups (older than 7 days):
   ```bash
   find /var/backups/crmanaliz/postgres -name "*.sql.gz" -mtime +7 -delete
   ```

---

## Deployment

See [DEPLOYMENT.md](../DEPLOYMENT.md) for full deployment procedures.

**Quick deployment:**

```bash
cd /var/www/crmanaliz
sudo -u deploy ./scripts/deploy-production.sh
```

---

## Scheduler & Automation

### Check Scheduler Status

Scheduler starts automatically when API service starts (OnModuleInit hook).

Check logs:

```bash
journalctl -u crm-analiz-api.service | grep -i "scheduler\|automation"
```

Expected log entries:

```
Starting automation scheduler...
Found N active schedule(s)
Automation scheduler started successfully
```

### Manual Automation Trigger

Trigger ISSmanager export/import manually via dashboard:

1. Login to https://analiz.binbirnet.com.tr
2. Navigate to **Integrations > ISSmanager**
3. Click **"Şimdi Çek"** button

Or via API:

```bash
curl -X POST https://analiz.binbirnet.com.tr/api/v1/automation/integrations/{id}/trigger \
  -H "Authorization: Bearer {your-jwt-token}" \
  -H "Content-Type: application/json"
```

### Check Automation Jobs

```bash
curl https://analiz.binbirnet.com.tr/api/v1/automation/integrations/{id}/jobs \
  -H "Authorization: Bearer {your-jwt-token}"
```

---

## Contacts

**Operations Lead:** [Name]
**Development Lead:** [Name]
**On-Call:** [Contact Info]

---

## Change Log

| Date       | Version | Changes                                  |
| ---------- | ------- | ---------------------------------------- |
| 2026-04-01 | 1.0     | Initial runbook creation (062 hardening) |

---
