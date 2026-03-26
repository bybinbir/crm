#!/bin/bash
set -e

# Database Restore Script for CRM Analiz Platform
# Restores PostgreSQL database from backup file

BACKUP_DIR="${BACKUP_DIR:-/opt/crm-analiz/backups}"

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
gunzip -c "$BACKUP_FILE" | docker compose -f compose.prod.yaml exec -T postgres psql -U crmanaliz crmanaliz

# Verify restore
echo "✓ Checking restored database..."
TABLE_COUNT=$(docker compose -f compose.prod.yaml exec -T postgres psql -U crmanaliz crmanaliz -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "✅ Restore complete!"
    echo "📊 Tables restored: $TABLE_COUNT"
else
    echo "❌ Restore may have failed - no tables found"
    exit 1
fi

# Restart services to clear connections
echo "🔄 Restarting services..."
docker compose -f compose.prod.yaml restart api

echo "✅ Database restore complete!"
