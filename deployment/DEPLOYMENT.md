# CRM Analiz - Production Deployment Guide

## Overview

This guide covers the production deployment of CRM Analiz platform with proper security hardening, reverse proxy configuration, and SSL setup.

## Architecture

```
Internet → Nginx (443) → Backend API (4000) + Next.js Web (3000)
```

- **Public Access:** https://analiz.binbirnet.com.tr
- **Internal API:** localhost:4000
- **Internal Web:** localhost:3000
- **Reverse Proxy:** Nginx with SSL, security headers, rate limiting

## Prerequisites

- Ubuntu/Debian server with sudo access
- Domain pointed to server IP (analiz.binbirnet.com.tr)
- Node.js 20+ and pnpm installed
- PostgreSQL database running
- Git access to repository

## 1. System Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y nginx certbot python3-certbot-nginx postgresql-client git curl

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc

# Verify installations
node --version  # Should be v20.x
pnpm --version  # Should be 9.x
nginx -v        # Should be 1.18+
```

## 2. Database Setup

```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE crmanaliz;
CREATE USER crmanaliz_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE crmanaliz TO crmanaliz_user;
\c crmanaliz
GRANT ALL ON SCHEMA public TO crmanaliz_user;
EOF
```

## 3. Application Deployment

```bash
# Create application directory
sudo mkdir -p /opt/crmanaliz
sudo chown $USER:$USER /opt/crmanaliz

# Clone repository
cd /opt/crmanaliz
git clone <repository-url> .
git checkout main  # or production branch

# Install dependencies
pnpm install --frozen-lockfile

# Create environment file for API
cd apps/api
cp .env.example .env

# Edit .env with production values
nano .env
```

**Important Environment Variables:**

```bash
# Database
DATABASE_URL=postgresql://crmanaliz_user:your_password@localhost:5432/crmanaliz

# Encryption (generate with: openssl rand -base64 32)
ENCRYPTION_KEY=your-32-char-minimum-encryption-key

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET=your-jwt-access-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret

# Server
PORT=4000
NODE_ENV=production

# CORS - Important: use same domain
CORS_ORIGIN=https://analiz.binbirnet.com.tr
```

```bash
# Run database migrations
cd /opt/crmanaliz/apps/api
pnpm prisma migrate deploy

# Seed initial data (creates admin user)
pnpm prisma db seed

# Build all applications
cd /opt/crmanaliz
pnpm build
```

## 4. Systemd Service Setup

Create service files for API and Web:

```bash
# API Service
sudo tee /etc/systemd/system/crmanaliz-api.service > /dev/null << 'EOF'
[Unit]
Description=CRM Analiz API Service
After=network.target postgresql.service

[Service]
Type=simple
User=your_user
WorkingDirectory=/opt/crmanaliz/apps/api
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=crmanaliz-api

[Install]
WantedBy=multi-user.target
EOF

# Web Service
sudo tee /etc/systemd/system/crmanaliz-web.service > /dev/null << 'EOF'
[Unit]
Description=CRM Analiz Web Service
After=network.target crmanaliz-api.service

[Service]
Type=simple
User=your_user
WorkingDirectory=/opt/crmanaliz/apps/web
Environment=NODE_ENV=production
ExecStart=/usr/bin/node .next/standalone/apps/web/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=crmanaliz-web

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Enable and start services
sudo systemctl enable crmanaliz-api
sudo systemctl enable crmanaliz-web
sudo systemctl start crmanaliz-api
sudo systemctl start crmanaliz-web

# Check status
sudo systemctl status crmanaliz-api
sudo systemctl status crmanaliz-web

# View logs
sudo journalctl -u crmanaliz-api -f
sudo journalctl -u crmanaliz-web -f
```

## 5. Nginx Configuration

```bash
# Copy nginx config
sudo cp /opt/crmanaliz/deployment/nginx/crmanaliz.conf /etc/nginx/sites-available/

# Create symbolic link
sudo ln -s /etc/nginx/sites-available/crmanaliz.conf /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

## 6. SSL Certificate Setup

```bash
# Obtain Let's Encrypt certificate
sudo certbot --nginx -d analiz.binbirnet.com.tr

# Certbot will automatically:
# - Obtain certificate
# - Configure SSL in nginx
# - Set up auto-renewal

# Test auto-renewal
sudo certbot renew --dry-run

# Certificate will auto-renew via cron/systemd timer
```

## 7. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Verify rules
sudo ufw status

# Output should show:
# To                         Action      From
# --                         ------      ----
# OpenSSH                    ALLOW       Anywhere
# Nginx Full                 ALLOW       Anywhere
```

## 8. Post-Deployment Verification

```bash
# 1. Check services are running
sudo systemctl status crmanaliz-api
sudo systemctl status crmanaliz-web
sudo systemctl status nginx

