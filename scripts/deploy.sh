#!/bin/bash
# ⚠️ DEPRECATED - DOCKER-BASED DEPLOYMENT
# This script is obsolete. Production uses host-native systemd services.
# Use scripts/deploy-to-production.sh instead for systemd-based deployment.
set -e
echo "🚀 Starting deployment..."
if [ ! -f .env ]; then echo "❌ .env file not found"; exit 1; fi
echo "📥 Pulling latest code..."
git pull origin main
echo "🏗️  Building and starting services..."
docker compose -f compose.prod.yaml build
docker compose -f compose.prod.yaml up -d
echo "⏳ Waiting for services..."
sleep 10
echo "🗄️  Running migrations..."
docker compose -f compose.prod.yaml exec -T api pnpm prisma migrate deploy
echo "🏥 Health check..."
./scripts/healthcheck.sh
echo "✅ Deployment complete!"
