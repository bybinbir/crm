# CRM Analiz Platform - Deployment Guide

**Target:** analiz.binbirnet.com.tr (194.15.45.47)
**Date:** 2026-03-25
**Branch:** feature/core-implementation

---

## Prerequisites

- Server: Ubuntu/Debian Linux
- Root access: root@194.15.45.47
- Domain: analiz.binbirnet.com.tr → 194.15.45.47
- Deployment package: `/tmp/crmanaliz-deploy.tar.gz` (3.5 MB)

---

## Phase 1: Infrastructure Setup (10 minutes)

### 1.1 Connect to Server

```bash
ssh root@194.15.45.47
# Password: [provided separately]
```

### 1.2 Install Docker

```bash
# Update system
apt-get update && apt-get upgrade -y

# Install dependencies
apt-get install -y curl git unzip ca-certificates gnupg lsb-release ufw fail2ban

# Install Docker
curl -fsSL https://get.docker.com | sh

# Enable and start Docker
systemctl enable docker
systemctl start docker

# Verify
docker --version
docker compose version
```

### 1.3 Create Deploy User

```bash
# Create user
useradd -m -s /bin/bash deploy

# Add to docker group
usermod -aG docker deploy

# Grant sudo access
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
chmod 0440 /etc/sudoers.d/deploy

# Verify
id deploy
```

### 1.4 Create Directory Structure

```bash
# Create directories
mkdir -p /opt/crm-analiz/{app,env,logs,backups}

# Set ownership
chown -R deploy:deploy /opt/crm-analiz

# Verify
ls -la /opt/crm-analiz
```

### 1.5 Configure Firewall

```bash
# Enable firewall
ufw --force enable

# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Check status
ufw status
```

---

## Phase 2: Application Deployment (15 minutes)

### 2.1 Transfer Repository

**On your local machine:**

```bash
cd /f/crmanaliz
tar --exclude='node_modules' --exclude='.next' --exclude='dist' --exclude='.git' -czf /tmp/crmanaliz-deploy.tar.gz .

scp /tmp/crmanaliz-deploy.tar.gz root@194.15.45.47:/tmp/
```

**On server:**

```bash
cd /opt/crm-analiz/app
tar -xzf /tmp/crmanaliz-deploy.tar.gz
chown -R deploy:deploy /opt/crm-analiz/app
```

### 2.2 Install Node.js and pnpm

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node
node --version  # Should be v20.x
npm --version

# Install pnpm
npm install -g pnpm

# Verify pnpm
pnpm --version
```

### 2.3 Generate Application Secrets

```bash
# Generate secrets
JWT_ACCESS_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 16)
REDIS_PASSWORD=$(openssl rand -base64 16)

echo "Generated secrets (SAVE THESE SECURELY):"
echo "JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo "DB_PASSWORD=$DB_PASSWORD"
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
```

### 2.4 Create Environment Configuration

```bash
cat > /opt/crm-analiz/env/.env << 'ENV_EOF'
# Application
NODE_ENV=production
PORT=4000

# Web App
NEXT_PUBLIC_API_URL=http://analiz.binbirnet.com.tr:4000/api/v1

# Database (PostgreSQL)
DATABASE_URL=postgresql://crmanaliz:[DB_PASSWORD]@localhost:5432/crmanaliz
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=crmanaliz
DATABASE_USER=crmanaliz
DATABASE_PASSWORD=[DB_PASSWORD]

# Redis
REDIS_URL=redis://:[REDIS_PASSWORD]@localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=[REDIS_PASSWORD]

# JWT & Authentication
JWT_ACCESS_SECRET=[JWT_ACCESS_SECRET]
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=[JWT_REFRESH_SECRET]
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=[ENCRYPTION_KEY]

# Bootstrap Admin User
DEFAULT_ADMIN_EMAIL=admin@bullvar.com
DEFAULT_ADMIN_PASSWORD=Admin2025!Bullvar

# ISSmanager Integration (Placeholder)
ISSMANAGER_DEFAULT_TIMEOUT_MS=30000

# CORS
CORS_ORIGIN=http://analiz.binbirnet.com.tr,https://analiz.binbirnet.com.tr

# Logging
LOG_LEVEL=info

# Feature Flags
ENABLE_SWAGGER=false
ENABLE_METRICS=true

# App URLs
APP_URL=http://analiz.binbirnet.com.tr
API_URL=http://analiz.binbirnet.com.tr:4000/api
ENV_EOF

# Replace placeholders with actual secrets
sed -i "s/\[DB_PASSWORD\]/$DB_PASSWORD/g" /opt/crm-analiz/env/.env
sed -i "s/\[REDIS_PASSWORD\]/$REDIS_PASSWORD/g" /opt/crm-analiz/env/.env
sed -i "s/\[JWT_ACCESS_SECRET\]/$JWT_ACCESS_SECRET/g" /opt/crm-analiz/env/.env
sed -i "s/\[JWT_REFRESH_SECRET\]/$JWT_REFRESH_SECRET/g" /opt/crm-analiz/env/.env
sed -i "s/\[ENCRYPTION_KEY\]/$ENCRYPTION_KEY/g" /opt/crm-analiz/env/.env

