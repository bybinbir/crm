# CRM Analiz Platform - Deployment Guide

## Prerequisites

### Server Requirements

- Ubuntu 20.04 LTS or higher
- Minimum 2GB RAM, 2 CPU cores
- 20GB disk space
- Root or sudo access
- Domain: analiz.bullvar.com pointed to server IP

### Required Software

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- Certbot (for SSL certificates)

## Initial Server Setup

### 1. Install Dependencies

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get install docker-compose-plugin -y

# Install other dependencies
sudo apt-get install -y git certbot curl jq
```

### 2. Create Directory Structure

```bash
sudo mkdir -p /opt/crm-analiz/{app,env,logs,backups,scripts}
sudo chown -R $USER:$USER /opt/crm-analiz
```

### 3. Clone Repository

```bash
cd /opt/crm-analiz/app
git clone <repository-url> .
git checkout feature/vertical-slice-live
```

## Environment Configuration

### 1. Create Production Environment File

```bash
cd /opt/crm-analiz/app
cp .env.example .env
```

### 2. Generate Secrets

```bash
# Generate strong random secrets
JWT_ACCESS_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 24)
REDIS_PASSWORD=$(openssl rand -base64 24)
```

### 3. Edit .env File

```bash
nano .env
```

Set the following values:

```env
# Application
NODE_ENV=production
PORT=4000

# Database
DB_NAME=crmanaliz
DB_USER=crmanaliz
DB_PASSWORD=<generated-password>
DATABASE_URL=postgresql://crmanaliz:<DB_PASSWORD>@postgres:5432/crmanaliz

# Redis
REDIS_PASSWORD=<generated-password>
REDIS_URL=redis://:<REDIS_PASSWORD>@redis:6379

# JWT
JWT_ACCESS_SECRET=<generated-secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<generated-secret>
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=<generated-key>

# Admin Bootstrap
DEFAULT_ADMIN_EMAIL=admin@crmanaliz.local
DEFAULT_ADMIN_PASSWORD=<strong-password>

