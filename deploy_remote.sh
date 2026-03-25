#!/bin/bash
# CRM Analiz Remote Deployment Script
# Auto-generated - runs completely autonomous
set -e

echo "=== CRM Analiz Deployment Agent ==="
echo "Target: analiz.binbirnet.com.tr (194.15.45.47)"
echo "Starting autonomous deployment..."
echo ""

# === PHASE 1: System Preparation ===
echo "[1/10] System preparation..."
apt-get update -qq
apt-get install -y -qq curl git unzip ca-certificates openssl gnupg lsb-release ufw fail2ban > /dev/null 2>&1

# === PHASE 2: Docker Installation ===
echo "[2/10] Docker setup..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh > /dev/null 2>&1
    systemctl enable docker > /dev/null 2>&1
    systemctl start docker
fi

# === PHASE 3: pnpm Installation ===
echo "[3/10] Node.js and pnpm setup..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
fi
corepack enable 2>/dev/null || npm install -g corepack
corepack prepare pnpm@latest --activate

# === PHASE 4: Deploy User ===
echo "[4/10] Deploy user configuration..."
if ! id deploy &> /dev/null; then
    useradd -m -s /bin/bash deploy
    usermod -aG docker deploy
    echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
    chmod 0440 /etc/sudoers.d/deploy
fi

# === PHASE 5: Directory Structure ===
echo "[5/10] Directory structure..."
mkdir -p /opt/crm-analiz/{app,env,logs,backups}
chown -R deploy:deploy /opt/crm-analiz

# === PHASE 6: Firewall ===
echo "[6/10] Firewall configuration..."
ufw --force enable > /dev/null 2>&1
ufw allow 22/tcp > /dev/null 2>&1
ufw allow 80/tcp > /dev/null 2>&1
ufw allow 443/tcp > /dev/null 2>&1
ufw allow 3000/tcp > /dev/null 2>&1
ufw allow 4000/tcp > /dev/null 2>&1

# === PHASE 7: Extract Application ===
echo "[7/10] Extracting application..."
if [ -f /tmp/crm-deploy.tar.gz ]; then
    cd /opt/crm-analiz/app
    tar -xzf /tmp/crm-deploy.tar.gz
    chown -R deploy:deploy /opt/crm-analiz/app
else
    echo "WARNING: /tmp/crm-deploy.tar.gz not found"
fi

# === PHASE 8: Generate Secrets ===
echo "[8/10] Generating secrets..."
JWT_ACCESS=$(openssl rand -base64 32)
JWT_REFRESH=$(openssl rand -base64 32)
ENCRYPT_KEY=$(openssl rand -base64 32)
DB_PASS=$(openssl rand -base64 16 | tr -d '/+=' | head -c 16)
REDIS_PASS=$(openssl rand -base64 16 | tr -d '/+=' | head -c 16)
ADMIN_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 20)

# Save secrets securely
cat > /root/crm-analiz-secrets.txt << SECRETS
=== CRM Analiz Deployment Secrets ===
Generated: $(date)

DATABASE_PASSWORD=${DB_PASS}
REDIS_PASSWORD=${REDIS_PASS}
JWT_ACCESS_SECRET=${JWT_ACCESS}
JWT_REFRESH_SECRET=${JWT_REFRESH}
ENCRYPTION_KEY=${ENCRYPT_KEY}

ADMIN_EMAIL=admin@bullvar.com
ADMIN_PASSWORD=${ADMIN_PASS}

IMPORTANT: Change admin password after first login!
SECRETS
chmod 600 /root/crm-analiz-secrets.txt

# === PHASE 9: Create Environment ===
echo "[9/10] Creating environment configuration..."
cat > /opt/crm-analiz/env/.env << ENV
NODE_ENV=production
PORT=4000

NEXT_PUBLIC_API_URL=http://analiz.binbirnet.com.tr:4000/api/v1

DATABASE_URL=postgresql://crmanaliz:${DB_PASS}@postgres:5432/crmanaliz
POSTGRES_DB=crmanaliz
POSTGRES_USER=crmanaliz
POSTGRES_PASSWORD=${DB_PASS}

REDIS_URL=redis://:${REDIS_PASS}@redis:6379
REDIS_PASSWORD=${REDIS_PASS}

JWT_ACCESS_SECRET=${JWT_ACCESS}
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=${JWT_REFRESH}
JWT_REFRESH_EXPIRES_IN=7d

ENCRYPTION_KEY=${ENCRYPT_KEY}

DEFAULT_ADMIN_EMAIL=admin@bullvar.com
DEFAULT_ADMIN_PASSWORD=${ADMIN_PASS}

ISSMANAGER_BASE_URL=https://placeholder.local
ISSMANAGER_API_KEY=placeholder
ISSMANAGER_DEFAULT_TIMEOUT_MS=30000

CORS_ORIGIN=http://analiz.binbirnet.com.tr,https://analiz.binbirnet.com.tr,http://194.15.45.47:3000
LOG_LEVEL=info
ENABLE_SWAGGER=false
ENABLE_METRICS=true

APP_URL=http://analiz.binbirnet.com.tr
API_URL=http://analiz.binbirnet.com.tr:4000/api
ENV

# Link env files
ln -sf /opt/crm-analiz/env/.env /opt/crm-analiz/app/.env
ln -sf /opt/crm-analiz/env/.env /opt/crm-analiz/app/apps/api/.env
chmod 600 /opt/crm-analiz/env/.env
chown deploy:deploy /opt/crm-analiz/env/.env

# === PHASE 10: Deploy as deploy user ===
echo "[10/10] Deploying application..."
su - deploy -c 'bash -s' << 'DEPLOY_SCRIPT'
cd /opt/crm-analiz/app

# Install dependencies
pnpm install --frozen-lockfile

# Build
pnpm build

# Start infrastructure
docker compose up -d postgres redis

# Wait for health
echo "Waiting for databases..."
sleep 20

# Prisma
cd apps/api
npx prisma generate
npx prisma migrate deploy
npx prisma db seed

# Start application
cd /opt/crm-analiz/app
docker compose up -d api web 2>/dev/null || {
    # Fallback: run without Docker
    pnpm --filter @crmanaliz/api start > /opt/crm-analiz/logs/api.log 2>&1 &
    pnpm --filter @crmanaliz/web start > /opt/crm-analiz/logs/web.log 2>&1 &
}

sleep 10

# Validation
curl -s http://localhost:4000/api/v1/health || echo "API health check failed"
curl -s -I http://localhost:3000 | head -1 || echo "Web check failed"

DEPLOY_SCRIPT

echo ""
echo "=== Deployment Complete ==="
echo "Secrets saved to: /root/crm-analiz-secrets.txt"
echo "Access: http://analiz.binbirnet.com.tr"
echo "Admin: admin@bullvar.com (password in secrets file)"
echo ""