# Link env file
ln -sf /opt/crm-analiz/env/.env /opt/crm-analiz/app/.env
ln -sf /opt/crm-analiz/env/.env /opt/crm-analiz/app/apps/api/.env

# Secure permissions
chmod 600 /opt/crm-analiz/env/.env
chown deploy:deploy /opt/crm-analiz/env/.env
```

### 2.5 Install Dependencies and Build

```bash
# Switch to deploy user
su - deploy
cd /opt/crm-analiz/app

# Install dependencies
pnpm install --frozen-lockfile

# Build application
pnpm build

# Verify build
ls -la apps/api/dist
ls -la apps/web/.next
```

---

## Phase 3: Database Setup (5 minutes)

### 3.1 Start PostgreSQL and Redis

```bash
cd /opt/crm-analiz/app

# Start infrastructure containers
docker compose up -d postgres redis

# Wait for containers to be healthy
sleep 15

# Check status
docker compose ps

# Expected output:
# NAME                  STATUS
# crmanaliz-postgres    Up (healthy)
# crmanaliz-redis       Up (healthy)
```

### 3.2 Run Prisma Migrations

```bash
cd /opt/crm-analiz/app/apps/api

# Generate Prisma Client
npx prisma generate

# Apply migrations
npx prisma migrate deploy

# Expected output:
# ✓ All migrations have been applied
# Migration: 20260325082952_initial_schema
```

### 3.3 Seed Database

```bash
# Run seed script
npx prisma db seed

# Expected output:
# 🌱 Starting database seed...
# ✅ Created admin user: admin@bullvar.com
# 📧 Email: admin@bullvar.com
# 🔑 Password: Admin2025!Bullvar
# ⚠️  IMPORTANT: Change this password immediately in production!
# 🌱 Database seed completed successfully!
```

### 3.4 Verify Database

```bash
# Connect to PostgreSQL
docker exec -it crmanaliz-postgres psql -U crmanaliz -d crmanaliz

# Check tables
\dt

# Check admin user
SELECT id, email, role, "isActive" FROM users;

# Exit
\q
```

---

## Phase 4: Application Startup (5 minutes)

### 4.1 Start API and Web Containers

```bash
cd /opt/crm-analiz/app

# Start application containers
docker compose up -d api web

# Wait for startup
sleep 10

# Check all containers
docker compose ps

# Expected output:
# NAME                  STATUS
# crmanaliz-postgres    Up (healthy)
# crmanaliz-redis       Up (healthy)
# crmanaliz-api         Up
# crmanaliz-web         Up
```

### 4.2 Check Container Logs

```bash
# API logs
docker compose logs api --tail=50

# Web logs
docker compose logs web --tail=50

# Look for:
# ✅ "Nest application successfully started"
# ✅ "Ready on http://0.0.0.0:3000"
```

---

## Phase 5: Validation (10 minutes)

### 5.1 API Health Check

```bash
curl http://localhost:4000/api/v1/health

# Expected output:
# {"status":"ok","uptime":XXX}
```

### 5.2 Test Login Endpoint

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bullvar.com","password":"Admin2025!Bullvar"}'

# Expected output (truncated):
# {
#   "accessToken": "eyJhbGc...",
#   "refreshToken": "eyJhbGc...",
#   "user": {
#     "id": "...",
#     "email": "admin@bullvar.com",
#     "role": "SUPER_ADMIN"
#   }
# }

# Save the accessToken for next steps
export ACCESS_TOKEN="[paste accessToken here]"
```

### 5.3 Test Dashboard Endpoint

```bash
curl http://localhost:3000/ -I

# Expected:
# HTTP/1.1 307 Temporary Redirect
# Location: /login
```

### 5.4 Test Audit Logs Endpoint

```bash
curl http://localhost:4000/api/v1/audit-logs \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Expected output:
# [
#   {
#     "id": "...",
#     "action": "LOGIN_SUCCESS",
#     "userId": "...",
#     "createdAt": "..."
#   }
# ]
```

### 5.5 Test Integration Config

```bash
# Create integration config
curl -X POST http://localhost:4000/api/v1/integrations/configs \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "ISSMANAGER",
    "name": "ISSmanager Test",
    "baseUrl": "https://test.issmanager.example.com",
    "apiKey": "test-key-placeholder",
    "timeoutMs": 30000,
    "isEnabled": true
  }'

# Expected output:
# {
#   "id": "...",
#   "provider": "ISSMANAGER",
#   "name": "ISSmanager Test",
#   "status": "PENDING"
# }
```

### 5.6 Test Connection to ISSmanager

