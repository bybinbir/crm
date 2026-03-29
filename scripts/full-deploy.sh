#!/bin/bash
set -e

# CRM Analiz Platform - Full Production Deployment Script
# This script performs complete server setup and deployment
# Run this on the production server as root or with sudo

echo "🚀 CRM Analiz Platform - Full Deployment"
echo "=========================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/opt/crm-analiz/app"
DOMAIN="analiz.binbirnet.com.tr"
REPO_URL="https://github.com/yourusername/crmanaliz.git"  # UPDATE THIS
BRANCH="feature/vertical-slice-live"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root or with sudo"
        exit 1
    fi
}

install_docker() {
    if command -v docker &> /dev/null; then
        log_info "Docker already installed: $(docker --version)"
    else
        log_info "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
        systemctl enable docker
        systemctl start docker
        log_info "Docker installed successfully"
    fi
}

install_docker_compose() {
    if docker compose version &> /dev/null; then
        log_info "Docker Compose already installed: $(docker compose version)"
    else
        log_info "Installing Docker Compose plugin..."
        apt-get update
        apt-get install -y docker-compose-plugin
        log_info "Docker Compose installed successfully"
    fi
}

install_dependencies() {
    log_info "Installing system dependencies..."
    apt-get update
    apt-get install -y git certbot curl jq nginx openssl
    log_info "Dependencies installed"
}

create_directory_structure() {
    log_info "Creating directory structure..."
    mkdir -p /opt/crm-analiz/{app,env,logs,backups,scripts,ssl}
    log_info "Directories created"
}

clone_repository() {
    if [ -d "$APP_DIR/.git" ]; then
        log_info "Repository exists, pulling latest changes..."
        cd "$APP_DIR"
        git fetch origin
        git checkout "$BRANCH"
        git pull origin "$BRANCH"
    else
        log_info "Cloning repository..."
        git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
    fi
    cd "$APP_DIR"
    log_info "Repository ready: $(git rev-parse --short HEAD)"
}

generate_secrets() {
    log_info "Generating production secrets..."

    JWT_ACCESS_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -base64 32)
    DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
    REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)

    log_info "Secrets generated successfully"
}

create_env_file() {
    log_info "Creating production .env file..."

    cat > "$APP_DIR/.env" <<EOF
# Node Environment
NODE_ENV=production

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=crmanaliz
DB_USER=crmanaliz
DB_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql://crmanaliz:${DB_PASSWORD}@postgres:5432/crmanaliz

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# JWT
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# API
PORT=4000
API_URL=https://${DOMAIN}

# Web
NEXT_PUBLIC_API_URL=https://${DOMAIN}

# CORS
CORS_ORIGIN=https://${DOMAIN}

# Admin (change after first login)
DEFAULT_ADMIN_EMAIL=admin@crmanaliz.local
DEFAULT_ADMIN_PASSWORD=ChangeMe123!

# App
APP_NAME=CRM Analiz Platform
APP_URL=https://${DOMAIN}
EOF

    chmod 600 "$APP_DIR/.env"
    log_info ".env file created with secure permissions"

    # Save secrets to secure location for reference
    cat > /opt/crm-analiz/env/secrets-$(date +%Y%m%d-%H%M%S).txt <<EOF
Database Password: ${DB_PASSWORD}
Redis Password: ${REDIS_PASSWORD}
JWT Access Secret: ${JWT_ACCESS_SECRET}
JWT Refresh Secret: ${JWT_REFRESH_SECRET}
Encryption Key: ${ENCRYPTION_KEY}

Default Admin:
Email: admin@crmanaliz.local
Password: ChangeMe123!

IMPORTANT: Change admin password after first login!
EOF
    chmod 600 /opt/crm-analiz/env/secrets-*.txt
    log_warn "Secrets saved to /opt/crm-analiz/env/secrets-*.txt - keep this secure!"
}

