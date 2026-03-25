#!/bin/bash
set -e

echo "🔄 Starting rollback..."

# Get current and previous image tags
CURRENT_TAG=$(docker compose -f compose.prod.yaml images --format json | jq -r '.[0].Tag' | head -1)
PREVIOUS_TAG=${ROLLBACK_TAG:-"previous"}

if [ -z "$CURRENT_TAG" ]; then
    echo "❌ No current deployment found"
    exit 1
fi

echo "Current tag: $CURRENT_TAG"
echo "Rolling back to: $PREVIOUS_TAG"

# Stop current containers
echo "⏹️  Stopping current containers..."
docker compose -f compose.prod.yaml down

# Checkout previous commit (if git-based rollback)
if [ -n "$ROLLBACK_COMMIT" ]; then
    echo "📦 Checking out commit: $ROLLBACK_COMMIT"
    git checkout $ROLLBACK_COMMIT
fi

# Restart with previous version
echo "🚀 Starting previous version..."
docker compose -f compose.prod.yaml up -d

# Health check
echo "🏥 Running health check..."
sleep 10
./scripts/healthcheck.sh

echo "✅ Rollback complete!"
