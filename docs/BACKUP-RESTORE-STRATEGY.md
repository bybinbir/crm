# Backup & Restore Strategy

## Overview

This document defines the backup and restore strategy for CRM Analiz Platform production deployments. Our approach prioritizes data integrity, fast recovery, and operational simplicity.

## Backup Types

### 1. Pre-Deployment Backup (Automated)

- **Trigger**: Before every production deployment
- **Scope**: Full database backup
- **Retention**: Last 10 deployments
- **Location**: `backups/pre-deploy/`
- **Script**: `scripts/backup.sh`

### 2. Scheduled Backup (Automated)

- **Frequency**: Daily at 02:00 AM local time
- **Scope**: Full database + configuration files
- **Retention**:
  - Daily: 7 days
  - Weekly: 4 weeks
  - Monthly: 12 months
- **Location**: `backups/scheduled/`
- **Implementation**: Cron job or systemd timer

### 3. Pre-Rollback Backup (Automated)

- **Trigger**: Before rollback execution
- **Scope**: Full database backup
- **Retention**: Last 5 rollbacks
- **Location**: `backups/pre-rollback/`
- **Script**: `scripts/rollback.sh` (calls `backup.sh`)

### 4. Manual Backup (On-Demand)

- **Trigger**: Manual execution before risky operations
- **Scope**: Configurable (database, files, full system)
- **Retention**: Manual cleanup
- **Location**: `backups/manual/`
- **Script**: `scripts/backup.sh --manual`

## Backup Components

### Database (PostgreSQL)

- **Method**: `pg_dump` with custom format
- **Compression**: Built-in pg_dump compression
- **Includes**:
  - All schema definitions
  - All data tables
  - Sequences and indexes
  - Constraints and triggers
  - User permissions

### Configuration Files

- `.env` (sensitive, encrypted backup)
- `compose.prod.yaml`
- `prisma/schema.prisma`
- Application configuration files

### Uploaded Files (if applicable)

- User uploads directory
- Generated reports
- Temporary files (optional)

## Backup Script Details

### Current Implementation (`scripts/backup.sh`)

```bash
#!/bin/bash
# Creates timestamped PostgreSQL backup
# Format: crmanaliz_backup_YYYYMMDD_HHMMSS.sql.gz
# Location: ../backups/
```

### Enhanced Backup Script Requirements

1. Configurable backup location
2. Retention policy enforcement (automatic cleanup)
3. Backup integrity verification (checksum)
4. Backup metadata logging (size, duration, status)
5. Encryption support for sensitive data
6. Cloud storage sync (optional, for offsite backup)

## Restore Procedures

### Full Database Restore

```bash
# 1. Stop application services
docker compose -f compose.prod.yaml down
# or
sudo systemctl stop crmanaliz-api crmanaliz-web

# 2. Identify backup file
ls -lh backups/pre-deploy/

# 3. Restore database
gunzip -c backups/pre-deploy/crmanaliz_backup_YYYYMMDD_HHMMSS.sql.gz | \
  psql -h localhost -U crmanaliz_user -d crmanaliz_db

# 4. Verify restore
psql -h localhost -U crmanaliz_user -d crmanaliz_db -c "\dt"

# 5. Restart services
docker compose -f compose.prod.yaml up -d
# or
sudo systemctl start crmanaliz-api crmanaliz-web

# 6. Health check
curl http://localhost:3001/api/v1/health
```

### Partial Restore (Single Table)

```bash
# Extract specific table from backup
pg_restore -h localhost -U crmanaliz_user -d crmanaliz_db \
  --table=customer_snapshots \
  backups/pre-deploy/crmanaliz_backup_YYYYMMDD_HHMMSS.dump
```

### Point-in-Time Recovery (PITR)

**Note**: PITR requires PostgreSQL WAL archiving setup (not currently implemented).

Future enhancement: Enable continuous archiving for true PITR capability.

## Backup Verification

### Automated Verification (Recommended)

1. Calculate SHA256 checksum after backup creation
2. Store checksum alongside backup file
3. Verify checksum before restore operation
4. Test restore in staging environment monthly

### Manual Verification

```bash
# Check backup file integrity
gunzip -t backups/pre-deploy/crmanaliz_backup_YYYYMMDD_HHMMSS.sql.gz

# Check backup contents
gunzip -c backups/pre-deploy/crmanaliz_backup_YYYYMMDD_HHMMSS.sql.gz | head -50

# Verify backup size (should be > 100KB for realistic data)
ls -lh backups/pre-deploy/crmanaliz_backup_YYYYMMDD_HHMMSS.sql.gz
```

## Retention Policy

### Automatic Cleanup Rules

