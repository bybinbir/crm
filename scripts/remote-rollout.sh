#!/bin/bash
# Remote Production Rollout Script
# Triggers deployment on remote production server via SSH
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
# CONFIGURATION VALIDATION
# ============================================================================

log "🔍 Validating production configuration..."

# Required environment variables
REQUIRED_VARS=(
  "PROD_HOST"
  "PROD_USER"
  "PROD_APP_PATH"
  "PROD_DOMAIN"
  "PROD_BACKUP_PATH"
)

MISSING_VARS=()
for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR:-}" ]; then
    MISSING_VARS+=("$VAR")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  error "❌ Missing required environment variables: ${MISSING_VARS[*]}"
fi

log "✅ Configuration validated"
info "  Host: $PROD_HOST"
info "  User: $PROD_USER"
info "  App Path: $PROD_APP_PATH"
info "  Domain: $PROD_DOMAIN"

# ============================================================================
# SSH CONNECTIVITY CHECK
# ============================================================================

log "🔌 Testing SSH connectivity..."

SSH_KEY_ARG=""
if [ -n "${PROD_SSH_KEY:-}" ]; then
  SSH_KEY_ARG="-i $PROD_SSH_KEY"
fi

if ! ssh $SSH_KEY_ARG -o ConnectTimeout=5 -o BatchMode=yes "$PROD_USER@$PROD_HOST" "echo 'SSH OK'" &> /dev/null; then
  error "❌ Cannot connect to $PROD_HOST via SSH"
fi

log "✅ SSH connectivity confirmed"

# ============================================================================
# LOCAL PRE-FLIGHT CHECKS
# ============================================================================

log "🔍 Running local pre-flight checks..."

cd "$PROJECT_ROOT"

# Check if working tree is clean
if [[ -n $(git status --porcelain) ]]; then
  warn "⚠️  Working tree has uncommitted changes"
  git status --short
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    error "❌ Aborted by user"
  fi
fi

# Get current commit
CURRENT_COMMIT=$(git rev-parse HEAD)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

log "Current commit: $CURRENT_COMMIT"
log "Current branch: $CURRENT_BRANCH"

# ============================================================================
# OPTIONAL: PUSH TO ORIGIN
# ============================================================================

if [ "${PUSH_TO_ORIGIN:-true}" = "true" ]; then
  log "📤 Pushing to origin..."

  if git remote get-url origin &> /dev/null; then
    git push origin "$CURRENT_BRANCH" || warn "⚠️  Push to origin failed (continuing anyway)"
  else
    warn "⚠️  No origin remote configured, skipping push"
  fi
fi

# ============================================================================
# REMOTE DEPLOYMENT EXECUTION
# ============================================================================

log "🚀 Triggering remote deployment on $PROD_HOST..."

ssh $SSH_KEY_ARG "$PROD_USER@$PROD_HOST" bash <<ENDSSH
set -euo pipefail

echo "🔍 [REMOTE] Starting deployment on production server..."

# Navigate to application directory
cd "$PROD_APP_PATH"

# Pre-deployment checks
echo "📋 [REMOTE] Pre-deployment checks..."

# Check disk space (minimum 10GB free)
FREE_SPACE=\$(df -BG . | tail -1 | awk '{print \$4}' | sed 's/G//')
if [ "\$FREE_SPACE" -lt 10 ]; then
  echo "❌ [REMOTE] Insufficient disk space: \${FREE_SPACE}GB (minimum 10GB required)"
  exit 1
fi
echo "✅ [REMOTE] Disk space: \${FREE_SPACE}GB"

# Check .env exists
if [ ! -f .env ]; then
  echo "❌ [REMOTE] .env file not found"
  exit 1
fi
echo "✅ [REMOTE] .env file present"

# Check PostgreSQL connectivity
if ! psql -h localhost -U crmanaliz -d crmanaliz -c "SELECT 1;" &> /dev/null; then
  echo "❌ [REMOTE] PostgreSQL not accessible"
  exit 1
fi
echo "✅ [REMOTE] PostgreSQL accessible"

# Backup
echo "💾 [REMOTE] Creating pre-deployment backup..."
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$PROD_BACKUP_PATH/pre-deploy"
mkdir -p "\$BACKUP_DIR"
BACKUP_FILE="\$BACKUP_DIR/crmanaliz_backup_\${TIMESTAMP}.sql.gz"

pg_dump -h localhost -U crmanaliz -d crmanaliz | gzip > "\$BACKUP_FILE"

