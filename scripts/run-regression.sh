#!/bin/bash
# Automated Regression Test Suite
# API smoke tests for critical paths
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3001/api/v1}"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

pass() { echo -e "${GREEN}✅ PASS${NC} $1"; ((TESTS_PASSED++)); }
fail() { echo -e "${RED}❌ FAIL${NC} $1"; ((TESTS_FAILED++)); return 1; }

echo "🔍 Running regression tests..."
echo "  API: $API_BASE"
echo ""

# Test 1: Health
if curl -sf "$API_BASE/health" | grep -q '"status":"ok"'; then
  pass "Health endpoint operational"
else
  fail "Health endpoint failed"
fi

# Test 2: Protected route without auth (should 401)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/dashboard/metrics")
if [ "$HTTP_CODE" = "401" ]; then
  pass "Auth protection working (401 on protected route)"
else
  fail "Auth protection issue (expected 401, got $HTTP_CODE)"
fi

# Test 3: Login
CREDS='{"email":"admin@example.com","password":"admin123"}'
LOGIN_RESP=$(curl -s -X POST "$API_BASE/auth/login" -H "Content-Type: application/json" -d "$CREDS")
if echo "$LOGIN_RESP" | grep -q "accessToken"; then
  TOKEN=$(echo "$LOGIN_RESP" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
  pass "Login successful"
else
  fail "Login failed"
fi

# Test 4: Protected route with auth
if [ -n "${TOKEN:-}" ]; then
  if curl -sf "$API_BASE/dashboard/metrics" -H "Authorization: Bearer $TOKEN" > /dev/null; then
    pass "Authenticated access working"
  else
    fail "Authenticated access failed"
  fi
fi

# Test 5: Customers endpoint
if [ -n "${TOKEN:-}" ]; then
  CUSTOMERS=$(curl -s "$API_BASE/customers" -H "Authorization: Bearer $TOKEN")
  if echo "$CUSTOMERS" | grep -q "data"; then
    pass "Customers endpoint accessible"
  else
    fail "Customers endpoint failed"
  fi
fi

# Test 6: Neighborhoods
if [ -n "${TOKEN:-}" ]; then
  NEIGHBORHOODS=$(curl -s "$API_BASE/neighborhoods" -H "Authorization: Bearer $TOKEN")
  if echo "$NEIGHBORHOODS" | grep -q "data"; then
    pass "Neighborhoods endpoint accessible"
  else
    fail "Neighborhoods endpoint failed"
  fi
fi

# Test 7: Reports
if [ -n "${TOKEN:-}" ]; then
  REPORTS=$(curl -s "$API_BASE/dashboard/reports" -H "Authorization: Bearer $TOKEN")
  if echo "$REPORTS" | grep -q "importSummary"; then
    pass "Reports endpoint returning real data"
  else
    fail "Reports endpoint failed"
  fi
fi

echo ""
echo "========================================"
echo "Regression Test Summary"
echo "========================================"
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"
echo "========================================"

if [ $TESTS_FAILED -gt 0 ]; then
  echo "❌ REGRESSION FAILED"
  exit 1
else
  echo "✅ REGRESSION PASSED"
  exit 0
fi
