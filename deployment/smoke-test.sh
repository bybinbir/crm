#!/bin/bash
# CRM Analiz - Post-Deployment Smoke Tests
# Usage: ./smoke-test.sh [base_url]

set -e

BASE_URL="${1:-https://analiz.binbirnet.com.tr}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}CRM Analiz - Smoke Test${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "Testing: ${BASE_URL}\n"

# Test counter
PASSED=0
FAILED=0

test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="$3"
    local check_header="$4"

    echo -n "Testing: $name ... "

    response=$(curl -s -o /dev/null -w "%{http_code}" -I "$url" 2>&1 || echo "000")

    if [ "$response" = "$expected_code" ]; then
        if [ -n "$check_header" ]; then
            headers=$(curl -s -I "$url" 2>&1)
            if echo "$headers" | grep -qi "$check_header"; then
                echo -e "${GREEN}PASS${NC}"
                ((PASSED++))
            else
                echo -e "${RED}FAIL${NC} (header missing: $check_header)"
                ((FAILED++))
            fi
        else
            echo -e "${GREEN}PASS${NC}"
            ((PASSED++))
        fi
    else
        echo -e "${RED}FAIL${NC} (expected $expected_code, got $response)"
        ((FAILED++))
    fi
}

test_json_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="$4"

    echo -n "Testing: $name ... "

    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        response=$(curl -s -X POST "$url" -H "Content-Type: application/json" -d "$data" 2>&1)
    else
        response=$(curl -s "$url" 2>&1)
    fi

    if echo "$response" | grep -q "status\|error\|message"; then
        echo -e "${GREEN}PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} (invalid JSON response)"
        ((FAILED++))
        echo "Response: $response"
    fi
}

# 1. HTTP -> HTTPS Redirect
echo -e "\n${YELLOW}1. SSL and Redirects${NC}"
test_endpoint "HTTP -> HTTPS redirect" "http://analiz.binbirnet.com.tr" "301"
test_endpoint "HTTPS accessible" "$BASE_URL" "200"

# 2. Security Headers
echo -e "\n${YELLOW}2. Security Headers${NC}"
test_endpoint "HSTS header" "$BASE_URL" "200" "Strict-Transport-Security"
test_endpoint "X-Frame-Options" "$BASE_URL" "200" "X-Frame-Options"
test_endpoint "X-Content-Type-Options" "$BASE_URL" "200" "X-Content-Type-Options"
test_endpoint "CSP header" "$BASE_URL" "200" "Content-Security-Policy"

# 3. Application Routes
echo -e "\n${YELLOW}3. Application Routes${NC}"
test_endpoint "Landing page" "$BASE_URL/" "200"
test_endpoint "Login page" "$BASE_URL/login" "200"
test_endpoint "Dashboard (protected)" "$BASE_URL/dashboard" "307"

# 4. API Endpoints
echo -e "\n${YELLOW}4. API Endpoints${NC}"
test_json_endpoint "Health check" "$BASE_URL/api/v1/health"

# 5. Rate Limiting (optional - might trigger actual limits)
echo -e "\n${YELLOW}5. Rate Limiting${NC}"
echo -n "Testing: Login rate limit ... "
echo -e "${YELLOW}SKIP${NC} (manual test recommended)"

# 6. Cookie Security (test login without actual credentials)
echo -e "\n${YELLOW}6. Cookie Security${NC}"
echo -n "Testing: Login endpoint responds ... "
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' 2>&1)
if [ "$response" = "401" ] || [ "$response" = "200" ]; then
    echo -e "${GREEN}PASS${NC} (endpoint responsive)"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC} (unexpected response: $response)"
    ((FAILED++))
fi

# Summary
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Test Summary${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "Total:  $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed. Check configuration.${NC}"
    exit 1
fi
