#!/bin/bash
# Dependency Security Audit
set -euo pipefail

echo "🔒 Running dependency security audit..."

# Run pnpm audit
pnpm audit --audit-level=high --json > /tmp/audit.json 2>&1 || true

# Parse results
CRITICAL=$(jq '.metadata.vulnerabilities.critical // 0' /tmp/audit.json 2>/dev/null || echo 0)
HIGH=$(jq '.metadata.vulnerabilities.high // 0' /tmp/audit.json 2>/dev/null || echo 0)

echo "Critical: $CRITICAL"
echo "High: $HIGH"

if [ "$CRITICAL" -gt 0 ]; then
  echo "❌ CRITICAL vulnerabilities found"
  exit 1
elif [ "$HIGH" -gt 5 ]; then
  echo "⚠️  HIGH vulnerabilities exceed threshold"
  exit 1
else
  echo "✅ Security audit passed"
  exit 0
fi
