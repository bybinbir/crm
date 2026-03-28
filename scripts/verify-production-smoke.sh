#!/bin/bash
# Production Smoke Test Script
# Verifies critical endpoints on production domain
set -euo pipefail

# Configuration
PROD_DOMAIN="${PROD_DOMAIN:-}"
PROD_API_BASE="${PROD_API_BASE:-https://$PROD_DOMAIN/api/v1}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

pass() { echo -e "${GREEN}✅ PASS${NC} $1"; ((TESTS_PASSED++)); }
fail() { echo -e "${RED}❌ FAIL${NC} $1"; ((TESTS_FAILED++)); }
warn() { echo -e "${YELLOW}⚠️  WARN${NC} $1"; }

# Validation
if [ -z "$PROD_DOMAIN" ]; then
  echo "❌ PROD_DOMAIN environment variable not set"
  exit 1
fi

echo "🔍 Running production smoke tests..."
echo "  Domain: $PROD_DOMAIN"
echo "  API Base: $PROD_API_BASE"
echo ""

# Test 1: API Health
echo "Test 1: API Health Endpoint"
if curl -sf "$PROD_API_BASE/health" > /dev/null; then
  HEALTH_DATA=$(curl -s "$PROD_API_BASE/health")
  STATUS=$(echo "$HEALTH_DATA" | jq -r '.status' 2>/dev/null || echo "unknown")

  if [ "$STATUS" = "ok" ]; then
    pass "API health endpoint returns 200 OK with status: ok"
  else
    fail "API health endpoint returns unexpected status: $STATUS"
  fi
else
  fail "API health endpoint not accessible"
fi

# Test 2: Homepage
echo "Test 2: Homepage"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$PROD_DOMAIN/")
if [ "$HTTP_CODE" = "200" ]; then
  pass "Homepage returns 200 OK"
else
  fail "Homepage returns $HTTP_CODE"
fi

# Test 3: Login Page
echo "Test 3: Login Page"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$PROD_DOMAIN/login")
if [ "$HTTP_CODE" = "200" ]; then
  pass "Login page returns 200 OK"
else
  fail "Login page returns $HTTP_CODE"
fi

# Test 4: Dashboard (Auth Check)
echo "Test 4: Dashboard Auth Redirect"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$PROD_DOMAIN/dashboard")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "302" ]; then
  pass "Dashboard returns $HTTP_CODE (redirect or authenticated)"
else
  warn "Dashboard returns $HTTP_CODE (expected 200/302/307)"
fi

# Test 5: Protected API Endpoint (Should return 401)
echo "Test 5: Protected API Endpoint"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_API_BASE/dashboard/metrics")
if [ "$HTTP_CODE" = "401" ]; then
  pass "Protected endpoint correctly returns 401 Unauthorized"
else
  warn "Protected endpoint returns $HTTP_CODE (expected 401)"
fi

# Test 6: API Version
echo "Test 6: API Version Endpoint"
if curl -sf "$PROD_API_BASE/health/version" > /dev/null; then
  pass "Version endpoint accessible"
else
  warn "Version endpoint not accessible"
fi

# Summary
echo ""
echo "========================================="
echo "Smoke Test Summary"
echo "========================================="
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo "========================================="

if [ $TESTS_FAILED -gt 0 ]; then
  echo "❌ Smoke test FAILED"
  exit 1
else
  echo "✅ Smoke test PASSED"
  exit 0
fi
