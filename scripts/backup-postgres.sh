#!/bin/bash
#
# CRM Analiz PostgreSQL Backup Script
#

set -Eeuo pipefail

BACKUP_DIR="/var/backups/crmanaliz/postgres"
DB_NAME="crmanaliz"
DB_USER="crmanaliz"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/crmanaliz-$TIMESTAMP.sql.gz"
RETENTION_DAYS=7

log_info() { echo "[INFO] $1"; }
log_error() { echo "[ERROR] $1" >&2; }
fail() { log_error "$1"; exit 1; }

log_info "Starting PostgreSQL backup: $DB_NAME"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Perform backup
log_info "Dumping database..."
sudo -u postgres pg_dump "$DB_NAME" | gzip > "$BACKUP_FILE" || fail "Backup failed"

# Verify backup
if [[ -f "$BACKUP_FILE" ]]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "✅ Backup successful: $BACKUP_FILE ($SIZE)"
else
    fail "Backup file not created"
fi

# Retention cleanup
log_info "Cleaning up old backups (retention: $RETENTION_DAYS days)"
find "$BACKUP_DIR" -name "crmanaliz-*.sql.gz" -mtime +$RETENTION_DAYS -delete

log_info "Backup complete"
exit 0
