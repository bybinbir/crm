#!/bin/bash
# Verify Restored Database
# Validates tables, schemas, and data integrity after restore

set -e

RESTORE_DB_NAME="${1:-crmanaliz_restore_test}"

# Database credentials
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-crmanaliz}"
DB_PASSWORD="${DB_PASSWORD:-dev_password}"

echo "🔍 PostgreSQL Restore Verification"
echo "===================================="
echo ""
echo "Database: $RESTORE_DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo ""

# Helper function for psql execution
run_query() {
    if command -v psql &> /dev/null; then
        PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$RESTORE_DB_NAME" \
            -t \
            -c "$1"
    elif docker compose ps | grep -q postgres; then
        docker compose exec -T -e PGPASSWORD="$DB_PASSWORD" postgres \
            psql -U "$DB_USER" -d "$RESTORE_DB_NAME" -t -c "$1"
    else
        echo "❌ No PostgreSQL access method"
        exit 1
    fi
}

# 1. Test connection
echo "1️⃣  Testing connection..."
if run_query "SELECT 1;" > /dev/null 2>&1; then
    echo "   ✅ Connection successful"
else
    echo "   ❌ Connection failed"
    exit 1
fi

# 2. List tables
echo ""
echo "2️⃣  Listing tables..."
TABLES=$(run_query "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;")
TABLE_COUNT=$(echo "$TABLES" | grep -v '^$' | wc -l)
echo "   📋 Found $TABLE_COUNT tables:"
echo "$TABLES" | sed 's/^/      - /'

# 3. Check critical tables
echo ""
echo "3️⃣  Verifying critical tables..."
EXPECTED_TABLES=("users" "user_sessions" "audit_logs" "integration_configs")
for table in "${EXPECTED_TABLES[@]}"; do
    if echo "$TABLES" | grep -q "$table"; then
        echo "   ✅ $table"
    else
        echo "   ❌ $table (missing)"
    fi
done

# 4. Row counts
echo ""
echo "4️⃣  Checking row counts..."

# Users
USER_COUNT=$(run_query "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
echo "   users: $USER_COUNT rows"

# Audit logs
AUDIT_COUNT=$(run_query "SELECT COUNT(*) FROM audit_logs;" 2>/dev/null | tr -d ' ' || echo "0")
echo "   audit_logs: $AUDIT_COUNT rows"

# User sessions
SESSION_COUNT=$(run_query "SELECT COUNT(*) FROM user_sessions;" 2>/dev/null | tr -d ' ' || echo "0")
echo "   user_sessions: $SESSION_COUNT rows"

# Integration configs
INTEGRATION_COUNT=$(run_query "SELECT COUNT(*) FROM integration_configs;" 2>/dev/null | tr -d ' ' || echo "0")
echo "   integration_configs: $INTEGRATION_COUNT rows"

# 5. Check migrations
echo ""
echo "5️⃣  Checking migrations..."
MIGRATION_COUNT=$(run_query "SELECT COUNT(*) FROM _prisma_migrations;" 2>/dev/null | tr -d ' ' || echo "0")
echo "   _prisma_migrations: $MIGRATION_COUNT migrations"

if [ "$MIGRATION_COUNT" -gt 0 ]; then
    echo ""
    echo "   Latest migrations:"
    run_query "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 3;" | sed 's/^/      /'
fi

# 6. Check indexes
echo ""
echo "6️⃣  Checking indexes..."
INDEX_COUNT=$(run_query "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public';" | tr -d ' ')
echo "   Found $INDEX_COUNT indexes"

# 7. Check foreign keys
echo ""
echo "7️⃣  Checking foreign key constraints..."
FK_COUNT=$(run_query "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND table_schema='public';" | tr -d ' ')
echo "   Found $FK_COUNT foreign key constraints"

# Summary
echo ""
echo "✅ Verification Complete!"
echo "========================="
echo "Tables: $TABLE_COUNT"
echo "Indexes: $INDEX_COUNT"
echo "Foreign Keys: $FK_COUNT"
echo "Migrations: $MIGRATION_COUNT"
echo ""
echo "Sample Data Counts:"
echo "  users: $USER_COUNT"
echo "  audit_logs: $AUDIT_COUNT"
echo "  user_sessions: $SESSION_COUNT"
echo "  integration_configs: $INTEGRATION_COUNT"
echo ""

# Check if data exists
TOTAL_ROWS=$((USER_COUNT + AUDIT_COUNT + SESSION_COUNT + INTEGRATION_COUNT))
if [ "$TOTAL_ROWS" -gt 0 ]; then
    echo "🎉 Restore verification PASSED!"
    echo "   Database contains data and structure"
else
    echo "⚠️  Warning: No data found in tables"
    echo "   Schema may be restored but data is empty"
fi
