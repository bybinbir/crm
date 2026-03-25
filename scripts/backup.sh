#!/bin/bash
set -e

BACKUP_DIR="${BACKUP_DIR:-/opt/crm-analiz/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

echo "💾 Starting database backup..."

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL database
echo "📦 Backing up PostgreSQL..."
docker compose -f compose.prod.yaml exec -T postgres pg_dump -U crmanaliz crmanaliz | gzip > "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup created: $BACKUP_FILE ($SIZE)"
else
    echo "❌ Backup failed"
    exit 1
fi

# Cleanup old backups (keep last 7 days)
echo "🗑️  Cleaning up old backups..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete

echo "✅ Backup complete!"
