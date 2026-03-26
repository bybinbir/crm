#!/bin/bash
# CRM Analiz Admin Login Hotfix Deployment Script
# Generated: 2026-03-26

set -e

SERVER="root@analiz.binbirnet.com.tr"
REMOTE_PATH="/opt/crm-analiz"
ADMIN_PASSWORD_HASH="4980f2db6a7286b71d5b199d2aa9049a:0d464f2bc76c006817a33c03045f298c8ed2d6d0356ecb7ec5ce6f346b164401ae39e01b7e1786ddadc35f1ff187a5ec4e67bc5770c44685fb8ac6a7933523d3"

echo "==> CRM-ANALIZ-ADMIN-CREDENTIAL-HOTFIX-011"
echo "==> Deploying admin/admin demo login support..."

# 1. Copy updated auth files
echo "[1/6] Copying updated auth service files..."
scp apps/api/src/modules/auth/dto/login.dto.ts $SERVER:$REMOTE_PATH/api/src/modules/auth/dto/
scp apps/api/src/modules/auth/auth.service.ts $SERVER:$REMOTE_PATH/api/src/modules/auth/

# 2. Copy updated login page
echo "[2/6] Copying updated login page..."
scp "apps/web/src/app/(auth)/login/page.tsx" "$SERVER:$REMOTE_PATH/web/src/app/(auth)/login/"

# 3. Build on server
echo "[3/6] Building applications on server..."
ssh $SERVER << 'ENDSSH'
cd /opt/crm-analiz
echo "Building API..."
cd api && pnpm build
echo "Building Web..."
cd ../web && pnpm build
ENDSSH

# 4. Update SUPER_ADMIN password in database
echo "[4/6] Updating SUPER_ADMIN password to 'admin'..."
ssh $SERVER << ENDSSH
psql -U crmanaliz -d crmanaliz << ENDSQL
UPDATE users
SET password_hash = '$ADMIN_PASSWORD_HASH'
WHERE email = 'admin@bullvar.com' AND role = 'SUPER_ADMIN';

SELECT email, role, is_active
FROM users
WHERE email = 'admin@bullvar.com';
ENDSQL
ENDSSH

# 5. Restart services
echo "[5/6] Restarting services..."
ssh $SERVER << 'ENDSSH'
systemctl restart crm-api
systemctl restart crm-web
sleep 3
systemctl status crm-api --no-pager
systemctl status crm-web --no-pager
ENDSSH

# 6. Validate deployment
echo "[6/6] Validating admin/admin login..."
sleep 2
RESPONSE=$(curl -s -X POST http://analiz.binbirnet.com.tr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","password":"admin"}')

if echo "$RESPONSE" | grep -q "accessToken"; then
  echo "✅ SUCCESS: admin/admin login validated!"
  echo "$RESPONSE" | grep -o '"accessToken":"[^"]*"' | head -1
else
  echo "❌ FAILED: admin/admin login test failed"
  echo "Response: $RESPONSE"
  exit 1
fi

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "   Credentials: admin / admin"
echo "   Dashboard: http://analiz.binbirnet.com.tr"
echo ""
echo "🔒 SECURITY WARNING:"
echo "   These are DEMO credentials for testing purposes only."
echo "   Production systems should use strong, unique passwords."
