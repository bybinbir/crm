# CRM Analiz Platform - Native Deployment Guide

## Overview

CRM Analiz uses **host-native systemd services** for production deployment. No Docker or containers.

**Architecture:**

- NestJS API: systemd service on port 3000
- Next.js Web: systemd service on port 4000
- Nginx: Reverse proxy (ports 80/443)
- PostgreSQL: Native PostgreSQL service
- Redis: Native Redis service

**Deployment Method:** Git-based, zero-downtime rollout

---

## Prerequisites

### Server Requirements

- Ubuntu 20.04 LTS or higher (22.04 recommended)
- Minimum 2GB RAM, 2 CPU cores
- 20GB disk space
- Root or sudo access
- Domain: analiz.binbirnet.com.tr pointed to server IP

### Required Software

- Node.js 20.x LTS
- pnpm 9.x
- PostgreSQL 16
- Redis 7.x
- Nginx
- Git
- Certbot (for SSL certificates)

---

## Initial Server Setup

### 1. Install System Dependencies

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm@9

# Install PostgreSQL 16
sudo apt-get install -y postgresql-16 postgresql-client-16

# Install Redis
sudo apt-get install -y redis-server

# Install Nginx
sudo apt-get install -y nginx

# Install other dependencies
sudo apt-get install -y git certbot python3-certbot-nginx curl jq
```

### 2. Create Deploy User

```bash
# Create deploy user (runs application processes)
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG sudo deploy

# Set up SSH key for deploy user (for Git operations)
sudo -u deploy ssh-keygen -t ed25519 -C "deploy@analiz.binbirnet.com.tr"
```

### 3. Create Directory Structure

```bash
# Application directory
sudo mkdir -p /var/www/crmanaliz
sudo chown -R deploy:deploy /var/www/crmanaliz

# Configuration directory
sudo mkdir -p /etc/crmanaliz
sudo chown root:deploy /etc/crmanaliz
sudo chmod 750 /etc/crmanaliz

# Backup directory
sudo mkdir -p /var/backups/crmanaliz/{postgres,config}
sudo chown -R deploy:deploy /var/backups/crmanaliz

# Log directory
sudo mkdir -p /var/log/crmanaliz
sudo chown -R deploy:deploy /var/log/crmanaliz
```

### 4. Clone Repository

```bash
cd /var/www/crmanaliz
sudo -u deploy git clone <repository-url> .
```

---

## Configuration

### 1. PostgreSQL Setup

```bash
# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE crmanaliz;
CREATE USER crmanaliz WITH ENCRYPTED PASSWORD 'CHANGE_ME';
GRANT ALL PRIVILEGES ON DATABASE crmanaliz TO crmanaliz;
ALTER DATABASE crmanaliz OWNER TO crmanaliz;
EOF
```

### 2. Environment Files

Create `/etc/crmanaliz/api.env`:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://crmanaliz:CHANGE_ME@localhost:5432/crmanaliz
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=CHANGE_ME_LONG_RANDOM_STRING
JWT_REFRESH_SECRET=CHANGE_ME_DIFFERENT_RANDOM_STRING
ENCRYPTION_KEY=CHANGE_ME_32_CHAR_BASE64_STRING
CORS_ORIGINS=https://analiz.binbirnet.com.tr
```

Create `/etc/crmanaliz/web.env`:

```env
NODE_ENV=production
PORT=4000
NEXT_PUBLIC_API_URL=https://analiz.binbirnet.com.tr/api/v1
NEXTAUTH_URL=https://analiz.binbirnet.com.tr
NEXTAUTH_SECRET=CHANGE_ME_LONG_RANDOM_STRING
```

Set secure permissions:

```bash
sudo chown root:deploy /etc/crmanaliz/*.env
sudo chmod 640 /etc/crmanaliz/*.env
```

### 3. Systemd Service Units

See `docs/ops/RUNBOOK_PRODUCTION.md` for systemd unit configurations.

Units to create:

- `/etc/systemd/system/crm-analiz-api.service`
- `/etc/systemd/system/crm-analiz-web.service`
- `/etc/systemd/system/crmanaliz-backup.timer`
- `/etc/systemd/system/crmanaliz-backup.service`

### 4. Nginx Configuration

See `deployment/nginx/crmanaliz.conf` for full Nginx configuration.

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/crmanaliz.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL Certificate

```bash
sudo certbot --nginx -d analiz.binbirnet.com.tr
```

---

## Deployment

### First-Time Deployment

```bash
cd /var/www/crmanaliz

# Install dependencies
pnpm install --frozen-lockfile

# Build applications
pnpm build

# Run database migrations
cd apps/api
pnpm run migration:run
cd ../..

# Enable and start services
sudo systemctl enable crm-analiz-api crm-analiz-web
sudo systemctl start crm-analiz-api crm-analiz-web

# Enable automated backups
sudo systemctl enable crmanaliz-backup.timer
sudo systemctl start crmanaliz-backup.timer
```

### Subsequent Deployments

Use the standardized deployment script:

```bash
cd /var/www/crmanaliz
sudo -u deploy ./scripts/deploy-production.sh
```

This script:

- Pulls latest code from Git
- Installs dependencies with frozen lockfile
- Builds applications
- Runs migrations
- Restarts services
- Performs health checks
- Generates release metadata

See `docs/ops/DEPLOYMENT_STANDARD.md` for detailed deployment procedures.

---

## Rollback

If deployment fails or issues arise:

```bash
cd /var/www/crmanaliz
sudo -u deploy ./scripts/rollback-production.sh <commit-sha>
```

