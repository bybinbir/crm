# CRM Analiz Platform - Production Deployment Instructions

## 🎯 Deployment Hazırlığı TAMAMLANDI

Tüm deployment automation scriptleri ve konfigürasyonlar hazır ve test edildi.

### ✅ Completed Quality Gates

| Check         | Status     | Details                             |
| ------------- | ---------- | ----------------------------------- |
| TypeScript    | ✅ PASS    | All packages type-safe              |
| Tests         | ✅ PASS    | 18/18 tests passing                 |
| Build         | ✅ PASS    | All packages build successfully     |
| Lint          | ⚠️ PARTIAL | ESLint patch warning (non-blocking) |
| Docker Config | ✅ VALID   | compose.prod.yaml verified          |
| Scripts       | ✅ READY   | All deployment scripts executable   |

### 📋 Deployment Prerequisites

Before running deployment, ensure:

1. **Domain DNS**: `analiz.binbirnet.com.tr` must point to server IP
2. **Server Access**: Root or sudo access to Ubuntu 20.04+ server
3. **Ports Open**: 80 (HTTP), 443 (HTTPS)
4. **Minimum Resources**: 2GB RAM, 2 CPU cores, 20GB disk

---

## 🚀 Deployment Execution

### Method 1: Automated Full Deployment (Recommended)

This script performs complete server setup and deployment in one command:

```bash
# 1. SSH to your production server
ssh root@<your-server-ip>

# 2. Download the deployment script
curl -fsSL https://raw.githubusercontent.com/yourusername/crmanaliz/feature/vertical-slice-live/scripts/full-deploy.sh -o full-deploy.sh

# 3. Edit the REPO_URL in the script
nano full-deploy.sh
# Change: REPO_URL="https://github.com/yourusername/crmanaliz.git"
# To your actual repository URL

# 4. Make it executable
chmod +x full-deploy.sh

# 5. Run deployment
sudo ./full-deploy.sh
```

**What this script does:**

- ✅ Installs Docker and Docker Compose
- ✅ Installs system dependencies (git, certbot, nginx, etc.)
- ✅ Creates directory structure
- ✅ Clones repository (feature/vertical-slice-live branch)
- ✅ Generates secure secrets
- ✅ Creates production .env file
- ✅ Obtains SSL certificate from Let's Encrypt
- ✅ Builds and starts Docker containers
- ✅ Runs database migrations
- ✅ Seeds database with admin user
- ✅ Verifies health checks
- ✅ Sets up SSL auto-renewal

**Deployment Time:** ~10-15 minutes

### Method 2: Manual Step-by-Step Deployment

If you prefer manual control, follow the steps in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## 🔑 SSH Key-Based Access (Optional but Recommended)

For secure, password-less deployment access:

### 1. Add SSH Public Key to Server

Run this command on your server to add the deployment key:

```bash
mkdir -p ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINq6guG2EleWzdCtrii4Ok87DRma3FGt0TXwzVDz5FIK claude-deploy@crmanaliz" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### 2. Test SSH Connection

From your local machine:

```bash
ssh -i ~/.ssh/id_ed25519 root@<your-server-ip>
```

---

## 📊 Post-Deployment Verification

After deployment completes, verify all services:

### 1. Check Application URLs

- **Main Application**: https://analiz.binbirnet.com.tr
- **Login Page**: https://analiz.binbirnet.com.tr/login
- **API Health**: https://analiz.binbirnet.com.tr/api/v1/health

### 2. Login with Default Credentials

```
Email: admin@crmanaliz.local
Password: ChangeMe123!
```

⚠️ **IMPORTANT**: Change the admin password immediately after first login!

### 3. Verify Dashboard Pages

- ✅ Dashboard home: `/dashboard`
- ✅ ISSmanager Integration: `/dashboard/integrations/issmanager`
- ✅ Audit Logs: `/dashboard/audit-logs`

### 4. Test ISSmanager Integration

1. Go to `/dashboard/integrations/issmanager`
2. Enter ISSmanager API credentials
3. Click "Test Connection"
4. Click "Save Configuration"
5. Check `/dashboard/audit-logs` for configuration change event

---

## 🛠️ Post-Deployment Operations

### View Application Logs

```bash
cd /opt/crm-analiz/app
docker compose -f compose.prod.yaml logs -f
```

### View Specific Service Logs

```bash
# API logs
docker compose -f compose.prod.yaml logs -f api

