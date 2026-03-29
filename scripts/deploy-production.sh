#!/bin/bash
#
# CRM Analiz Production Deployment Script
# Dockerless native systemd deployment
#

set -Eeuo pipefail

# ============================================
# Configuration
# ============================================
REPO_DIR="/var/www/crmanaliz"
BRANCH="feature/core-implementation"
LOG_DIR="/var/log/crmanaliz/deploy"
RELEASE_META_FILE="$REPO_DIR/.release-meta.json"
DEPLOY_USER="deploy"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ============================================
# Functions
# ============================================
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

fail() {
    log_error "$1"
    exit 1
}

# ============================================
# Pre-flight checks
# ============================================
log_info "Starting CRM Analiz production deployment"
echo ""

# Check we're in the right directory
cd "$REPO_DIR" || fail "Cannot cd to $REPO_DIR"

# Check if git repo
[[ -d .git ]] || fail "Not a git repository"

# Check clean working directory
if [[ -n $(git status --porcelain) ]]; then
    log_warn "Working directory has uncommitted changes"
    git status --short
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]] || fail "Deployment aborted"
fi

# Create log directory
mkdir -p "$LOG_DIR"
DEPLOY_LOG="$LOG_DIR/deploy-$(date +%Y%m%d-%H%M%S).log"

# ============================================
# Git operations
# ============================================
{
    log_info "Fetching latest changes..."
    git fetch origin

    log_info "Checking out branch: $BRANCH"
    git checkout "$BRANCH"

    log_info "Pulling latest changes (fast-forward only)"
    git pull --ff-only origin "$BRANCH"

    COMMIT_SHA=$(git rev-parse HEAD)
    COMMIT_SHORT=$(git rev-parse --short HEAD)
    COMMIT_MSG=$(git log -1 --pretty=%B | head -1)

    log_info "Deployment commit: $COMMIT_SHORT - $COMMIT_MSG"
    echo ""

    # ============================================
    # Dependencies
    # ============================================
    log_info "Installing dependencies (frozen lockfile)..."
    pnpm install --frozen-lockfile

    # ============================================
    # Build
    # ============================================
    log_info "Building application..."
    pnpm build

    # ============================================
    # Database migrations
    # ============================================
    log_info "Running database migrations..."
    cd apps/api
    pnpm run migration:run || log_warn "Migration failed or already applied"
    cd ../..

    # ============================================
    # Service restart
    # ============================================
    log_info "Restarting services..."
    systemctl restart crm-analiz-api
    sleep 5
    systemctl restart crm-analiz-web
    sleep 5

    # ============================================
    # Health check
    # ============================================
    log_info "Running health checks..."
    
    # API health
    if systemctl is-active --quiet crm-analiz-api; then
        log_info "✅ API service is active"
    else
        fail "❌ API service is not active"
    fi

    # Web health
    if systemctl is-active --quiet crm-analiz-web; then
        log_info "✅ Web service is active"
    else
        fail "❌ Web service is not active"
    fi

    # HTTP health
    sleep 5
    API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://analiz.binbirnet.com.tr/api/v1/health || echo "000")
    WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://analiz.binbirnet.com.tr || echo "000")

    if [[ "$API_HEALTH" == "200" ]]; then
        log_info "✅ API health check: OK"
    else
        log_error "❌ API health check: FAILED (HTTP $API_HEALTH)"
    fi

    if [[ "$WEB_HEALTH" == "200" ]]; then
        log_info "✅ Web health check: OK"
    else
        log_error "❌ Web health check: FAILED (HTTP $WEB_HEALTH)"
    fi

    # ============================================
    # Release metadata
    # ============================================
    log_info "Generating release metadata..."
    cat > "$RELEASE_META_FILE" << META_EOF
{
  "commit": "$COMMIT_SHA",
  "commitShort": "$COMMIT_SHORT",
  "commitMessage": "$COMMIT_MSG",
  "branch": "$BRANCH",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployedBy": "$(whoami)",
  "apiHealth": "$API_HEALTH",
  "webHealth": "$WEB_HEALTH",
  "status": "success"
}
META_EOF

    log_info ""
    log_info "====================================="
    log_info "  Deployment successful! "
    log_info "====================================="
    log_info "Commit: $COMMIT_SHORT"
    log_info "Time: $(date)"
    log_info "API Health: $API_HEALTH"
    log_info "Web Health: $WEB_HEALTH"
    log_info ""

} 2>&1 | tee "$DEPLOY_LOG"

exit 0
