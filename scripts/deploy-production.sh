#!/bin/bash
# Production Deployment Script
# Local-first CI/CD foundation for bare repo deployment
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
# PRE-DEPLOYMENT CHECKS
# ============================================================================

log "🔍 Running pre-deployment checks..."

# Check if .env exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    error "❌ .env file not found. Copy .env.example and configure."
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    error "❌ Node.js not installed"
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    error "❌ pnpm not installed"
fi

# Check Docker (if using Docker deployment)
if [ "${USE_DOCKER:-true}" = "true" ]; then
    if ! command -v docker &> /dev/null; then
        warn "⚠️  Docker not found, skipping Docker deployment"
        USE_DOCKER=false
    fi
fi

log "✅ Pre-deployment checks passed"

# ============================================================================
# FETCH LATEST CODE
# ============================================================================

log "📥 Fetching latest code from origin..."
cd "$PROJECT_ROOT"

# Fetch from local bare repo
git fetch origin

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
log "Current branch: $CURRENT_BRANCH"

# Pull latest
git pull origin "$CURRENT_BRANCH" || error "❌ Failed to pull latest code"

CURRENT_COMMIT=$(git rev-parse HEAD)
log "Deploying commit: $CURRENT_COMMIT"

# ============================================================================
# DEPENDENCY INSTALLATION
# ============================================================================

log "📦 Installing dependencies..."
pnpm install --frozen-lockfile || error "❌ Failed to install dependencies"

# ============================================================================
# QUALITY GATES
# ============================================================================

log "🔍 Running quality gates..."

# Typecheck
log "  • TypeScript type checking..."
pnpm typecheck || error "❌ Typecheck failed"

# Build
log "  • Building applications..."
pnpm build || error "❌ Build failed"

log "✅ Quality gates passed"

# ============================================================================
# DATABASE BACKUP
# ============================================================================

log "💾 Creating database backup..."
if [ -f "$SCRIPT_DIR/backup.sh" ]; then
    bash "$SCRIPT_DIR/backup.sh" || warn "⚠️  Backup failed, continuing..."
else
    warn "⚠️  Backup script not found, skipping backup"
fi

# ============================================================================
# DATABASE MIGRATIONS
# ============================================================================

log "🗄️  Running database migrations..."
cd "$PROJECT_ROOT/apps/api"

# Check migration status
pnpm prisma migrate status || warn "⚠️  Migration status check failed"

# Deploy migrations
pnpm prisma migrate deploy || error "❌ Migration deployment failed"

log "✅ Migrations applied"

# ============================================================================
# SERVICE RESTART
# ============================================================================

if [ "$USE_DOCKER" = "true" ]; then
    log "🐳 Restarting Docker services..."
    cd "$PROJECT_ROOT"
    docker compose -f compose.prod.yaml build || error "❌ Docker build failed"
    docker compose -f compose.prod.yaml up -d || error "❌ Docker start failed"

    # Wait for services to start
    log "⏳ Waiting for services to start..."
    sleep 15
else
    log "🔄 Restarting services (systemd)..."
    # Systemd restart (requires systemd units to be set up)
    if command -v systemctl &> /dev/null; then
        sudo systemctl restart crmanaliz-api || warn "⚠️  API restart failed"
        sudo systemctl restart crmanaliz-web || warn "⚠️  Web restart failed"
        sleep 10
    else
        warn "⚠️  systemctl not available, manual service restart required"
    fi
fi

# ============================================================================
# HEALTH CHECK
# ============================================================================

log "🏥 Running health check..."

# API health check
API_URL="${API_URL:-http://localhost:3001/api/v1/health}"
MAX_RETRIES=5
RETRY_DELAY=3

for i in $(seq 1 $MAX_RETRIES); do
    if curl -sf "$API_URL" > /dev/null; then
        log "✅ API health check passed"
        break
    else
        if [ $i -eq $MAX_RETRIES ]; then
            error "❌ API health check failed after $MAX_RETRIES attempts"
        fi
        warn "⚠️  Health check failed, retry $i/$MAX_RETRIES in ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
    fi
done

# Web health check (optional)
WEB_URL="${WEB_URL:-http://localhost:3000}"
if curl -sf "$WEB_URL" > /dev/null; then
    log "✅ Web health check passed"
else
    warn "⚠️  Web health check failed (non-critical)"
fi

# ============================================================================
# DEPLOYMENT SUCCESS
# ============================================================================

log "🎉 Deployment successful!"
log "  Commit: $CURRENT_COMMIT"
log "  Branch: $CURRENT_BRANCH"
log "  Time: $(date)"

# Save deployment info
DEPLOY_INFO="$PROJECT_ROOT/.last-deploy"
cat > "$DEPLOY_INFO" <<EOF
COMMIT=$CURRENT_COMMIT
BRANCH=$CURRENT_BRANCH
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
STATUS=success
EOF

log "✅ Deployment info saved to $DEPLOY_INFO"
