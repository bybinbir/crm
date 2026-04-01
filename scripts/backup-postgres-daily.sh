#!/bin/bash
#
# CRM Analiz PostgreSQL Daily Backup Script
# Creates compressed PostgreSQL dumps with timestamp and rotation
#
# Usage:
#   ./backup-postgres-daily.sh
#
# Install as cron job (runs daily at 2 AM):
#   0 2 * * * /var/www/crmanaliz/scripts/backup-postgres-daily.sh
#

set -euo pipefail

# ============================================
# Configuration
# ============================================
BACKUP_DIR="${BACKUP_DIR:-/var/backups/crmanaliz/postgres}"
DB_NAME="${DB_NAME:-crmanaliz}"
DB_USER="${DB_USER:-crmanaliz}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Retention: keep backups for N days
RETENTION_DAYS=7

# Backup filename format: crmanaliz_YYYY-MM-DD_HH-MM-SS.sql.gz
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

LOG_FILE="/var/log/crmanaliz/backup.log"

# ============================================
# Functions
# ============================================
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

fail() {
    log "❌ ERROR: $1"
    exit 1
}

# ============================================
# Pre-flight Checks
# ============================================
log "========================================="
log "CRM Analiz PostgreSQL Backup - Starting"
log "========================================="

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    fail "pg_dump command not found. Install postgresql-client."
fi

# ============================================
# Backup Execution
# ============================================
log "Starting backup: $DB_NAME@$DB_HOST:$DB_PORT"
log "Target file: $BACKUP_FILE"

# Create backup (compressed)
if PGPASSWORD="${PGPASSWORD:-}" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-acl \
    | gzip > "$BACKUP_FILE"; then

    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "✅ Backup completed successfully: $BACKUP_FILE ($BACKUP_SIZE)"
else
    fail "pg_dump failed"
fi

# ============================================
# Backup Rotation
# ============================================
log "Applying retention policy: keep backups for $RETENTION_DAYS days"

# Find and delete backups older than RETENTION_DAYS
DELETED_COUNT=0
while IFS= read -r old_backup; do
    log "Deleting old backup: $old_backup"
    rm -f "$old_backup"
    ((DELETED_COUNT++))
done < <(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime +${RETENTION_DAYS})

if [[ $DELETED_COUNT -gt 0 ]]; then
    log "Deleted $DELETED_COUNT old backup(s)"
else
    log "No old backups to delete"
fi

# ============================================
# Summary
# ============================================
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log "========================================="
log "Backup Summary:"
log "  - Current backups: $BACKUP_COUNT"
log "  - Total size: $TOTAL_SIZE"
log "  - Latest: $BACKUP_FILE"
log "========================================="
log "✅ Backup process completed successfully"
log "========================================="

exit 0
