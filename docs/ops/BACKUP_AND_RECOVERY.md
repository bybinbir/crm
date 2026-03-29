# CRM Analiz Backup and Recovery

## Backup System

### Automated Backups

- **Schedule:** Daily at 02:00 UTC
- **Retention:** 7 days
- **Location:** /var/backups/crmanaliz/
- **Components:** PostgreSQL database + system configuration

### Backup Locations

```
/var/backups/crmanaliz/
├── postgres/          # Database dumps
├── config/            # System configuration
└── releases/          # Release metadata
```

## Manual Backup

```bash
# Database
sudo /var/www/crmanaliz/scripts/backup-postgres.sh

# Configuration
sudo /var/www/crmanaliz/scripts/backup-config.sh
```

## Restore Procedures

### Database Restore

```bash
# 1. Stop services
sudo systemctl stop crm-analiz-api crm-analiz-web

# 2. List backups
ls -lh /var/backups/crmanaliz/postgres/

# 3. Restore
sudo /var/www/crmanaliz/scripts/restore-postgres.sh     /var/backups/crmanaliz/postgres/crmanaliz-YYYYMMDD-HHMMSS.sql.gz

# 4. Start services
sudo systemctl start crm-analiz-api crm-analiz-web

# 5. Verify
curl -s https://analiz.binbirnet.com.tr/api/v1/health
```

### Configuration Restore

```bash
# Extract config backup
cd /tmp
tar -xzf /var/backups/crmanaliz/config/config-YYYYMMDD-HHMMSS.tar.gz

# Review and restore files manually
# DO NOT blindly overwrite - review first!
```

## Disaster Recovery

### Full System Recovery

1. **Provision new server** (Ubuntu 22.04)
2. **Install base dependencies**
3. **Restore configuration files**
4. **Clone repository**
5. **Restore database**
6. **Start services**
7. **Verify health**

### Recovery Time Objective (RTO)

- **Target RTO:** < 1 hour
- **Database restore:** ~5 minutes
- **Service startup:** ~2 minutes

### Recovery Point Objective (RPO)

- **Target RPO:** < 24 hours (daily backups)
- **Consider:** Real-time replication for critical data

## Verification

### Backup Verification

```bash
# Check backup size (should be > 0)
ls -lh /var/backups/crmanaliz/postgres/

# Test backup integrity
gunzip -t /var/backups/crmanaliz/postgres/crmanaliz-*.sql.gz

# Verify timer is running
systemctl status crmanaliz-backup.timer
```

---

**Last Updated:** 2026-03-29
