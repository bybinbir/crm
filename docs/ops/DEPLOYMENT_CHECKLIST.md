# CRM Analiz Production Deployment Checklist

**Version:** 1.0
**Last Updated:** 2026-04-01

---

## Pre-Deployment

### Code Review

- [ ] All changes reviewed and approved
- [ ] Tests passing locally
- [ ] TypeScript compilation clean (`pnpm typecheck`)
- [ ] Linting clean (`pnpm lint`)
- [ ] No console.log or debug artifacts

### Database

- [ ] Database migrations tested in staging
- [ ] Backup created before migration
- [ ] Rollback plan documented

### Configuration

- [ ] Environment variables updated (if needed)
- [ ] Secrets rotated (if needed)
- [ ] Feature flags configured

### Communication

- [ ] Stakeholders notified of deployment window
- [ ] Deployment scheduled (off-peak if possible)
- [ ] Rollback plan communicated

---

## Deployment Steps

### 1. Pre-Deployment Backup

```bash
# Create database backup
sudo -u deploy /var/www/crmanaliz/scripts/backup-postgres-daily.sh

# Verify backup created
ls -lh /var/backups/crmanaliz/postgres/ | tail -1
```

- [ ] Backup created successfully
- [ ] Backup file size reasonable

### 2. Health Check (Before)

```bash
# Check all services running
systemctl status crm-analiz-api.service
systemctl status crm-analiz-web.service

# Check API health
curl https://analiz.binbirnet.com.tr/api/v1/health

# Check Web
curl -I https://analiz.binbirnet.com.tr/
```

- [ ] All services active
- [ ] API health OK
- [ ] Web responding

### 3. Git Pull & Build

```bash
cd /var/www/crmanaliz

# Run deployment script
sudo -u deploy ./scripts/deploy-production.sh
```

**Or manual steps:**

```bash
# Fetch latest changes
git fetch origin

# Checkout target branch
git checkout feature/core-implementation

# Pull changes (fast-forward only)
git pull --ff-only origin feature/core-implementation

# Install dependencies
pnpm install --frozen-lockfile

# Build
pnpm build
```

- [ ] Git pull successful
- [ ] Dependencies installed
- [ ] Build completed without errors

### 4. Database Migration (if applicable)

```bash
cd /var/www/crmanaliz/apps/api

# Check migration status
pnpm run migration:status

# Apply migrations (if needed)
pnpm run migration:deploy
```

- [ ] Migrations applied successfully (or no new migrations)

### 5. Restart Services

```bash
# Restart API
sudo systemctl restart crm-analiz-api.service

# Wait 5 seconds
sleep 5

# Restart Web
sudo systemctl restart crm-analiz-web.service
```

- [ ] API service restarted
- [ ] Web service restarted
- [ ] No errors in restart

### 6. Health Check (After)

```bash
# Check services running
systemctl status crm-analiz-api.service
systemctl status crm-analiz-web.service

# Check API health
curl https://analiz.binbirnet.com.tr/api/v1/health

# Check Web
curl -I https://analiz.binbirnet.com.tr/

# Check logs for errors
journalctl -u crm-analiz-api.service -n 50 --no-pager | grep -i error
```

- [ ] All services active
- [ ] API health OK
- [ ] Web responding
- [ ] No critical errors in logs

### 7. Smoke Tests

```bash
# Test login endpoint
curl -X POST https://analiz.binbirnet.com.tr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}' \
  | jq

# Expected: 401 Unauthorized
```

**Manual tests:**

- [ ] Login page loads
- [ ] Can login with valid credentials
- [ ] Dashboard loads
- [ ] Protected routes redirect to login
- [ ] API endpoints respond correctly

### 8. Documentation

```bash
# Update release metadata
echo "{
  \"version\": \"0.1.0\",
  \"deployedAt\": \"$(date -Iseconds)\",
  \"commitSha\": \"$(git rev-parse HEAD)\",
  \"commitMessage\": \"$(git log -1 --pretty=%B | head -1)\"
}" | sudo tee /var/www/crmanaliz/.release-meta.json
```

- [ ] Release metadata updated
- [ ] Deployment logged
- [ ] Stakeholders notified

---

## Post-Deployment

### Monitoring (First 30 Minutes)

```bash
# Watch logs
journalctl -u crm-analiz-api.service -f

# Monitor health
watch -n 10 "curl -s https://analiz.binbirnet.com.tr/api/v1/health | jq"
```

- [ ] No errors in logs (first 5 minutes)
- [ ] API health stable (10+ minutes)
- [ ] No alerts triggered

### Verification (First 24 Hours)

- [ ] No service restarts
- [ ] No critical errors in logs
- [ ] Health checks passing consistently
- [ ] User reports (if any) addressed

---

## Rollback Procedure

### If deployment fails:

```bash
# 1. Stop services
sudo systemctl stop crm-analiz-api.service
sudo systemctl stop crm-analiz-web.service

# 2. Rollback code
cd /var/www/crmanaliz
git reset --hard <previous-commit-sha>
pnpm install --frozen-lockfile
pnpm build

# 3. Rollback database (if migrations were applied)
cd /var/www/crmanaliz/apps/api
pnpm run migration:rollback

# 4. Restart services
sudo systemctl start crm-analiz-api.service
sudo systemctl start crm-analiz-web.service

# 5. Verify rollback
curl https://analiz.binbirnet.com.tr/api/v1/health
```

- [ ] Rollback completed
- [ ] Services healthy
- [ ] Incident logged
- [ ] Root cause analysis scheduled

---

## Notes

- **Deployment Window:** Prefer off-peak hours (2-4 AM)
- **Zero-Downtime:** Current setup has brief downtime during restart
- **Blue-Green Deployment:** Not yet implemented (future enhancement)

---