```bash
# Save config ID from previous response
export CONFIG_ID="[paste id here]"

# Test connection
curl -X POST "http://localhost:4000/api/v1/integrations/configs/$CONFIG_ID/test" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Expected output (will fail with placeholder):
# {
#   "success": false,
#   "message": "Connection failed",
#   "error": "Unable to connect to ISSmanager API..."
# }

# This is EXPECTED because we're using placeholder endpoints
```

### 5.7 Verify Audit Logs Updated

```bash
curl http://localhost:4000/api/v1/audit-logs \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Expected: Should now show multiple events:
# - LOGIN_SUCCESS
# - INTEGRATION_CREATED
# - INTEGRATION_TESTED
```

---

## Phase 6: External Access Configuration (Optional)

### 6.1 Update Nginx/Reverse Proxy

If using Nginx:

```nginx
server {
    listen 80;
    server_name analiz.binbirnet.com.tr;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:4000/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 6.2 Install SSL Certificate (Certbot)

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d analiz.binbirnet.com.tr
```

---

## Phase 7: Post-Deployment Checklist

- [ ] All containers running (`docker compose ps`)
- [ ] Database migrated (`npx prisma migrate status`)
- [ ] Admin user seeded (database check)
- [ ] API health check passing
- [ ] Login endpoint working
- [ ] Dashboard accessible
- [ ] Audit logs visible
- [ ] Integration config saveable
- [ ] Logs clean (no errors)
- [ ] Firewall configured
- [ ] SSL certificate installed (optional)

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs [service-name]

# Restart service
docker compose restart [service-name]

# Rebuild if needed
docker compose up -d --build [service-name]
```

### Database Connection Error

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Check DATABASE_URL in .env
cat /opt/crm-analiz/env/.env | grep DATABASE_URL

# Test connection
docker exec -it crmanaliz-postgres psql -U crmanaliz -d crmanaliz -c "SELECT 1;"
```

### Migration Fails

```bash
# Reset migrations (CAUTION: deletes data)
cd apps/api
npx prisma migrate reset

# Or apply specific migration
npx prisma migrate deploy
```

### Port Already in Use

```bash
# Check what's using port
lsof -i :4000
lsof -i :3000

# Kill process if needed
kill -9 [PID]
```

---

## Maintenance

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f web
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart specific
docker compose restart api
```

### Stop Services

```bash
# Stop all
docker compose stop

# Stop specific
docker compose stop api web
```

### Backup Database

```bash
docker exec crmanaliz-postgres pg_dump -U crmanaliz crmanaliz > /opt/crm-analiz/backups/backup-$(date +%Y%m%d-%H%M%S).sql
```

### Restore Database

```bash
docker exec -i crmanaliz-postgres psql -U crmanaliz crmanaliz < /opt/crm-analiz/backups/backup-XXXXXX.sql
```

---

## Access Information

**Web Application:**

- URL: http://analiz.binbirnet.com.tr (or http://194.15.45.47:3000)
- Admin Email: admin@bullvar.com
- Admin Password: Admin2025!Bullvar

**API:**

- URL: http://analiz.binbirnet.com.tr:4000/api/v1
- Health: http://analiz.binbirnet.com.tr:4000/api/v1/health

**Database:**

- Host: localhost:5432
- Database: crmanaliz
- User: crmanaliz
- Password: [from .env]

**Redis:**

- Host: localhost:6379
- Password: [from .env]

---

## Security Notes

1. **Change default admin password immediately after first login**
2. **Secure .env file** (`chmod 600 /opt/crm-analiz/env/.env`)
3. **Enable firewall** (`ufw enable`)
4. **Install fail2ban** for SSH protection
5. **Use SSH keys** instead of password
6. **Install SSL certificate** for HTTPS
7. **Regular backups** of database
8. **Monitor logs** for suspicious activity

---

## ISSmanager Integration

**Status:** Placeholder implementation

**When real ISSmanager credentials are available:**

1. Update environment:

   ```bash
   nano /opt/crm-analiz/env/.env
   # Add:
   # ISSMANAGER_BASE_URL=https://real-issmanager-url.com
   # ISSMANAGER_API_KEY=real-api-key
   ```

2. Update client code (`apps/api/src/modules/integrations/issmanager/issmanager.client.ts`)
   - Replace placeholder endpoints with real API paths
   - Update authentication method if needed
   - Implement field mapping based on real API response

3. Rebuild and restart:

   ```bash
   cd /opt/crm-analiz/app
   pnpm build
   docker compose restart api
   ```

4. Test connection again - should now succeed

---

## Support

For issues or questions:

- Check logs: `docker compose logs`
- Review troubleshooting section above
- Check CLAUDE.md and task_dash.md in repository

---

**Deployment Version:** 1.0
**Last Updated:** 2026-03-25
**Branch:** feature/core-implementation
**Commit:** bc43959
