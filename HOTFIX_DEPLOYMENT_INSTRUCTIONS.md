# CRM Analiz Admin Login Hotfix Deployment

**Session:** CRM-ANALIZ-ADMIN-CREDENTIAL-HOTFIX-011
**Date:** 2026-03-26
**Goal:** Enable admin/admin demo credentials for easy login

## Changes Made

### 1. Backend (API)

**File:** `apps/api/src/modules/auth/dto/login.dto.ts`

- Removed `@IsEmail()` validation (now accepts usernames)
- Relaxed `@MinLength(8)` to `@MinLength(4)` (allows 'admin' password)

**File:** `apps/api/src/modules/auth/auth.service.ts`

- Added username-to-email mapping: `admin` → `admin@bullvar.com`
- Supports both email and username login (backward compatible)
- Added ESLint suppressions for `process.env` usage

### 2. Frontend (Web)

**File:** `apps/web/src/app/(auth)/login/page.tsx`

- Updated label: "Email" → "E-posta veya kullanıcı adı"
- Changed input type: `email` → `text`
- Added placeholders: "admin" for both fields
- Turkified button text: "Giriş yapılıyor..." / "Giriş Yap"

## Deployment Steps (Manual)

Since SSH connection from Windows is problematic, follow these manual steps:

### Step 1: Copy Updated Files to Production

Use WinSCP or any SCP client to copy these files:

```
Local → Remote Mapping:

apps/api/src/modules/auth/dto/login.dto.ts
→ /opt/crm-analiz/api/src/modules/auth/dto/login.dto.ts

apps/api/src/modules/auth/auth.service.ts
→ /opt/crm-analiz/api/src/modules/auth/auth.service.ts

apps/web/src/app/(auth)/login/page.tsx
→ /opt/crm-analiz/web/src/app/(auth)/login/page.tsx
```

### Step 2: SSH to Production Server

```bash
ssh root@analiz.binbirnet.com.tr
```

### Step 3: Update SUPER_ADMIN Password

```bash
psql -U crmanaliz -d crmanaliz
```

```sql
UPDATE users
SET password_hash = '4980f2db6a7286b71d5b199d2aa9049a:0d464f2bc76c006817a33c03045f298c8ed2d6d0356ecb7ec5ce6f346b164401ae39e01b7e1786ddadc35f1ff187a5ec4e67bc5770c44685fb8ac6a7933523d3'
WHERE email = 'admin@bullvar.com' AND role = 'SUPER_ADMIN';

-- Verify update
SELECT email, role, is_active,
       substring(password_hash, 1, 20) || '...' as password_preview
FROM users
WHERE email = 'admin@bullvar.com';
```

Type `\q` to exit psql.

### Step 4: Build Applications

```bash
cd /opt/crm-analiz/api
pnpm build

cd /opt/crm-analiz/web
pnpm build
```

### Step 5: Restart Services

```bash
systemctl restart crm-api
systemctl restart crm-web

# Verify services are running
systemctl status crm-api --no-pager
systemctl status crm-web --no-pager
```

### Step 6: Validate Deployment

Wait 5 seconds for services to fully start, then test:

```bash
curl -X POST http://analiz.binbirnet.com.tr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","password":"admin"}' | jq .
```

Expected response:

```json
{
  "accessToken": "eyJhbGciOiJIUz...",
  "refreshToken": "eyJhbGciOiJIUz...",
  "user": {
    "id": "...",
    "email": "admin@bullvar.com",
    "name": "Super Admin",
    "role": "SUPER_ADMIN"
  }
}
```

### Step 7: Test in Browser

1. Open: http://analiz.binbirnet.com.tr
2. Enter username: `admin`
3. Enter password: `admin`
4. Click "Giriş Yap"
5. Should redirect to `/dashboard`
6. Verify integrations and audit logs pages are accessible

## Security Warning

⚠️ **IMPORTANT:** These are DEMO credentials intended for:

- Development/testing environments
- Quick demonstrations
- Non-production deployments

**Production systems MUST use:**

- Strong, unique passwords (minimum 12 characters)
- Password complexity requirements
- Multi-factor authentication (recommended)
- Regular password rotation policies

## Rollback Plan

If deployment fails:

1. Restore previous password:

   ```sql
   UPDATE users
   SET password_hash = 'FoCESc3DztBItH57lAXt...'  -- Previous hash
   WHERE email = 'admin@bullvar.com';
   ```

2. Restore previous files from Git:

   ```bash
   cd /opt/crm-analiz/api
   git checkout HEAD~1 -- src/modules/auth/
   cd /opt/crm-analiz/web
   git checkout HEAD~1 -- src/app/(auth)/login/
   ```

3. Rebuild and restart services

## Git Commit

**Branch:** `feature/core-implementation`
**Commit Hash:** `3099d45`
**Commit Message:**

```
fix(auth): support admin demo login with username/password validation

- Remove @IsEmail validation from LoginDto to accept usernames
- Relax password MinLength from 8 to 4 chars for demo credentials
- Add username-to-email mapping in AuthService (admin -> admin@bullvar.com)
- Update login form labels to Turkish 'E-posta veya kullanıcı adı'
- Change input type from email to text
- Add helpful placeholders for admin/admin demo credentials
- Fix ESLint no-undef errors for process.env usage

🔒 SECURITY: Demo credentials (admin/admin) for testing only.
Production deployments should use strong passwords.
```

## Verification Checklist

- [ ] Files copied to production server
- [ ] Database password updated
- [ ] API built successfully
- [ ] Web built successfully
- [ ] crm-api service running
- [ ] crm-web service running
- [ ] Login with admin/admin succeeds (API test)
- [ ] Login with admin/admin succeeds (Browser test)
- [ ] Dashboard page loads
- [ ] Integrations page loads
- [ ] Audit logs page loads
- [ ] No console errors in browser
- [ ] Changes committed to Git

## Support Information

**Production URL:** http://analiz.binbirnet.com.tr
**API Base URL:** http://analiz.binbirnet.com.tr/api/v1
**Server:** Ubuntu 22.04 LTS
**Services:** crm-api (port 3000), crm-web (port 4000)
**Proxy:** Nginx (routes /api to backend, / to frontend)

---

**Deployment Status:** READY FOR MANUAL EXECUTION
**Automated Deployment:** Blocked by SSH connectivity issues from Windows
**Alternative:** Manual deployment following instructions above
