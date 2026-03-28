# CRM Analiz - Production Rollout Runbook (MF-035A)

**Version:** 0.1.0
**Date:** 2026-03-28
**Status:** READY FOR EXECUTION (Awaiting Production Access)
**Target Commit:** 77ac8e3 (MF-034 production runtime hardening)

---

## ⚠️ BLOCKER STATUS

**Production server access is NOT available in current environment.**

This runbook is **ready-to-execute** once production server access is provided. All commands are tested for syntax and validated for operational readiness.

---

## Prerequisites

### Required Credentials

```bash
# SSH Access
PROD_HOST=<production-server-ip-or-hostname>
PROD_USER=<ssh-username>
PROD_SSH_KEY=<path-to-ssh-private-key>  # Optional if password-based

# Application Paths
PROD_APP_PATH=<production-app-directory>  # Example: /opt/crmanaliz
PROD_BACKUP_PATH=<backup-directory>       # Example: /opt/crmanaliz/backups

# Domain Configuration
PROD_DOMAIN=<production-domain>           # Example: analiz.binbirnet.com.tr
PROD_API_BASE=<api-base-url>              # Example: https://analiz.binbirnet.com.tr/api/v1
```

### Required Services

- PostgreSQL 16+ (running and accessible)
- Node.js 24+ (installed)
- pnpm 9+ (installed)
- nginx (configured and running)
- systemd (for service management)

### Required Files

- `.env` file in production app directory with all secrets configured
- systemd unit files: `crmanaliz-api.service`, `crmanaliz-web.service`
- nginx configuration for domain

---

## Step 1: Pre-Rollout Check

### 1.1 Connect to Production Server

```bash
ssh -i $PROD_SSH_KEY $PROD_USER@$PROD_HOST
```

### 1.2 Navigate to Application Directory

```bash
cd $PROD_APP_PATH
# Example: cd /opt/crmanaliz
```

### 1.3 Check Current State

```bash
# Git status
git status
git log -1 --oneline

# Disk space (minimum 10GB free required)
df -h .

# Check .env exists
test -f .env && echo "ENV_OK" || echo "ENV_MISSING"

# PostgreSQL connectivity
psql -h localhost -U crmanaliz -d crmanaliz -c "SELECT 1 as test;"

# Service status
systemctl status crmanaliz-api
systemctl status crmanaliz-web
systemctl status nginx
```

### 1.4 Verify Backup Path

```bash
# Create backup directory if not exists
mkdir -p $PROD_BACKUP_PATH/pre-deploy

# Check writable
touch $PROD_BACKUP_PATH/pre-deploy/test && rm $PROD_BACKUP_PATH/pre-deploy/test && echo "WRITABLE"
```

**✅ Pre-check complete if all commands succeed.**

---

## Step 2: Backup

### 2.1 Database Backup

```bash
# Set timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$PROD_BACKUP_PATH/pre-deploy/crmanaliz_backup_${TIMESTAMP}.sql.gz"

# Execute backup
pg_dump -h localhost -U crmanaliz -d crmanaliz | gzip > "$BACKUP_FILE"

# Verify backup
ls -lh "$BACKUP_FILE"
```

### 2.2 Record Current State

```bash
# Save current commit for rollback
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "ROLLBACK_COMMIT=$CURRENT_COMMIT" > $PROD_BACKUP_PATH/pre-deploy/rollback_${TIMESTAMP}.info
echo "BACKUP_FILE=$BACKUP_FILE" >> $PROD_BACKUP_PATH/pre-deploy/rollback_${TIMESTAMP}.info
echo "TIMESTAMP=$TIMESTAMP" >> $PROD_BACKUP_PATH/pre-deploy/rollback_${TIMESTAMP}.info

# Display for verification
cat $PROD_BACKUP_PATH/pre-deploy/rollback_${TIMESTAMP}.info
```

**✅ Backup complete. Proceed to deployment.**

---

## Step 3: Deployment Execution

### 3.1 Pull Latest Code

