#!/bin/bash
# Real PostgreSQL Backup Script - Custom Format
# Uses pg_dump with custom format for reliable restore

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/crmanaliz_${TIMESTAMP}.dump"

# Database credentials from environment or defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-crmanaliz}"
DB_USER="${DB_USER:-crmanaliz}"
DB_PASSWORD="${DB_PASSWORD:-dev_password}"

echo "🗄️  PostgreSQL Backup - Custom Format"
echo "========================================"
echo ""
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo "Target: $BACKUP_FILE"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check for pg_dump
if ! command -v pg_dump &> /dev/null; then
    echo "❌ Error: pg_dump not found in PATH"
    echo "   Install PostgreSQL client tools: apt install postgresql-client"
    exit 1
fi

echo "📦 Creating backup..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -Fc \
    --verbose \
    -f "$BACKUP_FILE"

echo "✅ Backup created successfully"

# Verify backup file
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not created"
    exit 1
fi

# Get file info
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
SHA256=$(sha256sum "$BACKUP_FILE" | cut -d' ' -f1)

echo ""
echo "✅ Backup Complete!"
echo "==================="
echo "File: $BACKUP_FILE"
echo "Size: $SIZE"
echo "SHA256: $SHA256"
echo ""
echo "Restore with:"
echo "  pg_restore -h <host> -U <user> -d <dbname> --clean --if-exists $BACKUP_FILE"
echo ""

# Save metadata
cat > "$BACKUP_FILE.meta" <<EOF
Backup Metadata
===============
Date: $(date -Iseconds)
Database: $DB_NAME
Host: $DB_HOST:$DB_PORT
User: $DB_USER
Format: PostgreSQL custom format (pg_dump -Fc)
File: $(basename "$BACKUP_FILE")
Size: $SIZE
SHA256: $SHA256
EOF

echo "📋 Metadata saved: $BACKUP_FILE.meta"
