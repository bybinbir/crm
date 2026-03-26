#!/usr/bin/env python3
"""
CRM Analiz Admin Login Hotfix - Manual Deployment Helper
Generated: 2026-03-26
"""

import subprocess
import sys
import time

SERVER = "root@analiz.binbirnet.com.tr"
REMOTE_PATH = "/opt/crm-analiz"
ADMIN_PASSWORD_HASH = "4980f2db6a7286b71d5b199d2aa9049a:0d464f2bc76c006817a33c03045f298c8ed2d6d0356ecb7ec5ce6f346b164401ae39e01b7e1786ddadc35f1ff187a5ec4e67bc5770c44685fb8ac6a7933523d3"

def run_cmd(cmd, desc):
    """Run command with description"""
    print(f"\n{'='*60}")
    print(f"  {desc}")
    print(f"{'='*60}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ FAILED: {result.stderr}")
        return False
    print(result.stdout)
    return True

def main():
    print("==> CRM-ANALIZ-ADMIN-CREDENTIAL-HOTFIX-011")
    print("==> Manual Deployment Steps\n")

    # Step 1: Copy auth files
    print("\n[STEP 1] Copy updated auth service files...")
    files_to_copy = [
        ("apps/api/src/modules/auth/dto/login.dto.ts", f"{REMOTE_PATH}/api/src/modules/auth/dto/"),
        ("apps/api/src/modules/auth/auth.service.ts", f"{REMOTE_PATH}/api/src/modules/auth/"),
        ("apps/web/src/app/(auth)/login/page.tsx", f"{REMOTE_PATH}/web/src/app/(auth)/login/"),
    ]

    print("Run these SCP commands manually:")
    for local, remote in files_to_copy:
        print(f"  scp {local} {SERVER}:{remote}")

    input("\nPress ENTER when file copy is complete...")

    # Step 2: Update database password
    print("\n[STEP 2] Update SUPER_ADMIN password...")
    print("Run this SQL command on the server:")
    print(f"""
psql -U crmanaliz -d crmanaliz << EOF
UPDATE users
SET password_hash = '{ADMIN_PASSWORD_HASH}'
WHERE email = 'admin@bullvar.com' AND role = 'SUPER_ADMIN';

SELECT email, role, is_active FROM users WHERE email = 'admin@bullvar.com';
EOF
""")

    input("\nPress ENTER when database update is complete...")

    # Step 3: Build and restart
    print("\n[STEP 3] Build and restart services...")
    print("Run these commands on the server:")
    print("""
cd /opt/crm-analiz/api && pnpm build
cd /opt/crm-analiz/web && pnpm build
systemctl restart crm-api
systemctl restart crm-web
systemctl status crm-api --no-pager
systemctl status crm-web --no-pager
""")

    input("\nPress ENTER when services are restarted...")

    # Step 4: Validate
    print("\n[STEP 4] Validating deployment...")
    time.sleep(2)

    curl_cmd = '''curl -s -X POST http://analiz.binbirnet.com.tr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","password":"admin"}' '''

    if run_cmd(curl_cmd, "Testing admin/admin login"):
        print("\n✅ SUCCESS: Deployment validated!")
    else:
        print("\n❌ FAILED: Login test failed")
        return 1

    print("\n🎉 DEPLOYMENT COMPLETE!")
    print("   Credentials: admin / admin")
    print("   Dashboard: http://analiz.binbirnet.com.tr")
    print("\n🔒 SECURITY WARNING:")
    print("   These are DEMO credentials for testing purposes only.")
    print("   Production systems should use strong, unique passwords.")

    return 0

if __name__ == "__main__":
    sys.exit(main())
