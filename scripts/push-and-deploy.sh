#!/bin/bash
# Push and Deploy Wrapper Script
# Semi-automated deployment: push to origin + trigger remote deployment
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }

# ============================================================================
# CONFIGURATION
# ============================================================================

cd "$PROJECT_ROOT"

# Production server settings (override via environment variables)
PROD_SERVER="${PROD_SERVER:-}"
PROD_USER="${PROD_USER:-deploy}"
PROD_PATH="${PROD_PATH:-/opt/crmanaliz}"
PROD_DEPLOY_SCRIPT="${PROD_DEPLOY_SCRIPT:-scripts/deploy-production.sh}"

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

log "🔍 Running pre-flight checks..."

# Check if working tree is clean
if [[ -n $(git status --porcelain) ]]; then
    error "❌ Working tree is not clean. Commit or stash changes first."
fi

# Check if we're on a valid branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" = "HEAD" ]; then
    error "❌ Detached HEAD state. Checkout a branch first."
fi

log "Current branch: $CURRENT_BRANCH"

# Check if origin is configured
if ! git remote get-url origin &> /dev/null; then
    error "❌ No 'origin' remote configured"
fi

ORIGIN_URL=$(git remote get-url origin)
log "Origin: $ORIGIN_URL"

# ============================================================================
# PRE-PUSH QUALITY GATES (OPTIONAL)
# ============================================================================

if [ "${SKIP_QUALITY_GATES:-false}" != "true" ]; then
    log "🔍 Running pre-push quality gates..."

    # Lint
    info "  • Linting..."
    if ! pnpm lint --quiet; then
        error "❌ Lint check failed"
    fi

    # Typecheck
    info "  • Type checking..."
    if ! pnpm typecheck; then
        error "❌ Type check failed"
    fi

    # Tests (optional, can be slow)
    if [ "${RUN_TESTS:-false}" = "true" ]; then
        info "  • Running tests..."
        if ! pnpm test; then
            error "❌ Tests failed"
        fi
    fi

    log "✅ Quality gates passed"
else
    warn "⚠️  Skipping quality gates (SKIP_QUALITY_GATES=true)"
fi

# ============================================================================
# PUSH TO ORIGIN
# ============================================================================

log "📤 Pushing to origin/$CURRENT_BRANCH..."

if ! git push origin "$CURRENT_BRANCH"; then
    error "❌ Failed to push to origin"
fi

CURRENT_COMMIT=$(git rev-parse HEAD)
log "✅ Pushed commit: $CURRENT_COMMIT"

# ============================================================================
# REMOTE DEPLOYMENT TRIGGER
# ============================================================================

# Check if remote deployment is configured
if [ -z "$PROD_SERVER" ]; then
    warn "⚠️  No PROD_SERVER configured, skipping remote deployment"
    warn "⚠️  To enable: export PROD_SERVER=production.local"
    log "✅ Push complete (local only)"
    exit 0
fi

log "🚀 Triggering deployment on $PROD_SERVER..."

# Test SSH connectivity
info "  • Testing SSH connection..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$PROD_USER@$PROD_SERVER" "echo 'SSH OK'" &> /dev/null; then
    error "❌ Cannot connect to $PROD_SERVER via SSH"
fi

# Trigger deployment on remote server
info "  • Executing deployment script on remote server..."
ssh "$PROD_USER@$PROD_SERVER" <<ENDSSH
set -e
cd "$PROD_PATH"
bash "$PROD_DEPLOY_SCRIPT"
ENDSSH

SSH_EXIT_CODE=$?

if [ $SSH_EXIT_CODE -eq 0 ]; then
    log "✅ Deployment completed successfully!"
    log "  Commit: $CURRENT_COMMIT"
    log "  Branch: $CURRENT_BRANCH"
    log "  Server: $PROD_SERVER"
else
    error "❌ Deployment failed with exit code $SSH_EXIT_CODE"
fi

# ============================================================================
# POST-DEPLOYMENT VERIFICATION (OPTIONAL)
# ============================================================================

if [ "${VERIFY_DEPLOYMENT:-true}" = "true" ]; then
    log "🏥 Verifying deployment..."

    # Get API URL from environment or default
    API_URL="${API_URL:-http://$PROD_SERVER:3001/api/v1/health}"

    info "  • Checking API health: $API_URL"
    sleep 5 # Wait for services to stabilize

    if curl -sf "$API_URL" > /dev/null; then
        log "✅ Health check passed"
    else
        warn "⚠️  Health check failed (may need more time to start)"
    fi
fi

log "🎉 Push and deploy workflow complete!"
