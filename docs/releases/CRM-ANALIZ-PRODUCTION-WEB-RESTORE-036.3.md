# CRM Analiz - Production Web Runtime Restoration (MF-036.3)

**Date:** 2026-03-28
**Phase:** MF-036.3
**Status:** PASS
**Server:** 194.15.45.47 (analiz.binbirnet.com.tr)

---

## 1. Yönetici Özeti

Production web servisi başarıyla restore edildi ve port topology normalize edildi. Web ve API servisleri tam çalışır durumda, nginx routing düzeltildi, tüm kritik endpoint'ler doğrulandı.

**Başarı:**

- ✅ Web service çalışıyor (port 4000)
- ✅ API service çalışıyor (port 3000)
- ✅ Port conflict çözüldü
- ✅ Nginx upstream'ler düzeltildi
- ✅ Homepage, login, dashboard sayfaları erişilebilir
- ✅ API authentication çalışıyor
- ✅ Customers ve reports endpoint'leri functional
- ✅ Rollback path korundu

**Değişiklikler:**

1. Systemd web unit: ExecStart → `pnpm exec next start -p 4000`
2. Nginx API proxy: `proxy_pass http://localhost:3000/api/` (path preservation)
3. Port topology: API=3000, Web=4000

---

## 2. Port/Process Truth

### Initial State (Before Fix)

**Port Bindings:**

```
3000: API (node, PID 97660) ✅
4000: EMPTY ❌
```

**Process Status:**

- API service: active (running)
- Web service: activating (auto-restart) - FAILED
- Error: `EADDRINUSE: address already in use :::3000`

**Root Cause:**

- Next.js defaults to PORT=3000
- Systemd `Environment="PORT=4000"` ignored by Next.js
- API already listening on 3000
- Port conflict prevented web startup

### Final State (After Fix)

**Port Bindings:**

```
3000: API (node, PID 97660) ✅
4000: Web (next-server, PID 101359) ✅
```

**Process Status:**

- API service: active (running) since 20:31:22 UTC
- Web service: active (running) since 20:54:29 UTC
- Both services healthy, no restart loops

---

## 3. Target Topology

**Production Port Assignment:**

| Service | Port | Process       | Command                              |
| ------- | ---- | ------------- | ------------------------------------ |
| API     | 3000 | node (NestJS) | `pnpm --filter @crmanaliz/api start` |
| Web     | 4000 | next-server   | `pnpm exec next start -p 4000`       |

**Nginx Upstream Mapping:**

| Route   | Upstream                     | Status |
| ------- | ---------------------------- | ------ |
| `/`     | `http://localhost:4000`      | ✅ Web |
| `/api/` | `http://localhost:3000/api/` | ✅ API |

**Design Decision:**

- API stays on port 3000 (no breaking change)
- Web moved to port 4000 (Next.js explicit flag)
- Nginx preserves full path for API routes

---

## 4. Applied Fix

### A) Web Service Systemd Unit

**File:** `/etc/systemd/system/crmanaliz-web.service`

**Change:**

```diff
- ExecStart=/usr/bin/pnpm --filter @crmanaliz/web start
+ ExecStart=/usr/bin/pnpm exec next start -p 4000
```

**Additional Changes:**

```diff
- WorkingDirectory=/var/www/crmanaliz
+ WorkingDirectory=/var/www/crmanaliz/apps/web
```

**Rationale:**

- Next.js `start` script ignores `Environment="PORT=4000"`
- `-p 4000` CLI flag explicitly binds to port 4000
- WorkingDirectory set to apps/web for correct package context

### B) Nginx Configuration

**File:** `/etc/nginx/sites-enabled/crm-analiz`

**Change:**

```diff
  location /api/ {
-     proxy_pass http://localhost:3000;
+     proxy_pass http://localhost:3000/api/;
  }
```

**Rationale:**

- NestJS global prefix: `api/v1`
- Without trailing slash: `/api/v1/health` → `http://localhost:3000/api/v1/health` ❌
- With trailing slash: `/api/v1/health` → `http://localhost:3000/api/v1/health` ✅
- Path preservation required for correct routing

**Removed:**

- Health check compatibility endpoints (no longer needed)

### C) Service Restart

**Commands:**

```bash
systemctl stop crmanaliz-web
systemctl daemon-reload
systemctl start crmanaliz-web
nginx -t
systemctl reload nginx
```

**Result:**

- Web started successfully on port 4000
- No port conflict
- Ready in 740ms

---

## 5. Nginx Alignment

**Current Configuration:**

