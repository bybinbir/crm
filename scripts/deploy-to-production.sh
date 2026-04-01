#!/bin/bash
#
# CRM Analiz Production Deployment Script
# Deploys latest codebase to production server
#
# Usage:
#   SSH_PASSWORD="..." ./deploy-to-production.sh
#
# Environment:
#   SSH_PASSWORD: Production root password (required)
#   DRY_RUN: Set to "true" for dry run (optional)
#

set -euo pipefail

# ============================================
# Configuration
# ============================================
PROD_HOST="194.15.45.47"
PROD_USER="root"
PROD_PATH="/var/www/crmanaliz"
LOCAL_PATH="$(cd "$(dirname "$0")/.." && pwd)"

DRY_RUN="${DRY_RUN:-false}"
SSH_PASSWORD="${SSH_PASSWORD:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================
# Functions
# ============================================
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

ssh_exec() {
    local cmd="$1"
    if [[ "$DRY_RUN" == "true" ]]; then
        log "[DRY RUN] Would execute: $cmd"
        return 0
    fi

    echo "$SSH_PASSWORD" | ssh "$PROD_USER@$PROD_HOST" "$cmd"
}

# ============================================
# Pre-flight Checks
# ============================================
preflight_checks() {
    log "Running pre-flight checks..."

    if [[ -z "$SSH_PASSWORD" ]]; then
        error "SSH_PASSWORD environment variable not set"
    fi

    if [[ ! -d "$LOCAL_PATH" ]]; then
        error "Local path not found: $LOCAL_PATH"
    fi

    if [[ ! -f "$LOCAL_PATH/package.json" ]]; then
        error "Not a valid CRM Analiz repository: $LOCAL_PATH"
    fi

    # Check SSH connectivity
    if ! echo "$SSH_PASSWORD" | ssh -o ConnectTimeout=10 "$PROD_USER@$PROD_HOST" "echo connected" &>/dev/null; then
        error "Cannot connect to production server"
    fi

    success "Pre-flight checks passed"
}

# ============================================
# Create Backup
# ============================================
create_backup() {
    log "Creating production backup..."

    local backup_name="crmanaliz-backup-$(date +%Y%m%d-%H%M%S).tar.gz"

    ssh_exec "cd /var/www && tar -czf /tmp/$backup_name crmanaliz --exclude=node_modules --exclude=.next --exclude=dist"
    ssh_exec "mv /tmp/$backup_name /var/backups/"

    success "Backup created: /var/backups/$backup_name"
}

# ============================================
# Sync Codebase
# ============================================
sync_codebase() {
    log "Syncing codebase to production..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log "[DRY RUN] Would sync: $LOCAL_PATH -> $PROD_USER@$PROD_HOST:$PROD_PATH"
        return 0
    fi

    # Create tarball locally (exclude heavy directories)
    local tarball="/tmp/crmanaliz-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"
    log "Creating deployment tarball..."

    tar -czf "$tarball" \
        -C "$LOCAL_PATH" \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=dist \
        --exclude=.turbo \
        --exclude=.git \
        --exclude=coverage \
        --exclude=.env \
        --exclude=.env.local \
        .

    # Transfer tarball
    log "Transferring to production..."
    sshpass -p "$SSH_PASSWORD" scp "$tarball" "$PROD_USER@$PROD_HOST:/tmp/"

    # Extract on production
    log "Extracting on production..."
    local tarball_name=$(basename "$tarball")
    ssh_exec "cd $PROD_PATH && tar -xzf /tmp/$tarball_name"
    ssh_exec "rm /tmp/$tarball_name"

    # Cleanup local tarball
    rm "$tarball"

    success "Codebase synced successfully"
}

# ============================================
# Install Dependencies
# ============================================
install_dependencies() {
    log "Installing dependencies..."

    ssh_exec "cd $PROD_PATH && pnpm install --frozen-lockfile"

    success "Dependencies installed"
}

# ============================================
# Build Application
# ============================================
build_application() {
    log "Building application..."

    ssh_exec "cd $PROD_PATH && pnpm build"

    success "Application built successfully"
}

# ============================================
# Verify Build
# ============================================
verify_build() {
    log "Verifying build artifacts..."

    # Check API dist
    ssh_exec "test -f $PROD_PATH/apps/api/dist/main.js" || error "API build failed - main.js not found"

    # Check automation module
    ssh_exec "test -d $PROD_PATH/apps/api/dist/modules/automation" || error "Automation module not built"

    # Check web build
    ssh_exec "test -d $PROD_PATH/apps/web/.next" || error "Web build failed - .next not found"

    success "Build verification passed"
}

# ============================================
# Restart Services
# ============================================
restart_services() {
    log "Restarting services..."

    ssh_exec "systemctl restart crm-analiz-api.service"
    sleep 3
    ssh_exec "systemctl restart crm-analiz-web.service"
    sleep 2

    success "Services restarted"
}

# ============================================
# Verify Services
# ============================================
verify_services() {
    log "Verifying services..."

    # Check API service
    if ! ssh_exec "systemctl is-active --quiet crm-analiz-api.service"; then
        error "API service is not running"
    fi
    success "API service: RUNNING"

    # Check web service
    if ! ssh_exec "systemctl is-active --quiet crm-analiz-web.service"; then
        error "Web service is not running"
    fi
    success "Web service: RUNNING"

    # Check scheduler logs
    log "Checking scheduler initialization..."
    ssh_exec "journalctl -u crm-analiz-api.service -n 50 --no-pager | grep -i 'automation scheduler' || echo 'No scheduler logs found'"
}

# ============================================
# Rollback
# ============================================
rollback() {
    error "Deployment failed. Manual rollback may be required."
    warn "To rollback:"
    warn "1. SSH to production: ssh $PROD_USER@$PROD_HOST"
    warn "2. Extract latest backup from /var/backups/"
    warn "3. Restart services"
}

# ============================================
# Main Execution
# ============================================
main() {
    log "========================================="
    log "CRM Analiz Production Deployment"
    log "========================================="

    if [[ "$DRY_RUN" == "true" ]]; then
        warn "DRY RUN MODE - No changes will be made"
    fi

    preflight_checks

    log ""
    log "Deployment Steps:"
    log "1. Create backup"
    log "2. Sync codebase"
    log "3. Install dependencies"
    log "4. Build application"
    log "5. Verify build"
    log "6. Restart services"
    log "7. Verify services"
    log ""

    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Deployment cancelled"
        exit 0
    fi

    # Execute deployment steps
    trap rollback ERR

    create_backup
    sync_codebase
    install_dependencies
    build_application
    verify_build
    restart_services
    verify_services

    log ""
    log "========================================="
    success "Deployment completed successfully!"
    log "========================================="
    log ""
    log "Next steps:"
    log "1. Check API logs: journalctl -u crm-analiz-api.service -n 100 -f"
    log "2. Verify automation scheduler started"
    log "3. Monitor for errors"
}

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    error "sshpass is required but not installed. Install with: sudo apt install sshpass"
fi

main
