# CRM Analiz Production Runbook

## Quick Reference

**Domain:** https://analiz.binbirnet.com.tr  
**Repo:** /var/www/crmanaliz  
**Branch:** feature/core-implementation  
**User:** deploy

## Service Management

### Start/Stop/Restart Services

```bash
# Restart API
sudo systemctl restart crm-analiz-api

# Restart Web
sudo systemctl restart crm-analiz-web

# Restart both
sudo systemctl restart crm-analiz-api crm-analiz-web

# Check status
sudo systemctl status crm-analiz-api
sudo systemctl status crm-analiz-web
```

### View Logs

```bash
# Real-time API logs
sudo journalctl -u crm-analiz-api -f

# Real-time Web logs
sudo journalctl -u crm-analiz-web -f

# Last 100 lines
sudo journalctl -u crm-analiz-api -n 100
```

## Deployment

### Standard Deployment

```bash
cd /var/www/crmanaliz
sudo -u deploy bash scripts/deploy-production.sh
```

This will:

1. Fetch latest code
2. Install dependencies
3. Build application
4. Run migrations
5. Restart services
6. Perform health check
7. Generate release metadata

### Rollback

```bash
# Rollback to previous commit
cd /var/www/crmanaliz
sudo bash scripts/rollback-production.sh

# Rollback to specific commit
sudo bash scripts/rollback-production.sh <commit-hash>
```

## Backup & Restore

### Manual Backup

```bash
# PostgreSQL backup
sudo /var/www/crmanaliz/scripts/backup-postgres.sh

# Config backup
sudo /var/www/crmanaliz/scripts/backup-config.sh
```

### Check Backups

```bash
ls -lh /var/backups/crmanaliz/postgres/
ls -lh /var/backups/crmanaliz/config/
```

### Restore from Backup

```bash
# List available backups
ls /var/backups/crmanaliz/postgres/

# Restore
sudo /var/www/crmanaliz/scripts/restore-postgres.sh /var/backups/crmanaliz/postgres/crmanaliz-YYYYMMDD-HHMMSS.sql.gz
```

**⚠️ WARNING:** Restore will REPLACE the current database!

## Health Check

```bash
# Run comprehensive health check
sudo /var/www/crmanaliz/scripts/health-check-production.sh
```

## Diagnostics

```bash
# Full diagnostic report
sudo /var/www/crmanaliz/scripts/diagnose-production.sh > diagnostic-report.txt
```

## Common Issues

### Service Won't Start

```bash
# Check status
sudo systemctl status crm-analiz-api

# View recent logs
sudo journalctl -u crm-analiz-api -n 100

# Check if port is in use
sudo lsof -i :3000
sudo lsof -i :4000
```

### Port Already in Use

```bash
# Find process using port
sudo lsof -i :3000

# Kill process (if needed)
sudo kill -9 <PID>

# Restart service
sudo systemctl restart crm-analiz-api
```

### High Memory Usage

```bash
# Check memory
free -h

# Check process memory
ps aux --sort=-%mem | head -10

# Restart services if needed
sudo systemctl restart crm-analiz-api crm-analiz-web
```

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database connection
sudo -u postgres psql -d crmanaliz -c "SELECT version();"

# Restart PostgreSQL (if needed)
sudo systemctl restart postgresql
```

## Emergency Procedures

### Complete Service Recovery

```bash
# Stop all services
sudo systemctl stop crm-analiz-web crm-analiz-api

# Check for hanging processes
ps aux | grep -E 'node|pnpm|next'

# Kill if necessary
sudo pkill -f node

# Restart infrastructure
sudo systemctl restart postgresql redis-server nginx

# Start application services
sudo systemctl start crm-analiz-api
sleep 5
sudo systemctl start crm-analiz-web

# Verify
sudo /var/www/crmanaliz/scripts/health-check-production.sh
```

### Database Recovery

If database is corrupted:

```bash
# Stop services
sudo systemctl stop crm-analiz-api crm-analiz-web

# Find latest backup
ls -lt /var/backups/crmanaliz/postgres/ | head -5

# Restore
sudo /var/www/crmanaliz/scripts/restore-postgres.sh <backup-file>

# Start services
sudo systemctl start crm-analiz-api crm-analiz-web
```

## Monitoring

### Check Backup Timer

```bash
# Timer status
sudo systemctl status crmanaliz-backup.timer

# List all timers
sudo systemctl list-timers
```

### Disk Space

```bash
# Check disk usage
df -h

# Clean old logs
sudo journalctl --vacuum-time=7d
```

## Contact & Escalation

For critical issues:

1. Check this runbook
2. Run diagnostic script
3. Review logs
4. Contact development team with diagnostic output

---

**Last Updated:** 2026-03-29  
**Maintained by:** CRM Analiz Operations