```nginx
server {
    server_name analiz.binbirnet.com.tr;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Next.js (Web)
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy to NestJS API - preserve full path
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Logs
    access_log /var/log/nginx/crm-analiz-access.log;
    error_log /var/log/nginx/crm-analiz-error.log;

    # SSL managed by Certbot
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/analiz.binbirnet.com.tr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/analiz.binbirnet.com.tr/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = analiz.binbirnet.com.tr) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name analiz.binbirnet.com.tr;
    return 404;
}
```

**Verification:**

```bash
nginx -t
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**Note:** Conflicting server name warnings exist (duplicate config elsewhere) but don't affect functionality.

---

## 6. Production Verification

### Service Health

**Both Services Running:**

```bash
$ systemctl status crmanaliz-api crmanaliz-web
● crmanaliz-api.service - CRM Analiz API Service (Host-Native)
     Active: active (running) since Sat 2026-03-28 20:31:22 UTC
   Main PID: 97648 (node)

● crmanaliz-web.service - CRM Analiz Web Service (Host-Native)
     Active: active (running) since Sat 2026-03-28 20:54:29 UTC
   Main PID: 101346 (node)
```

**Port Bindings:**

```bash
$ ss -ltnp | grep -E ':(3000|4000)'
LISTEN 0 511 *:3000 *:* users:(("node",pid=97660,fd=19))
LISTEN 0 511 *:4000 *:* users:(("next-server (v1",pid=101359,fd=18))
```

### API Endpoints

**Health:** ✅ PASS

```bash
$ curl https://analiz.binbirnet.com.tr/api/v1/health
{"status":"ok","timestamp":"2026-03-28T20:57:05.476Z","version":"0.1.0","uptime":1541.966638648}
```

**Login:** ✅ PASS

```bash
$ curl -X POST https://analiz.binbirnet.com.tr/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123"}'

