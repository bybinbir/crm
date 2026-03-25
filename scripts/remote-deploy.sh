#!/bin/bash
# Remote deployment wrapper for CRM Analiz Platform
# Executes deployment commands on remote server

set -e

SERVER_IP="194.15.45.47"
SERVER_USER="root"
DOMAIN="analiz.binbirnet.com.tr"
REPO_URL="https://github.com/yourusername/crmanaliz.git"  # UPDATE THIS
BRANCH="feature/vertical-slice-live"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Execute command on remote server
remote_exec() {
    local cmd="$1"
    ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "$cmd"
}

log_info "Starting remote deployment to ${SERVER_IP}..."

# 1. Check connection
log_info "Testing SSH connection..."
remote_exec "echo 'Connected successfully' && whoami"

# 2. Update system
log_info "Updating system packages..."
remote_exec "apt-get update -y"

# 3. Install Docker
log_info "Installing Docker..."
remote_exec "if ! command -v docker &> /dev/null; then curl -fsSL https://get.docker.com | sh; fi"
remote_exec "systemctl enable docker && systemctl start docker"

# 4. Install Docker Compose
log_info "Installing Docker Compose..."
remote_exec "apt-get install -y docker-compose-plugin"

# 5. Install dependencies
log_info "Installing system dependencies..."
remote_exec "apt-get install -y git certbot curl jq nginx openssl"

# 6. Create directory structure
log_info "Creating directory structure..."
remote_exec "mkdir -p /opt/crm-analiz/{app,env,logs,backups,scripts,ssl}"

# 7. Clone repository (or pull if exists)
log_info "Deploying repository..."
remote_exec "if [ -d /opt/crm-analiz/app/.git ]; then cd /opt/crm-analiz/app && git fetch && git checkout ${BRANCH} && git pull; else git clone -b ${BRANCH} ${REPO_URL} /opt/crm-analiz/app; fi"

# 8. Generate secrets
log_info "Generating production secrets..."
JWT_ACCESS_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)

# 9. Create .env file
log_info "Creating production .env file..."
remote_exec "cat > /opt/crm-analiz/app/.env << 'ENVEOF'
NODE_ENV=production
DB_HOST=postgres
DB_PORT=5432
DB_NAME=crmanaliz
DB_USER=crmanaliz
DB_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql://crmanaliz:${DB_PASSWORD}@postgres:5432/crmanaliz
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=${ENCRYPTION_KEY}
PORT=4000
API_URL=https://${DOMAIN}
NEXT_PUBLIC_API_URL=https://${DOMAIN}
CORS_ORIGIN=https://${DOMAIN}
DEFAULT_ADMIN_EMAIL=admin@crmanaliz.local
DEFAULT_ADMIN_PASSWORD=ChangeMe123!
APP_NAME=CRM Analiz Platform
APP_URL=https://${DOMAIN}
ENVEOF
chmod 600 /opt/crm-analiz/app/.env"

# 10. Setup SSL
log_info "Setting up SSL certificate..."
remote_exec "systemctl stop nginx 2>/dev/null || true"
remote_exec "certbot certonly --standalone -d ${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} || echo 'SSL cert exists or failed'"
remote_exec "cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem /opt/crm-analiz/app/ssl/ 2>/dev/null || echo 'Using existing SSL'"
remote_exec "cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem /opt/crm-analiz/app/ssl/ 2>/dev/null || echo 'Using existing SSL'"

# 11. Build and start containers
log_info "Building and starting Docker containers..."
remote_exec "cd /opt/crm-analiz/app && docker compose -f compose.prod.yaml build --no-cache"
remote_exec "cd /opt/crm-analiz/app && docker compose -f compose.prod.yaml up -d"

# 12. Wait for services
log_info "Waiting for services to be ready..."
sleep 20

# 13. Run migrations
log_info "Running database migrations..."
remote_exec "cd /opt/crm-analiz/app && docker compose -f compose.prod.yaml exec -T api pnpm prisma migrate deploy"

# 14. Seed database
log_info "Seeding database..."
remote_exec "cd /opt/crm-analiz/app && docker compose -f compose.prod.yaml exec -T api pnpm prisma db seed"

# 15. Health check
log_info "Running health checks..."
remote_exec "curl -sf http://localhost:4000/api/v1/health || echo 'API health check failed'"

log_info "Deployment complete!"
log_info "Application URL: https://${DOMAIN}"
log_info "Login URL: https://${DOMAIN}/login"
log_info "Default credentials: admin@crmanaliz.local / ChangeMe123!"

echo ""
echo "Generated Secrets (save securely):"
echo "DB_PASSWORD=${DB_PASSWORD}"
echo "REDIS_PASSWORD=${REDIS_PASSWORD}"
echo "JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}"
echo "ENCRYPTION_KEY=${ENCRYPTION_KEY}"