- **Pre-deployment backups**: Keep last 10, delete older
- **Scheduled daily backups**: Keep last 7 days
- **Scheduled weekly backups**: Keep last 4 weeks
- **Scheduled monthly backups**: Keep last 12 months
- **Pre-rollback backups**: Keep last 5, delete older
- **Manual backups**: No automatic deletion (manual review quarterly)

### Storage Requirements

- **Estimated database size**: 500MB (mature production)
- **Daily backup space**: ~3.5GB (7 days × 500MB)
- **Weekly backup space**: ~2GB (4 weeks × 500MB)
- **Monthly backup space**: ~6GB (12 months × 500MB)
- **Total backup space needed**: ~12-15GB

### Cleanup Script

```bash
# Remove pre-deploy backups older than 10 files
ls -t backups/pre-deploy/*.sql.gz | tail -n +11 | xargs rm -f

# Remove scheduled backups older than retention policy
find backups/scheduled/daily/ -mtime +7 -type f -delete
find backups/scheduled/weekly/ -mtime +28 -type f -delete
find backups/scheduled/monthly/ -mtime +365 -type f -delete
```

## Disaster Recovery Scenarios

### Scenario 1: Deployment Failed, Database Corrupted

1. Run rollback script: `bash scripts/rollback.sh`
2. Script automatically restores last known good state
3. Verify health checks pass
4. Review logs for root cause

### Scenario 2: Accidental Data Deletion

1. Identify when deletion occurred (timestamp)
2. Find most recent backup before incident
3. Stop services
4. Restore database from backup
5. Restart services
6. Verify data integrity
7. Apply any subsequent migrations if needed

### Scenario 3: Server Hardware Failure

1. Provision new server
2. Install dependencies (Docker, PostgreSQL, Node.js)
3. Clone git repository
4. Copy latest backup from offsite storage
5. Restore database
6. Configure environment variables
7. Deploy application
8. Verify functionality

### Scenario 4: Complete Data Center Loss

**Prerequisite**: Offsite backup sync enabled

1. Provision new infrastructure
2. Retrieve backups from cloud storage
3. Follow Scenario 3 recovery steps
4. Update DNS/networking to point to new infrastructure

## Backup Security

### Encryption

- Database backups contain sensitive customer data
- **Recommended**: Encrypt backups at rest using GPG or similar
- Store encryption keys separately from backups
- Use strong passphrases (minimum 20 characters)

### Access Control

- Backup directory: `chmod 700` (owner only)
- Backup files: `chmod 600` (owner read/write only)
- Owner: Application service account or dedicated backup user
- No world-readable permissions

### Offsite Storage (Optional)

- Sync encrypted backups to cloud storage (AWS S3, Azure Blob, etc.)
- Use separate credentials from production system
- Enable versioning on cloud storage
- Test restore from offsite backup quarterly

## Monitoring & Alerting

### Backup Success Monitoring

- Log all backup operations to file and/or syslog
- Alert on backup failure (email, Slack, PagerDuty, etc.)
- Track backup duration (alert if > 10 minutes)
- Track backup size (alert if deviation > 50% from average)

### Backup Age Monitoring

- Alert if no backup created in last 25 hours (scheduled)
- Alert if pre-deploy backup missing before deployment
- Dashboard widget showing last successful backup time

### Disk Space Monitoring

- Alert if backup partition < 20% free space
- Alert if backup partition < 2GB free space
- Automated cleanup triggers when space low

## Testing Schedule

### Monthly Restore Test

- Restore backup to staging environment
- Run automated test suite against restored data
- Verify data integrity
- Document any issues encountered

### Quarterly Disaster Recovery Drill

- Simulate complete system failure
- Full restore from backups on fresh infrastructure
- Measure recovery time objective (RTO)
- Document lessons learned

### Annual Review

- Review backup strategy effectiveness
- Update retention policies based on growth
- Evaluate new backup technologies
- Audit access logs for backup files

## Backup Script Enhancement Roadmap

### Phase 1 (Current)

- ✅ Basic pg_dump backup
- ✅ Timestamped backup files
- ✅ Gzip compression

### Phase 2 (Next)

- [ ] Retention policy automation
- [ ] Backup verification (checksums)
- [ ] Backup metadata logging
- [ ] Disk space checks

### Phase 3 (Future)

- [ ] Backup encryption
- [ ] Offsite sync to cloud storage
- [ ] Monitoring/alerting integration
- [ ] Parallel backup for large databases

### Phase 4 (Advanced)

- [ ] Point-in-Time Recovery (WAL archiving)
- [ ] Incremental backups
- [ ] Backup compression optimization
- [ ] Multi-region backup replication

---

**Document Owner**: DevOps Team
**Last Updated**: 2026-03-28
**Review Frequency**: Quarterly
**Next Review**: 2026-06-28
