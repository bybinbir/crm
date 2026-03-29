#!/bin/bash
set -Eeuo pipefail

BACKUP_DIR="/var/backups/crmanaliz/config"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE="$BACKUP_DIR/config-$TIMESTAMP.tar.gz"

mkdir -p "$BACKUP_DIR"

tar -czf "$ARCHIVE"     /etc/crmanaliz/     /etc/nginx/sites-available/crm-analiz     /etc/systemd/system/crm-analiz-api.service     /etc/systemd/system/crm-analiz-web.service     2>/dev/null || true

echo "✅ Config backup: $ARCHIVE"
find "$BACKUP_DIR" -name "config-*.tar.gz" -mtime +7 -delete