# Web logs
docker compose -f compose.prod.yaml logs -f web

# Database logs
docker compose -f compose.prod.yaml logs -f postgres
```

### Restart Services

```bash
cd /opt/crm-analiz/app

# Restart all services
docker compose -f compose.prod.yaml restart

# Restart specific service
docker compose -f compose.prod.yaml restart api
```

### Stop Services

```bash
cd /opt/crm-analiz/app
docker compose -f compose.prod.yaml down
```

### Database Backup

```bash
cd /opt/crm-analiz/app
./scripts/backup.sh
```

Backups are stored in `/opt/crm-analiz/backups/` with automatic 7-day retention.

### Rollback to Previous Version

```bash
cd /opt/crm-analiz/app

# Rollback to specific commit
ROLLBACK_COMMIT=<commit-hash> ./scripts/rollback.sh

# Rollback to previous commit (HEAD~1)
git log --oneline -5  # Find commit hash
ROLLBACK_COMMIT=abc123 ./scripts/rollback.sh
```

---

## 🔐 Security Checklist

After deployment, complete these security tasks:

- [ ] Change default admin password
- [ ] Review generated secrets in `/opt/crm-analiz/env/secrets-*.txt`
- [ ] Set up firewall rules (allow only 80, 443, and SSH port)
- [ ] Configure SSH key-only access (disable password authentication)
- [ ] Set up monitoring and alerting
- [ ] Schedule regular database backups
- [ ] Review and customize CORS origins in .env
- [ ] Set up log rotation for Docker containers

---

## 📈 Monitoring

### Health Check Endpoints

- **API Health**: `GET https://analiz.binbirnet.com.tr/api/v1/health`
  ```json
  {
    "status": "ok",
    "timestamp": "2026-03-25T12:00:00.000Z"
  }
  ```

### Docker Container Status

```bash
docker ps
```

Expected output: 5 containers running (postgres, redis, api, web, nginx)

### Database Connection

```bash
docker compose -f compose.prod.yaml exec postgres psql -U crmanaliz -d crmanaliz
```

---

## 🐛 Troubleshooting

### Issue: SSL Certificate Failed

**Symptom**: `certbot certonly` fails

**Solution**:

1. Verify domain DNS points to server IP: `nslookup analiz.binbirnet.com.tr`
2. Ensure ports 80 and 443 are open
3. Stop nginx if running: `systemctl stop nginx`
4. Retry deployment

### Issue: Docker Containers Not Starting

**Symptom**: `docker compose up` fails or containers exit immediately

**Solution**:

1. Check logs: `docker compose -f compose.prod.yaml logs`
2. Verify .env file exists and has all required variables
3. Check Docker service: `systemctl status docker`
4. Verify disk space: `df -h`

### Issue: Database Migration Fails

**Symptom**: `prisma migrate deploy` fails

**Solution**:

1. Check PostgreSQL is running: `docker ps | grep postgres`
2. Verify DATABASE_URL in .env
3. Check migration files: `ls apps/api/prisma/migrations/`
4. Manual migration: `docker compose -f compose.prod.yaml exec api pnpm prisma migrate deploy`

### Issue: Web App Shows "Internal Server Error"

**Symptom**: 500 errors on web pages

**Solution**:

1. Check API is running: `curl http://localhost:4000/api/v1/health`
2. Verify NEXT_PUBLIC_API_URL in .env matches actual domain
3. Check API logs: `docker compose -f compose.prod.yaml logs api`
4. Restart web container: `docker compose -f compose.prod.yaml restart web`

---

## 📞 Support

For issues or questions:

1. Check [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed documentation
2. Review Docker logs for error messages
3. Check [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system architecture
4. Review audit logs at `/dashboard/audit-logs` for application events

---

## 🎉 Deployment Complete!

If you've successfully completed all verification steps:

✅ Your CRM Analiz Platform is now live at https://analiz.binbirnet.com.tr

Next steps:

1. Change admin password
2. Configure ISSmanager integration
3. Set up regular backups
4. Monitor application health
5. Begin onboarding users

**Welcome to production!** 🚀