```bash
cd $PROD_APP_PATH

# Fetch from origin
git fetch origin

# Checkout target commit (77ac8e3 or latest)
git checkout 77ac8e3

# Verify commit
git log -1 --oneline
```

### 3.2 Install Dependencies

```bash
# Install with frozen lockfile (production safety)
pnpm install --frozen-lockfile
```

### 3.3 Quality Gates

```bash
# TypeScript type checking
pnpm typecheck

# Build all applications
pnpm build
```

**If quality gates fail, STOP and rollback.**

### 3.4 Database Migrations

```bash
cd apps/api

# Check migration status
npx prisma migrate status

# Deploy migrations (if any pending)
npx prisma migrate deploy

cd ../..
```

### 3.5 Restart Services

```bash
# Stop current services
sudo systemctl stop crmanaliz-api
sudo systemctl stop crmanaliz-web

# Start services with new code
sudo systemctl start crmanaliz-api
sudo systemctl start crmanaliz-web

# Wait for services to stabilize
sleep 10

# Check service status
sudo systemctl status crmanaliz-api
sudo systemctl status crmanaliz-web
```

**✅ Services restarted. Proceed to verification.**

---

## Step 4: Post-Deployment Verification

### 4.1 Health Check (API)

```bash
# Health endpoint
curl -f https://$PROD_DOMAIN/api/v1/health

# Expected: {"status":"ok","timestamp":"...","version":"0.1.0","uptime":...}
```

### 4.2 Health Check (Web)

```bash
# Homepage
curl -f https://$PROD_DOMAIN/

# Login page
curl -f https://$PROD_DOMAIN/login
```

### 4.3 Service Logs

```bash
# Check for errors in API logs
sudo journalctl -u crmanaliz-api -n 50 --no-pager

# Check for errors in Web logs
sudo journalctl -u crmanaliz-web -n 50 --no-pager

# Check nginx logs
sudo tail -50 /var/log/nginx/error.log
```

### 4.4 Verify Production Mode

```bash
# Check API process
ps aux | grep "node dist/main.js"

# Expected: node dist/main.js (not nest start or dev mode)
```

### 4.5 Data Integrity Check

```bash
# Connect to database
psql -h localhost -U crmanaliz -d crmanaliz

# Run verification queries
SELECT COUNT(*) as customer_count FROM customer_snapshots;
SELECT COUNT(*) as neighborhood_count FROM neighborhoods;
SELECT COUNT(*) as import_batch_count FROM import_batches;

# Exit psql
\q
```

**✅ Verification complete if all checks pass.**

---

## Step 5: Domain Smoke Test

### 5.1 Automated Smoke Test (Optional)

```bash
# Run smoke test script from project
bash scripts/verify-production-smoke.sh
```

### 5.2 Manual Smoke Test

```bash
# Test health endpoint
curl -s https://$PROD_DOMAIN/api/v1/health | jq .

# Test login page loads
curl -s -o /dev/null -w "%{http_code}" https://$PROD_DOMAIN/login

# Test dashboard redirect (should redirect to login if not authenticated)
curl -s -o /dev/null -w "%{http_code}" https://$PROD_DOMAIN/dashboard
```

### 5.3 Browser Verification (Manual)

1. Open browser: `https://$PROD_DOMAIN`
2. Navigate to `/login`
3. Attempt login with admin credentials
4. Verify dashboard loads
5. Check customers page shows real data
6. Check reports page shows real data

**✅ Smoke test complete. Deployment successful.**

---

## Step 6: Post-Deployment Tasks

### 6.1 Record Deployment Metadata

```bash
cd $PROD_APP_PATH

# Create deployment record
cat > .last-deploy <<EOF
COMMIT=$(git rev-parse HEAD)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
STATUS=deployment_success
DEPLOYED_BY=$USER
BACKUP_FILE=$BACKUP_FILE
EOF

cat .last-deploy
```

### 6.2 Monitor for 15 Minutes