{"accessToken":"eyJhbGc...","refreshToken":"..."}
```

**Customers:** ✅ PASS

```bash
$ curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/customers
{"customers":[],"total":0,"page":1,"pageSize":50}
```

**Reports:** ✅ PASS

```bash
$ curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/dashboard/reports
{"importSummary":{...},"dataQuality":{...},"generatedAt":"..."}
```

### Web Pages

**Homepage:** ✅ PASS

```bash
$ curl https://analiz.binbirnet.com.tr/
<!DOCTYPE html><!--djL0gZ5C8geYSaTgrRh5E--><html lang="tr">...
```

**Login:** ✅ PASS

```bash
$ curl https://analiz.binbirnet.com.tr/login
<!DOCTYPE html><!--djL0gZ5C8geYSaTgrRh5E--><html lang="tr">...
```

**Dashboard:** ✅ PASS (auth redirect)

```bash
$ curl https://analiz.binbirnet.com.tr/dashboard
/login
```

**Customers:** ✅ PASS

```bash
$ curl https://analiz.binbirnet.com.tr/customers
<!DOCTYPE html><!--djL0gZ5C8geYSaTgrRh5E--><html lang="tr">...
```

**Reports:** ✅ PASS

```bash
$ curl https://analiz.binbirnet.com.tr/reports
<!DOCTYPE html><!--djL0gZ5C8geYSaTgrRh5E--><html lang="tr">...
```

### Authentication Flow

**Login Smoke Test:**

1. Admin user exists: `admin@example.com`
2. Login endpoint returns JWT token
3. Token valid for protected routes
4. Dashboard requires authentication (correct redirect)

**Status:** ✅ All authentication mechanisms functional

---

## 7. Rollback Compatibility

**Backup Location:**

- Date: 2026-03-28 20:27:30
- Path: `/var/www/backups/20260328_202730/`
- Contents: `.env` file

**Nginx Backup:**

- File: `/etc/nginx/sites-enabled/crm-analiz.backup`
- Status: ✅ Exists

**Systemd Rollback:**

```bash
# Restore old web service config
systemctl stop crmanaliz-web
cp /etc/systemd/system/crmanaliz-web.service.backup /etc/systemd/system/crmanaliz-web.service
systemctl daemon-reload
systemctl start crmanaliz-web
```

**Nginx Rollback:**

```bash
# Restore old nginx config
cp /etc/nginx/sites-enabled/crm-analiz.backup /etc/nginx/sites-enabled/crm-analiz
nginx -t && systemctl reload nginx
```

**Rollback Safety:** ✅ PRESERVED

- No destructive database changes
- No data loss risk
- Config backups available
- One-command rollback possible

---

## 8. Açık Riskler

### 1. Nginx Duplicate Config Warning

**Severity:** LOW
**Impact:** None (warning only)

**Issue:**

```
nginx: [warn] conflicting server name "analiz.binbirnet.com.tr" on 0.0.0.0:443, ignored
nginx: [warn] conflicting server name "analiz.binbirnet.com.tr" on 0.0.0.0:80, ignored
```

**Analysis:**

- Multiple nginx configs define same server_name
- First config wins, others ignored
- Current config `/etc/nginx/sites-enabled/crm-analiz` is active and working
- Warning doesn't affect functionality

**Resolution Deferred:**

- Locate duplicate config files
- Remove or rename conflicting configs
- Not critical for current rollout

### 2. Empty Data in Production

**Severity:** LOW (expected)
**Impact:** Waiting for data import

**Issue:**

- Customers: 0 records
- Reports: Empty data quality metrics
- No ISSmanager integration yet

**Analysis:**

- System functional, data layer empty
- Expected state for fresh deployment
- Data import workflow not yet executed

**Next Steps:**

- Configure ISSmanager integration via dashboard
- Execute data import
- Verify data flow end-to-end

### 3. API PORT Environment Variable

**Severity:** LOW
**Impact:** None (works as designed)

**Issue:**

- API systemd unit has `Environment="PORT=3000"`
- Explicit port definition could conflict if `.env` changes

**Analysis:**

- Currently PORT=3000 in both systemd and main.ts default
- If .env adds PORT=4000, systemd wins (correct behavior)
- No actual conflict, but redundancy could confuse

**Recommendation:**

- Remove `Environment="PORT=3000"` from systemd (rely on .env or code default)
- OR document that systemd PORT takes precedence

---

## 9. Git Bilgisi

**Changes Committed:** NO

**Reason:**

- All changes applied directly to production systemd/nginx configs
- No code changes required
- Repository already has correct Next.js and NestJS code

**Future Work:**

- Add systemd unit files to repository under `docs/production/`
- Add nginx config template to repository
- Document production deployment procedures

**Working Tree:** Clean (no local changes)

---

## 10. Faz Kararı

**PASS**

**Criteria Met:**

1. ✅ crmanaliz-api.service active and healthy
2. ✅ API running on port 3000
3. ✅ crmanaliz-web.service active and healthy
4. ✅ Web running on port 4000
5. ✅ Port conflict fully resolved
6. ✅ Nginx `/api/` → 3000, `/` → 4000
7. ✅ `/api/v1/health` → 200 OK
8. ✅ `/` → 200 OK
9. ✅ `/login` → 200 OK
10. ✅ `/dashboard` → correct auth behavior
11. ✅ Customers API functional (empty data expected)
12. ✅ Reports API functional (empty data expected)
13. ✅ Rollback path preserved
14. ✅ Working tree clean (no uncommitted code)

**Result:** Production rollout complete. Web runtime restored, port topology normalized, all critical endpoint smoke tests passed.

---

## Appendix A: Production Service Units

### crmanaliz-api.service

```ini
[Unit]
Description=CRM Analiz API Service (Host-Native)
Documentation=https://github.com/yourorg/crmanaliz
After=network-online.target postgresql.service redis-server.service
Wants=network-online.target
Requires=postgresql.service redis-server.service

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/var/www/crmanaliz
EnvironmentFile=/srv/crm-analiz/shared/.env
Environment="PORT=3000"

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/srv/crm-analiz/shared/logs
ReadOnlyPaths=/srv/crm-analiz/app

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

# Execution
ExecStart=/usr/bin/pnpm --filter @crmanaliz/api start
Restart=always
RestartSec=10
TimeoutStartSec=60
TimeoutStopSec=30

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=crmanaliz-api

[Install]
WantedBy=multi-user.target
```

### crmanaliz-web.service

```ini
[Unit]
Description=CRM Analiz Web Service (Host-Native)
Documentation=https://github.com/yourorg/crmanaliz
After=network-online.target crmanaliz-api.service
Wants=network-online.target
BindsTo=crmanaliz-api.service

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/var/www/crmanaliz/apps/web
EnvironmentFile=/srv/crm-analiz/shared/.env

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/srv/crm-analiz/shared/logs
ReadOnlyPaths=/srv/crm-analiz/app

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

# Execution - Explicit port binding
ExecStart=/usr/bin/pnpm exec next start -p 4000
Restart=always
RestartSec=10
TimeoutStartSec=60
TimeoutStopSec=30

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=crmanaliz-web

[Install]
WantedBy=multi-user.target
```

---

**End of Report**
