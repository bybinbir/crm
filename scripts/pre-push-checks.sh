#!/bin/bash
# Pre-Push Quality Gates Script
# Run this before pushing to catch issues early
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
# PRE-PUSH QUALITY GATES
# ============================================================================

log "🔍 Running pre-push quality gates..."
cd "$PROJECT_ROOT"

# Check working tree status
if [[ -n $(git status --porcelain) ]]; then
    warn "⚠️  Working tree has uncommitted changes"
    git status --short
fi

# Check if branch is up to date with origin
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if git remote get-url origin &> /dev/null; then
    git fetch origin &> /dev/null || true
    LOCAL_COMMIT=$(git rev-parse HEAD)
    REMOTE_COMMIT=$(git rev-parse origin/"$CURRENT_BRANCH" 2> /dev/null || echo "")

    if [ -n "$REMOTE_COMMIT" ] && [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
        warn "⚠️  Branch is not in sync with origin/$CURRENT_BRANCH"
    fi
fi

# ============================================================================
# LINT CHECK
# ============================================================================

log "  • Running linter..."
if ! pnpm lint --quiet; then
    error "❌ Lint check failed. Fix issues and try again."
fi
log "    ✅ Lint passed"

# ============================================================================
# TYPE CHECK
# ============================================================================

log "  • Running TypeScript type check..."
if ! pnpm typecheck; then
    error "❌ Type check failed. Fix type errors and try again."
fi
log "    ✅ Type check passed"

# ============================================================================
# TESTS (OPTIONAL)
# ============================================================================

if [ "${RUN_TESTS:-false}" = "true" ]; then
    log "  • Running tests..."
    if ! pnpm test; then
        error "❌ Tests failed. Fix failing tests and try again."
    fi
    log "    ✅ Tests passed"
else
    warn "    ⚠️  Tests skipped (set RUN_TESTS=true to enable)"
fi

# ============================================================================
# BUILD CHECK
# ============================================================================

if [ "${SKIP_BUILD:-false}" != "true" ]; then
    log "  • Running build..."
    if ! pnpm build; then
        error "❌ Build failed. Fix build errors and try again."
    fi
    log "    ✅ Build passed"
else
    warn "    ⚠️  Build skipped (SKIP_BUILD=true)"
fi

# ============================================================================
# SUCCESS
# ============================================================================

log "✅ All pre-push quality gates passed!"
log "   Safe to push to origin."