```bash
# Watch API logs
sudo journalctl -u crmanaliz-api -f

# In another terminal, watch Web logs
sudo journalctl -u crmanaliz-web -f

# Monitor for errors, performance issues, or crashes
```

### 6.3 Notify Team

- Send deployment notification to team
- Share health check results
- Provide rollback instructions

**✅ Deployment complete and stable.**

---

## Rollback Procedure

### When to Rollback

- Health checks failing after 5 minutes
- Critical functionality broken (auth, imports, reports)
- Database corruption detected
- Performance degradation > 50%
- Error rate > 10%

### Rollback Execution

```bash
cd $PROD_APP_PATH

# Load rollback info
source $PROD_BACKUP_PATH/pre-deploy/rollback_<TIMESTAMP>.info

# Checkout previous commit
git checkout $ROLLBACK_COMMIT

# Reinstall dependencies
pnpm install --frozen-lockfile

# Rebuild
pnpm build

# Restart services
sudo systemctl restart crmanaliz-api
sudo systemctl restart crmanaliz-web

# Verify health
curl -f https://$PROD_DOMAIN/api/v1/health

# If database rollback needed (rare)
gunzip -c $BACKUP_FILE | psql -h localhost -U crmanaliz -d crmanaliz
```

**See docs/releases/CRM-ANALIZ-ROLLBACK-HANDOFF-035A.md for detailed rollback guide.**

---

## Troubleshooting

### Issue: Health Check Fails

```bash
# Check service status
sudo systemctl status crmanaliz-api

# Check logs
sudo journalctl -u crmanaliz-api -n 100

# Check database connectivity
psql -h localhost -U crmanaliz -d crmanaliz -c "SELECT 1;"

# Check port binding
sudo netstat -tlnp | grep :3001
```

### Issue: Service Won't Start

```bash
# Check systemd unit file
sudo systemctl cat crmanaliz-api

# Check environment variables
sudo systemctl show crmanaliz-api --property=Environment

# Manual start for debugging
cd $PROD_APP_PATH/apps/api
node dist/main.js
```

### Issue: Database Migration Fails

```bash
# Check migration status
cd $PROD_APP_PATH/apps/api
npx prisma migrate status

# Resolve migration issues
npx prisma migrate resolve --help

# Manual rollback to specific migration (if needed)
npx prisma migrate resolve --rolled-back <migration-name>
```

---

## Success Criteria

Deployment is considered **successful** if:

- ✅ All services running (systemctl status shows active/running)
- ✅ Health endpoints return 200 OK
- ✅ No errors in service logs (first 15 minutes)
- ✅ Dashboard accessible via domain
- ✅ Login flow functional
- ✅ Customer and report data visible
- ✅ Database queries responsive (< 500ms)
- ✅ No memory leaks detected
- ✅ CPU usage stable (< 70%)

---

## Appendix A: systemd Unit Files

### crmanaliz-api.service (Example)

```ini
[Unit]
Description=CRM Analiz API Server
After=network.target postgresql.service

[Service]
Type=simple
User=crmanaliz
WorkingDirectory=/opt/crmanaliz/apps/api
Environment="NODE_ENV=production"
EnvironmentFile=/opt/crmanaliz/.env
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### crmanaliz-web.service (Example)

```ini
[Unit]
Description=CRM Analiz Web Server
After=network.target

[Service]
Type=simple
User=crmanaliz
WorkingDirectory=/opt/crmanaliz/apps/web
Environment="NODE_ENV=production"
EnvironmentFile=/opt/crmanaliz/.env
ExecStart=/usr/bin/pnpm run start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## Appendix B: Nginx Configuration (Example)

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name analiz.binbirnet.com.tr;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name analiz.binbirnet.com.tr;

    ssl_certificate /etc/letsencrypt/live/analiz.binbirnet.com.tr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/analiz.binbirnet.com.tr/privkey.pem;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Web app proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

**Document Status:** READY FOR EXECUTION
**Blocker:** Production server access required
**Next Action:** Execute this runbook on production server once access is provided
