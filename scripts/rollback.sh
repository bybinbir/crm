#!/bin/bash
# Production Rollback Script
# Automated rollback to previous successful deployment
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; exit 1; }

# ============================================================================
# ROLLBACK TARGET DETECTION
# ============================================================================

log "🔄 Starting automated rollback..."
cd "$PROJECT_ROOT"

# Read last successful deployment info
DEPLOY_INFO="$PROJECT_ROOT/.last-deploy"
if [ ! -f "$DEPLOY_INFO" ]; then
    error "❌ No deployment history found (.last-deploy missing)"
fi

source "$DEPLOY_INFO"
CURRENT_COMMIT=$(git rev-parse HEAD)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

log "Current deployment:"
log "  Commit: $CURRENT_COMMIT"
log "  Branch: $CURRENT_BRANCH"

# Find previous commit
PREVIOUS_COMMIT=$(git rev-parse HEAD~1)
if [ -z "$PREVIOUS_COMMIT" ]; then
    error "❌ No previous commit found for rollback"
fi

log "Rolling back to:"
log "  Commit: $PREVIOUS_COMMIT"
log "  Message: $(git log -1 --pretty=%B $PREVIOUS_COMMIT | head -1)"

# Allow manual override via environment variable
if [ -n "${ROLLBACK_COMMIT:-}" ]; then
    warn "⚠️  Manual rollback target specified: $ROLLBACK_COMMIT"
    PREVIOUS_COMMIT="$ROLLBACK_COMMIT"
fi

# ============================================================================
# PRE-ROLLBACK BACKUP
# ============================================================================

log "💾 Creating pre-rollback database backup..."
if [ -f "$SCRIPT_DIR/backup-postgres.sh" ]; then
    bash "$SCRIPT_DIR/backup-postgres.sh" || warn "⚠️  Backup failed, continuing rollback..."
else
    warn "⚠️  Backup script not found, skipping backup"
fi

# ============================================================================
# STOP CURRENT SERVICES
# ============================================================================

log "⏹️  Stopping current services..."

if command -v systemctl &> /dev/null; then
    sudo systemctl stop crmanaliz-api || warn "⚠️  Failed to stop API"
    sudo systemctl stop crmanaliz-web || warn "⚠️  Failed to stop Web"
else
    error "❌ systemctl not available - cannot stop services"
fi

# ============================================================================
# CHECKOUT PREVIOUS VERSION
# ============================================================================

log "📦 Checking out previous commit: $PREVIOUS_COMMIT"
git checkout "$PREVIOUS_COMMIT" || error "❌ Failed to checkout previous commit"

# ============================================================================
# RESTORE DEPENDENCIES
# ============================================================================

log "📦 Restoring dependencies for previous version..."
pnpm install --frozen-lockfile || error "❌ Failed to restore dependencies"

# ============================================================================
# DATABASE ROLLBACK (if needed)
# ============================================================================

log "🗄️  Checking database migration status..."
cd "$PROJECT_ROOT/apps/api"

# Check if rollback migrations are needed
MIGRATION_STATUS=$(pnpm prisma migrate status 2>&1 || true)
if echo "$MIGRATION_STATUS" | grep -q "following migrations have not yet been applied"; then
    warn "⚠️  Database migrations need rollback"
    warn "⚠️  Manual migration rollback may be required"
    warn "⚠️  Check: pnpm prisma migrate resolve"
else
    log "✅ Database migrations compatible with previous version"
fi

# ============================================================================
# RESTART SERVICES
# ============================================================================

log "🚀 Starting services with previous version..."
cd "$PROJECT_ROOT"

if command -v systemctl &> /dev/null; then
    sudo systemctl start crmanaliz-api || error "❌ Failed to start API"
    sudo systemctl start crmanaliz-web || error "❌ Failed to start Web"
    sleep 10
else
    error "❌ systemctl not available - cannot start services"
fi

# ============================================================================
# HEALTH CHECK
# ============================================================================

log "🏥 Running health check..."

API_URL="${API_URL:-http://localhost:3001/api/v1/health}"
MAX_RETRIES=5
RETRY_DELAY=3

for i in $(seq 1 $MAX_RETRIES); do
    if curl -sf "$API_URL" > /dev/null; then
        log "✅ API health check passed"
        break
    else
        if [ $i -eq $MAX_RETRIES ]; then
            error "❌ Health check failed after rollback - service may be unstable"
        fi
        warn "⚠️  Health check failed, retry $i/$MAX_RETRIES in ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
    fi
done

# ============================================================================
# ROLLBACK SUCCESS
# ============================================================================

log "✅ Rollback successful!"
log "  Previous commit: $CURRENT_COMMIT"
log "  Rolled back to: $PREVIOUS_COMMIT"
log "  Time: $(date)"

# Update deployment info
cat > "$DEPLOY_INFO" <<EOF
COMMIT=$PREVIOUS_COMMIT
BRANCH=$CURRENT_BRANCH
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
STATUS=rollback_success
PREVIOUS_COMMIT=$CURRENT_COMMIT
EOF

log "✅ Rollback info saved to $DEPLOY_INFO"
warn "⚠️  Review logs and verify application functionality"
warn "⚠️  Consider investigating root cause of deployment failure"
