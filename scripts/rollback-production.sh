#!/bin/bash
#
# CRM Analiz Production Rollback Script
#

set -Eeuo pipefail

REPO_DIR="/var/www/crmanaliz"
RELEASE_META_FILE="$REPO_DIR/.release-meta.json"
LOG_DIR="/var/log/crmanaliz/deploy"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
fail() { log_error "$1"; exit 1; }

cd "$REPO_DIR" || fail "Cannot cd to $REPO_DIR"

log_warn "======================================"
log_warn "  CRM ANALIZ PRODUCTION ROLLBACK"
log_warn "======================================"
log_warn "This will revert to the previous commit!"
echo ""

# Show current state
log_info "Current state:"
git log -1 --oneline
echo ""

# Get target commit
if [[ -n "${1:-}" ]]; then
    TARGET_COMMIT="$1"
    log_info "Rolling back to specified commit: $TARGET_COMMIT"
else
    log_info "Rolling back to HEAD~1 (previous commit)"
    TARGET_COMMIT="HEAD~1"
fi

echo ""
log_info "Target commit:"
git log -1 --oneline "$TARGET_COMMIT"
echo ""

read -p "Continue with rollback? (y/N): " -n 1 -r
echo
[[ $REPLY =~ ^[Yy]$ ]] || fail "Rollback aborted"

mkdir -p "$LOG_DIR"
ROLLBACK_LOG="$LOG_DIR/rollback-$(date +%Y%m%d-%H%M%S).log"

{
    log_info "Rolling back..."
    git reset --hard "$TARGET_COMMIT"

    COMMIT_SHA=$(git rev-parse HEAD)
    COMMIT_SHORT=$(git rev-parse --short HEAD)

    log_info "Installing dependencies..."
    pnpm install --frozen-lockfile

    log_info "Building..."
    pnpm build

    log_info "Running migrations..."
    cd apps/api && pnpm run migration:run || log_warn "Migration issue"
    cd ../..

    log_info "Restarting services..."
    systemctl restart crm-analiz-api && sleep 5
    systemctl restart crm-analiz-web && sleep 5

    log_info "Health check..."
    systemctl is-active crm-analiz-api && log_info "✅ API active" || log_error "❌ API failed"
    systemctl is-active crm-analiz-web && log_info "✅ Web active" || log_error "❌ Web failed"

    log_info ""
    log_info "====================================="
    log_info "  Rollback complete!"
    log_info "====================================="
    log_info "Commit: $COMMIT_SHORT"
    log_info "Time: $(date)"

} 2>&1 | tee "$ROLLBACK_LOG"

exit 0