if [ ! -f "\$BACKUP_FILE" ]; then
  echo "❌ [REMOTE] Backup failed"
  exit 1
fi

BACKUP_SIZE=\$(du -h "\$BACKUP_FILE" | cut -f1)
echo "✅ [REMOTE] Backup created: \$BACKUP_FILE (\$BACKUP_SIZE)"

# Save rollback info
CURRENT_COMMIT=\$(git rev-parse HEAD)
echo "ROLLBACK_COMMIT=\$CURRENT_COMMIT" > "\$BACKUP_DIR/rollback_\${TIMESTAMP}.info"
echo "BACKUP_FILE=\$BACKUP_FILE" >> "\$BACKUP_DIR/rollback_\${TIMESTAMP}.info"
echo "TIMESTAMP=\$TIMESTAMP" >> "\$BACKUP_DIR/rollback_\${TIMESTAMP}.info"

# Pull latest code
echo "📥 [REMOTE] Pulling latest code..."
git fetch origin
git checkout $CURRENT_COMMIT
git log -1 --oneline

# Install dependencies
echo "📦 [REMOTE] Installing dependencies..."
pnpm install --frozen-lockfile

# Quality gates
echo "🔍 [REMOTE] Running quality gates..."
pnpm typecheck || { echo "❌ [REMOTE] Typecheck failed"; exit 1; }
pnpm build || { echo "❌ [REMOTE] Build failed"; exit 1; }
echo "✅ [REMOTE] Quality gates passed"

# Database migrations
echo "🗄️  [REMOTE] Deploying database migrations..."
cd apps/api
npx prisma migrate deploy
cd ../..

# Restart services
echo "🔄 [REMOTE] Restarting services..."
sudo systemctl stop crmanaliz-api
sudo systemctl stop crmanaliz-web
sleep 2
sudo systemctl start crmanaliz-api
sudo systemctl start crmanaliz-web
sleep 10

# Health check
echo "🏥 [REMOTE] Running health check..."
API_STATUS=\$(systemctl is-active crmanaliz-api)
WEB_STATUS=\$(systemctl is-active crmanaliz-web)

if [ "\$API_STATUS" != "active" ] || [ "\$WEB_STATUS" != "active" ]; then
  echo "❌ [REMOTE] Services not running properly"
  echo "  API: \$API_STATUS"
  echo "  Web: \$WEB_STATUS"
  exit 1
fi

echo "✅ [REMOTE] Services running"

# Deployment metadata
cat > .last-deploy <<EOF
COMMIT=$CURRENT_COMMIT
BRANCH=$CURRENT_BRANCH
TIMESTAMP=\$(date -u +%Y-%m-%dT%H:%M:%SZ)
STATUS=deployment_success
DEPLOYED_BY=$USER
BACKUP_FILE=\$BACKUP_FILE
EOF

echo "✅ [REMOTE] Deployment complete"
ENDSSH

SSH_EXIT_CODE=$?

if [ $SSH_EXIT_CODE -ne 0 ]; then
  error "❌ Remote deployment failed with exit code $SSH_EXIT_CODE"
fi

log "✅ Remote deployment completed successfully"

# ============================================================================
# POST-DEPLOYMENT VERIFICATION
# ============================================================================

log "🏥 Running post-deployment verification..."

# Wait for services to stabilize
sleep 5

# Health check
API_URL="https://$PROD_DOMAIN/api/v1/health"
info "  Checking: $API_URL"

if curl -sf "$API_URL" > /dev/null; then
  log "✅ API health check passed"
else
  warn "⚠️  API health check failed"
fi

# Optional: Run full smoke test
if [ "${RUN_SMOKE_TEST:-true}" = "true" ]; then
  log "🔍 Running smoke test suite..."

  if [ -f "$SCRIPT_DIR/verify-production-smoke.sh" ]; then
    bash "$SCRIPT_DIR/verify-production-smoke.sh"
  else
    warn "⚠️  Smoke test script not found, skipping"
  fi
fi

# ============================================================================
# COMPLETION
# ============================================================================

log "🎉 Production rollout complete!"
log "  Commit: $CURRENT_COMMIT"
log "  Branch: $CURRENT_BRANCH"
log "  Domain: https://$PROD_DOMAIN"
log ""
log "Next steps:"
log "  1. Monitor services for 15-30 minutes"
log "  2. Verify dashboard functionality"
log "  3. Check application logs for errors"
log "  4. Notify team of successful deployment"