setup_ssl() {
    log_info "Setting up SSL certificate..."

    # Stop nginx if running
    systemctl stop nginx 2>/dev/null || true

    # Check if certificate already exists
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        log_info "SSL certificate already exists"
    else
        log_info "Obtaining SSL certificate from Let's Encrypt..."
        certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos --email admin@${DOMAIN} || {
            log_error "Failed to obtain SSL certificate"
            log_warn "Make sure $DOMAIN points to this server's IP address"
            exit 1
        }
    fi

    # Copy certificates to app directory
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem "$APP_DIR/ssl/"
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem "$APP_DIR/ssl/"
    chmod 644 "$APP_DIR/ssl/fullchain.pem"
    chmod 600 "$APP_DIR/ssl/privkey.pem"

    log_info "SSL certificates configured"
}

deploy_application() {
    log_info "Deploying application containers..."
    cd "$APP_DIR"

    # Build and start containers
    docker compose -f compose.prod.yaml build --no-cache
    docker compose -f compose.prod.yaml up -d

    log_info "Waiting for services to be ready..."
    sleep 15
}

run_migrations() {
    log_info "Running database migrations..."
    cd "$APP_DIR"

    docker compose -f compose.prod.yaml exec -T api pnpm prisma migrate deploy

    log_info "Migrations completed"
}

run_seed() {
    log_info "Seeding database with initial data..."
    cd "$APP_DIR"

    docker compose -f compose.prod.yaml exec -T api pnpm prisma db seed

    log_info "Database seeded"
}

verify_health() {
    log_info "Running health checks..."

    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -sf http://localhost:4000/api/v1/health > /dev/null 2>&1; then
            log_info "✅ API health check passed"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done

    if [ $attempt -eq $max_attempts ]; then
        log_error "API health check failed after $max_attempts attempts"
        docker compose -f compose.prod.yaml logs api
        exit 1
    fi

    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        log_info "✅ Web health check passed"
    else
        log_warn "Web health check failed"
    fi
}

setup_auto_renewal() {
    log_info "Setting up SSL certificate auto-renewal..."

    # Create renewal hook
    cat > /etc/letsencrypt/renewal-hooks/deploy/crm-analiz.sh <<'HOOK'
#!/bin/bash
cp /etc/letsencrypt/live/analiz.binbirnet.com.tr/fullchain.pem /opt/crm-analiz/app/ssl/
cp /etc/letsencrypt/live/analiz.binbirnet.com.tr/privkey.pem /opt/crm-analiz/app/ssl/
docker compose -f /opt/crm-analiz/app/compose.prod.yaml restart nginx
HOOK

    chmod +x /etc/letsencrypt/renewal-hooks/deploy/crm-analiz.sh

    # Test renewal (dry run)
    certbot renew --dry-run || log_warn "SSL renewal test failed"

    log_info "SSL auto-renewal configured"
}

print_summary() {
    log_info "=========================================="
    log_info "🎉 Deployment completed successfully!"
    log_info "=========================================="
    echo ""
    echo "Application URL: https://$DOMAIN"
    echo "Login URL: https://$DOMAIN/login"
    echo "API Health: https://$DOMAIN/api/v1/health"
    echo ""
    echo "Default Admin Credentials:"
    echo "  Email: admin@crmanaliz.local"
    echo "  Password: ChangeMe123!"
    echo ""
    log_warn "⚠️  IMPORTANT: Change the admin password immediately after first login!"
    echo ""
    echo "Useful commands:"
    echo "  View logs: cd $APP_DIR && docker compose -f compose.prod.yaml logs -f"
    echo "  Restart: cd $APP_DIR && docker compose -f compose.prod.yaml restart"
    echo "  Stop: cd $APP_DIR && docker compose -f compose.prod.yaml down"
    echo "  Backup: $APP_DIR/scripts/backup.sh"
    echo ""
    echo "Secrets stored in: /opt/crm-analiz/env/secrets-*.txt"
}

# Main execution
main() {
    log_info "Starting full deployment process..."

    check_root
    install_docker
    install_docker_compose
    install_dependencies
    create_directory_structure
    clone_repository
    generate_secrets
    create_env_file
    setup_ssl
    deploy_application
    run_migrations
    run_seed
    verify_health
    setup_auto_renewal
    print_summary
}

# Run main function
main
