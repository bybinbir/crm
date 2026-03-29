#!/bin/bash
set -e

# Database Restore Script for CRM Analiz Platform
# Restores PostgreSQL database from backup file

BACKUP_DIR="${BACKUP_DIR:-/opt/crm-analiz/backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-crmanaliz}"
DB_USER="${DB_USER:-crmanaliz}"
DB_PASSWORD="${DB_PASSWORD}"

# Check if backup file provided
if [ -z "$1" ]; then
    echo "❌ Error: Backup file not specified"
    echo "Usage: $0 <backup-file>"
    echo ""
    echo "Example:"
    echo "  $0 /opt/crm-analiz/backups/backup_20260327_005656.sql.gz"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null || echo "  No backups found in $BACKUP_DIR"
    exit 1
fi

BACKUP_FILE="$1"

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Check for PostgreSQL client
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql not found"
    echo "   Install: apt install postgresql-client"
    exit 1
fi

echo "🔄 Starting database restore..."
echo "📁 Backup file: $BACKUP_FILE"

# Safety check - confirm restore
read -p "⚠️  WARNING: This will REPLACE the current database. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

# Extract backup and restore to PostgreSQL
echo "📦 Restoring PostgreSQL database..."
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

# Verify restore
echo "✓ Checking restored database..."
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "✅ Restore complete!"
    echo "📊 Tables restored: $TABLE_COUNT"
else
    echo "❌ Restore may have failed - no tables found"
    exit 1
fi

# Restart services to clear connections
echo "🔄 Restarting services..."
systemctl restart crm-analiz-api

echo "✅ Database restore complete!"