This script:

- Resets Git to specified commit
- Rebuilds applications
- Restarts services
- Verifies health

---

## Backup & Recovery

### Automated Backups

Systemd timer runs daily at 02:00 UTC:

```bash
# Check backup timer status
sudo systemctl status crmanaliz-backup.timer

# View recent backups
ls -lh /var/backups/crmanaliz/postgres/
```

### Manual Backup

```bash
sudo -u deploy /var/www/crmanaliz/scripts/backup-postgres.sh
```

### Restore from Backup

```bash
sudo -u deploy /var/www/crmanaliz/scripts/restore-postgres.sh /var/backups/crmanaliz/postgres/crmanaliz-TIMESTAMP.sql.gz
```

See `docs/ops/BACKUP_AND_RECOVERY.md` for comprehensive backup documentation.

---

## Health Checks

### System Health

```bash
cd /var/www/crmanaliz
./scripts/health-check-production.sh
```

Checks:

- Systemd service status (api, web, nginx, postgresql, redis)
- Port availability (80, 443, 3000, 4000)
- HTTP endpoints (/, /api/v1/health)
- Disk space and memory usage

### Diagnostics

For troubleshooting:

```bash
cd /var/www/crmanaliz
./scripts/diagnose-production.sh
```

Collects:

- Service status and logs (last 50 lines)
- Port bindings and process ownership
- Nginx configuration test
- System resource usage

---

## Operational Runbooks

Comprehensive operational documentation:

- **`docs/ops/RUNBOOK_PRODUCTION.md`** - Day-to-day operations, service management, common issues
- **`docs/ops/DEPLOYMENT_STANDARD.md`** - Standardized deployment workflow and checklists
- **`docs/ops/BACKUP_AND_RECOVERY.md`** - Backup system and disaster recovery procedures

---

## Service Management

### Check Service Status

```bash
sudo systemctl status crm-analiz-api
sudo systemctl status crm-analiz-web
```

### View Logs

```bash
# API logs
sudo journalctl -u crm-analiz-api -n 100 -f

# Web logs
sudo journalctl -u crm-analiz-web -n 100 -f
```

### Restart Services

```bash
sudo systemctl restart crm-analiz-api
sudo systemctl restart crm-analiz-web
```

### Stop/Start Services

```bash
# Stop
sudo systemctl stop crm-analiz-api crm-analiz-web

# Start
sudo systemctl start crm-analiz-api crm-analiz-web
```

---

## Monitoring

### Real-time Monitoring

```bash
# Watch service status
watch -n 2 'systemctl is-active crm-analiz-api crm-analiz-web nginx postgresql redis'

# Monitor resource usage
htop
```

### Log Rotation

Systemd journald handles log rotation automatically. Configure retention:

```bash
# Edit journald config
sudo nano /etc/systemd/journald.conf

# Set retention (example: 7 days)
MaxRetentionSec=7day
SystemMaxUse=500M

# Restart journald
sudo systemctl restart systemd-journald
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check service status and errors
sudo systemctl status crm-analiz-api
sudo journalctl -u crm-analiz-api -n 50

# Common issues:
# - Port already in use: check with `sudo lsof -i :3000`
# - Environment file missing: verify /etc/crmanaliz/api.env exists
# - Database connection: check DATABASE_URL and PostgreSQL status
```

### API Returning 502 Bad Gateway

```bash
# Check if API process is running
sudo systemctl status crm-analiz-api

# Check API logs for errors
sudo journalctl -u crm-analiz-api -n 100

# Verify API is listening on port 3000
sudo lsof -i :3000

# Test API directly
curl http://localhost:3000/api/v1/health
```

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
sudo -u postgres psql -d crmanaliz -c "SELECT 1;"

# Verify DATABASE_URL in /etc/crmanaliz/api.env
```

### High Memory Usage

```bash
# Check process memory usage
ps aux --sort=-%mem | head -10

# Restart services to free memory
sudo systemctl restart crm-analiz-api crm-analiz-web
```

---

## Security Hardening

### File Permissions

```bash
# Application files: deploy user
sudo chown -R deploy:deploy /var/www/crmanaliz

# Environment files: root with restricted access
sudo chown root:deploy /etc/crmanaliz/*.env
sudo chmod 640 /etc/crmanaliz/*.env

# Backup files: deploy user only
sudo chown -R deploy:deploy /var/backups/crmanaliz
sudo chmod 700 /var/backups/crmanaliz
```

### Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### SSH Hardening

```bash
# Disable root SSH login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

---

## Maintenance Windows

### Planned Downtime

```bash
# 1. Notify users (optional: put up maintenance page)
# 2. Stop services
sudo systemctl stop crm-analiz-api crm-analiz-web

# 3. Perform maintenance (updates, migrations, etc.)
# 4. Start services
sudo systemctl start crm-analiz-api crm-analiz-web

# 5. Run health check
./scripts/health-check-production.sh
```

### Zero-Downtime Updates

Use the standard deployment script - it handles graceful restarts:

```bash
./scripts/deploy-production.sh
```

---

## Legacy Docker Files

Previous Docker-based deployment files are archived in `archive/legacy-docker/` for historical reference only. Production uses native systemd services exclusively.

---

## Support

For operational issues, consult:

1. `docs/ops/RUNBOOK_PRODUCTION.md` - Operations manual
2. `scripts/diagnose-production.sh` - Automated diagnostics
3. `scripts/health-check-production.sh` - Health verification

For development setup, see `docs/LOCAL_SETUP.md`.