# URLs
APP_URL=https://analiz.bullvar.com
API_URL=https://analiz.bullvar.com
CORS_ORIGIN=https://analiz.bullvar.com
NEXT_PUBLIC_API_URL=https://analiz.bullvar.com
```

### 4. Secure Environment File

```bash
chmod 600 .env
```

## SSL Certificate Setup

### 1. Obtain Let's Encrypt Certificate

```bash
# Stop any service using ports 80/443
sudo certbot certonly --standalone -d analiz.bullvar.com
```

### 2. Copy Certificates

```bash
sudo mkdir -p /opt/crm-analiz/app/ssl
sudo cp /etc/letsencrypt/live/analiz.bullvar.com/fullchain.pem /opt/crm-analiz/app/ssl/
sudo cp /etc/letsencrypt/live/analiz.bullvar.com/privkey.pem /opt/crm-analiz/app/ssl/
sudo chown -R $USER:$USER /opt/crm-analiz/app/ssl
```

### 3. Setup Auto-Renewal

```bash
# Add renewal hook
sudo bash -c 'cat > /etc/letsencrypt/renewal-hooks/post/crm-analiz.sh << EOF
#!/bin/bash
cp /etc/letsencrypt/live/analiz.bullvar.com/fullchain.pem /opt/crm-analiz/app/ssl/
cp /etc/letsencrypt/live/analiz.bullvar.com/privkey.pem /opt/crm-analiz/app/ssl/
docker compose -f /opt/crm-analiz/app/compose.prod.yaml exec nginx nginx -s reload
EOF'
sudo chmod +x /etc/letsencrypt/renewal-hooks/post/crm-analiz.sh
```

## Deployment

### 1. Initial Deployment

```bash
cd /opt/crm-analiz/app
chmod +x scripts/*.sh
./scripts/deploy.sh
```

This script will:

- Build Docker images
- Start all containers (postgres, redis, api, web, nginx)
- Run database migrations
- Execute health checks

### 2. Run Database Seed

```bash
docker compose -f compose.prod.yaml exec api pnpm prisma db seed
```

### 3. Verify Deployment

```bash
./scripts/healthcheck.sh
```

Expected output:

```
🏥 Health Check
API: ✅
Web: ✅
✅ All services healthy
```

## Post-Deployment

### 1. First Login

Navigate to: https://analiz.bullvar.com/login

Credentials:

- Email: (from DEFAULT_ADMIN_EMAIL in .env)
- Password: (from DEFAULT_ADMIN_PASSWORD in .env)

**IMPORTANT:** Change the admin password immediately after first login.

### 2. Configure ISSmanager Integration

1. Navigate to `/dashboard/integrations/issmanager`
2. Fill in:
   - Name: ISSmanager Production
   - Base URL: <your-issmanager-url>
   - API Key: <your-issmanager-api-key>
   - Timeout: 30000
3. Click "Save"
4. Click "Test Connection"

### 3. Setup Automated Backups

```bash
# Add to crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/crm-analiz/app/scripts/backup.sh >> /opt/crm-analiz/logs/backup.log 2>&1
```

## Operations

### View Logs

```bash
# All containers
docker compose -f compose.prod.yaml logs -f

# Specific container
docker compose -f compose.prod.yaml logs -f api
docker compose -f compose.prod.yaml logs -f web
```

### Restart Services

```bash
docker compose -f compose.prod.yaml restart
```

### Update Deployment

```bash
cd /opt/crm-analiz/app
git pull origin main
./scripts/deploy.sh
```

### Rollback

```bash
# Set rollback target
export ROLLBACK_COMMIT=<previous-commit-hash>
./scripts/rollback.sh
```

### Backup Database

```bash
./scripts/backup.sh
```

### Restore Database

```bash
BACKUP_FILE=/opt/crm-analiz/backups/backup_YYYYMMDD_HHMMSS.sql.gz
gunzip -c $BACKUP_FILE | docker compose -f compose.prod.yaml exec -T postgres psql -U crmanaliz crmanaliz
```

## Monitoring

### Health Checks

```bash
# API health
curl https://analiz.bullvar.com/api/v1/health

# Expected: {"status":"ok","timestamp":"...","version":"...","uptime":...}
```

### Container Status

```bash
docker compose -f compose.prod.yaml ps
```

### Resource Usage

```bash
docker stats
```

## Troubleshooting

### Containers Not Starting

```bash
# Check logs
docker compose -f compose.prod.yaml logs

# Check configuration
docker compose -f compose.prod.yaml config

# Restart
docker compose -f compose.prod.yaml down
docker compose -f compose.prod.yaml up -d
```

### Database Connection Issues

```bash
# Check PostgreSQL container
docker compose -f compose.prod.yaml logs postgres

# Verify connection
docker compose -f compose.prod.yaml exec postgres psql -U crmanaliz -d crmanaliz -c "SELECT version();"
```

### SSL Certificate Issues

```bash
# Check certificate expiry
sudo certbot certificates

# Manual renewal
sudo certbot renew

# Copy renewed certs
sudo cp /etc/letsencrypt/live/analiz.bullvar.com/*.pem /opt/crm-analiz/app/ssl/
docker compose -f compose.prod.yaml restart nginx
```

## Security Checklist

- [ ] All secrets in .env are unique and strong
- [ ] .env file has 600 permissions
- [ ] Database and Redis are not publicly accessible
- [ ] HTTPS is enforced (HTTP redirects to HTTPS)
- [ ] SSL certificates are valid and auto-renewing
- [ ] Admin password changed from default
- [ ] Backups are running daily
- [ ] Docker daemon is secured
- [ ] Firewall allows only ports 80, 443, and SSH

## Performance Tuning

### Database

```sql
-- Connect to database
docker compose -f compose.prod.yaml exec postgres psql -U crmanaliz crmanaliz

-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- Analyze and vacuum
ANALYZE;
VACUUM;
```

### Application

- Monitor container resource usage
- Adjust container memory limits in compose.prod.yaml if needed
- Enable Redis caching for session storage

## Support

For issues, refer to:

- [README.md](../README.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [SECURITY.md](./SECURITY.md)
