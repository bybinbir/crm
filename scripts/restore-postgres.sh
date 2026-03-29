#!/bin/bash
set -Eeuo pipefail

DB_NAME="crmanaliz"

if [[ -z "${1:-}" ]]; then
    echo "Usage: $0 <backup-file.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will REPLACE the current database!"
echo "Database: $DB_NAME"
echo "Backup: $BACKUP_FILE"
read -p "Continue? (yes/NO): " CONFIRM

if [[ "$CONFIRM" != "yes" ]]; then
    echo "Aborted"
    exit 0
fi

echo "Stopping services..."
systemctl stop crm-analiz-api crm-analiz-web

echo "Restoring database..."
gunzip < "$BACKUP_FILE" | sudo -u postgres psql "$DB_NAME"

echo "Starting services..."
systemctl start crm-analiz-api crm-analiz-web

echo "✅ Restore complete"
