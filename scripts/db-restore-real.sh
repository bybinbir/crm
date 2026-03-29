#!/bin/bash
# Real PostgreSQL Restore Script - From Custom Format Dump
# Restores to isolated test database for validation

set -e

# Check arguments
if [ -z "$1" ]; then
    echo "❌ Error: No backup file specified"
    echo ""
    echo "Usage: $0 <backup-file> [restore-db-name]"
    echo ""
    echo "Example:"
    echo "  $0 backups/crmanaliz_2026-03-27_120000.dump"
    echo "  $0 backups/crmanaliz_2026-03-27_120000.dump crmanaliz_restore_test"
    exit 1
fi

BACKUP_FILE="$1"
RESTORE_DB_NAME="${2:-crmanaliz_restore_test}"

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Database credentials
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-crmanaliz}"
DB_PASSWORD="${DB_PASSWORD:-dev_password}"

echo "🔄 PostgreSQL Restore - Isolated Test Database"
echo "=============================================="
echo ""
echo "Backup file: $BACKUP_FILE"
echo "Restore target: $RESTORE_DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# Safety check
if [ "$RESTORE_DB_NAME" == "crmanaliz" ]; then
    echo "⚠️  WARNING: Attempting to restore to production database!"
    read -p "Type 'YES' to confirm: " confirm
    if [ "$confirm" != "YES" ]; then
        echo "❌ Restore cancelled"
        exit 0
    fi
fi

# Check for PostgreSQL client tools
if ! command -v psql &> /dev/null || ! command -v pg_restore &> /dev/null; then
    echo "❌ Error: PostgreSQL client tools not found"
    echo "   Install: apt install postgresql-client"
    exit 1
fi

echo "🗑️  Dropping existing test database (if exists)..."
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d postgres \
    -c "DROP DATABASE IF EXISTS $RESTORE_DB_NAME;" \
    2>/dev/null || true

echo "🆕 Creating fresh test database..."
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d postgres \
    -c "CREATE DATABASE $RESTORE_DB_NAME;"

echo "📥 Restoring from backup..."
PGPASSWORD="$DB_PASSWORD" pg_restore \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$RESTORE_DB_NAME" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --verbose \
    "$BACKUP_FILE"

echo "✅ Restore completed successfully"

echo ""
echo "✅ Restore Complete!"
echo "==================="
echo "Database: $RESTORE_DB_NAME"
echo ""
echo "Verify with:"
echo "  psql -h $DB_HOST -U $DB_USER -d $RESTORE_DB_NAME -c '\dt'"
echo "  psql -h $DB_HOST -U $DB_USER -d $RESTORE_DB_NAME -c 'SELECT COUNT(*) FROM users;'"
echo ""
