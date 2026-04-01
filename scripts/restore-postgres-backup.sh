#!/bin/bash
#
# CRM Analiz PostgreSQL Restore Script
# Restores database from backup file
#
# Usage:
#   ./restore-postgres-backup.sh <backup-file.sql.gz>
#
# Example:
#   ./restore-postgres-backup.sh /var/backups/crmanaliz/postgres/crmanaliz_2026-04-01_02-00-00.sql.gz
#

set -euo pipefail

# ============================================
# Configuration
# ============================================
DB_NAME="${DB_NAME:-crmanaliz}"
DB_USER="${DB_USER:-crmanaliz}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

LOG_FILE="/var/log/crmanaliz/restore.log"

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
# Argument Parsing
# ============================================
if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <backup-file.sql.gz>"
    echo ""
    echo "Example:"
    echo "  $0 /var/backups/crmanaliz/postgres/crmanaliz_2026-04-01_02-00-00.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# ============================================
# Pre-flight Checks
# ============================================
log "========================================="
log "CRM Analiz PostgreSQL Restore - Starting"
log "========================================="

mkdir -p "$(dirname "$LOG_FILE")"

# Check if backup file exists
if [[ ! -f "$BACKUP_FILE" ]]; then
    fail "Backup file not found: $BACKUP_FILE"
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    fail "psql command not found. Install postgresql-client."
fi

# ============================================
# Confirmation Prompt
# ============================================
log "⚠️  WARNING: This will DROP and recreate the database: $DB_NAME"
log "Backup file: $BACKUP_FILE"
log "Target: $DB_NAME@$DB_HOST:$DB_PORT"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " -r
echo ""

if [[ ! $REPLY =~ ^yes$ ]]; then
    log "Restore cancelled by user"
    exit 0
fi

# ============================================
# Restore Execution
# ============================================
log "Starting restore from: $BACKUP_FILE"

# Drop existing database and recreate
log "Dropping existing database..."
PGPASSWORD="${PGPASSWORD:-}" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U postgres \
    -c "DROP DATABASE IF EXISTS $DB_NAME;" \
    || fail "Failed to drop database"

log "Creating fresh database..."
PGPASSWORD="${PGPASSWORD:-}" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U postgres \
    -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" \
    || fail "Failed to create database"

# Restore from backup
log "Restoring data from backup..."
if gunzip < "$BACKUP_FILE" | PGPASSWORD="${PGPASSWORD:-}" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --quiet; then

    log "✅ Restore completed successfully"
else
    fail "Restore failed"
fi

# ============================================
# Verification
# ============================================
log "Verifying restore..."

TABLE_COUNT=$(PGPASSWORD="${PGPASSWORD:-}" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
    | xargs)

log "Restored tables: $TABLE_COUNT"

if [[ "$TABLE_COUNT" -gt 0 ]]; then
    log "✅ Database restore verified"
else
    fail "Restore verification failed: no tables found"
fi

# ============================================
# Summary
# ============================================
log "========================================="
log "Restore Summary:"
log "  - Source: $BACKUP_FILE"
log "  - Target: $DB_NAME@$DB_HOST:$DB_PORT"
log "  - Tables: $TABLE_COUNT"
log "========================================="
log "✅ Restore process completed successfully"
log "========================================="

exit 0
