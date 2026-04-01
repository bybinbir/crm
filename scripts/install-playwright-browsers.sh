#!/bin/bash
#
# Install Playwright Browser Binaries for Production
# Required for ISSManagerAutomationWorker browser automation
#
# Usage: ./scripts/install-playwright-browsers.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
API_DIR="$PROJECT_ROOT/apps/api"

echo "========================================="
echo "Playwright Browser Binary Installation"
echo "========================================="

# Check if running as deploy user
if [[ "$USER" != "deploy" && "$USER" != "root" ]]; then
    echo "⚠️  Warning: Running as user '$USER'"
    echo "   Recommended: deploy user or root"
fi

cd "$API_DIR"

echo ""
echo "Installing Playwright chromium browser..."
npx playwright install chromium

echo ""
echo "✅ Chromium installed successfully"

# If running as root, create symlink for deploy user
if [[ "$USER" == "root" ]]; then
    echo ""
    echo "Creating cache symlink for deploy user..."

    if [[ ! -d /home/deploy/.cache ]]; then
        mkdir -p /home/deploy/.cache
        chown deploy:deploy /home/deploy/.cache
    fi

    if [[ -d /root/.cache/ms-playwright ]]; then
        chown -R deploy:deploy /root/.cache/ms-playwright
        ln -sfn /root/.cache/ms-playwright /home/deploy/.cache/ms-playwright
        echo "✅ Symlink created: /home/deploy/.cache/ms-playwright -> /root/.cache/ms-playwright"
    fi
fi

echo ""
echo "Verifying browser installation..."
ls -lh "$HOME/.cache/ms-playwright/" || ls -lh /root/.cache/ms-playwright/

echo ""
echo "========================================="
echo "Installation completed successfully!"
echo "========================================="
echo ""
echo "Installed browsers:"
echo "- Chromium v1208 (Chrome for Testing 145.0.7632.6)"
echo "- Chrome Headless Shell v1208"
echo "- FFmpeg v1011"
echo ""
echo "Next steps:"
echo "1. Restart API service: systemctl restart crm-analiz-api.service"
echo "2. Verify next scheduled run completes browser launch"