# 2. Check ports (should only show nginx on 80/443)
sudo ss -tulpn | grep -E ':(80|443|3000|4000)'

# 3. Test health endpoint
curl -k https://analiz.binbirnet.com.tr/api/v1/health

# Expected response: {"status":"ok","timestamp":"..."}

# 4. Test login page
curl -I https://analiz.binbirnet.com.tr/login

# Expected: 200 OK with security headers

# 5. Check security headers
curl -I https://analiz.binbirnet.com.tr

# Should see:
# - Strict-Transport-Security
# - X-Frame-Options
# - X-Content-Type-Options
# - X-XSS-Protection
# - Referrer-Policy
# - Content-Security-Policy

# 6. Test login (replace with actual credentials)
curl -X POST https://analiz.binbirnet.com.tr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bullvar.com","password":"your_password"}' \
  -v

# Should see Set-Cookie headers with HttpOnly flag
```

## 9. Monitoring and Logs

```bash
# Application logs
sudo journalctl -u crmanaliz-api -f     # API logs
sudo journalctl -u crmanaliz-web -f     # Web logs

# Nginx logs
sudo tail -f /var/log/nginx/crmanaliz-access.log
sudo tail -f /var/log/nginx/crmanaliz-error.log

# Database logs
sudo journalctl -u postgresql -f
```

## 10. Backup Strategy

```bash
# Create backup script
sudo tee /opt/crmanaliz/backup.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/crmanaliz"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U crmanaliz_user -d crmanaliz | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup .env files
tar -czf $BACKUP_DIR/env_$DATE.tar.gz /opt/crmanaliz/apps/api/.env

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

sudo chmod +x /opt/crmanaliz/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/crmanaliz/backup.sh") | crontab -
```

## 11. Updates and Maintenance

```bash
# To update application:
cd /opt/crmanaliz
git pull origin main
pnpm install --frozen-lockfile
pnpm build

# Run migrations if needed
cd apps/api
pnpm prisma migrate deploy

# Restart services
sudo systemctl restart crmanaliz-api
sudo systemctl restart crmanaliz-web

# Verify
curl https://analiz.binbirnet.com.tr/api/v1/health
```

## 12. Rollback Procedure

```bash
# If update causes issues:
cd /opt/crmanaliz
git log --oneline -5  # Find previous commit
git checkout <previous-commit-hash>
pnpm install --frozen-lockfile
pnpm build
sudo systemctl restart crmanaliz-api
sudo systemctl restart crmanaliz-web
```

## Security Checklist

- [x] HTTPS enforced (HTTP redirects to HTTPS)
- [x] SSL certificate valid and auto-renewing
- [x] Security headers configured
- [x] Rate limiting enabled on auth endpoints
- [x] HttpOnly cookies for authentication
- [x] CORS configured correctly
- [x] Firewall rules active
- [x] Internal services not exposed (ports 3000, 4000 internal only)
- [x] Database access restricted
- [x] Strong secrets and encryption keys
- [x] Regular backups configured
- [x] Application logs monitored
- [x] Services configured to restart on failure

## Troubleshooting

### Services won't start

```bash
# Check logs
sudo journalctl -u crmanaliz-api -n 50
sudo journalctl -u crmanaliz-web -n 50

# Check environment variables
sudo -u your_user cat /opt/crmanaliz/apps/api/.env

# Check database connection
cd /opt/crmanaliz/apps/api
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"
```

### 502 Bad Gateway

```bash
# Check if backend services are running
sudo systemctl status crmanaliz-api
sudo systemctl status crmanaliz-web

# Check if ports are listening
sudo ss -tulpn | grep -E ':(3000|4000)'

# Check nginx error log
sudo tail -f /var/log/nginx/crmanaliz-error.log
```

### Login not working

```bash
# Check cookies are being set
curl -X POST https://analiz.binbirnet.com.tr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bullvar.com","password":"your_password"}' \
  -v 2>&1 | grep -i "set-cookie"

# Verify CORS_ORIGIN matches domain
grep CORS_ORIGIN /opt/crmanaliz/apps/api/.env

# Should be: CORS_ORIGIN=https://analiz.binbirnet.com.tr
```

## Support

For issues or questions:

1. Check logs: `sudo journalctl -u crmanaliz-api -f`
2. Review nginx logs: `sudo tail -f /var/log/nginx/crmanaliz-error.log`
3. Verify configuration: `sudo nginx -t`
4. Test health endpoint: `curl https://analiz.binbirnet.com.tr/api/v1/health`
