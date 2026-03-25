#!/bin/bash
# CRM Analiz Platform - Deployment Validation Script
# Run this on the server after deployment to verify everything works

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== CRM Analiz Platform - Deployment Validation ==="
echo ""

# Test 1: Docker
echo -n "Checking Docker... "
if docker --version > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $(docker --version)"
else
    echo -e "${RED}✗${NC} Docker not found"
    exit 1
fi

# Test 2: Docker Compose
echo -n "Checking Docker Compose... "
if docker compose version > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $(docker compose version --short)"
else
    echo -e "${RED}✗${NC} Docker Compose not found"
    exit 1
fi

# Test 3: Containers Running
echo -n "Checking containers... "
EXPECTED_CONTAINERS=("crmanaliz-postgres" "crmanaliz-redis" "crmanaliz-api" "crmanaliz-web")
ALL_RUNNING=true

for container in "${EXPECTED_CONTAINERS[@]}"; do
    if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        echo -e "${RED}✗${NC} Container ${container} not running"
        ALL_RUNNING=false
    fi
done

if [ "$ALL_RUNNING" = true ]; then
    echo -e "${GREEN}✓${NC} All containers running"
else
    echo -e "${RED}✗${NC} Some containers missing"
    docker compose ps
fi

# Test 4: PostgreSQL Health
echo -n "Checking PostgreSQL... "
if docker exec crmanaliz-postgres pg_isready -U crmanaliz > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} PostgreSQL healthy"
else
    echo -e "${RED}✗${NC} PostgreSQL not ready"
fi

# Test 5: Redis Health
echo -n "Checking Redis... "
if docker exec crmanaliz-redis redis-cli ping 2>&1 | grep -q "PONG"; then
    echo -e "${GREEN}✓${NC} Redis healthy"
else
    echo -e "${RED}✗${NC} Redis not ready"
fi

# Test 6: Database Tables
echo -n "Checking database tables... "
TABLE_COUNT=$(docker exec crmanaliz-postgres psql -U crmanaliz -d crmanaliz -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
if [ "$TABLE_COUNT" -ge 10 ]; then
    echo -e "${GREEN}✓${NC} $TABLE_COUNT tables found"
else
    echo -e "${RED}✗${NC} Only $TABLE_COUNT tables (expected 11+)"
fi

# Test 7: Admin User
echo -n "Checking admin user... "
ADMIN_EXISTS=$(docker exec crmanaliz-postgres psql -U crmanaliz -d crmanaliz -t -c "SELECT COUNT(*) FROM users WHERE role = 'SUPER_ADMIN';" 2>/dev/null | tr -d ' ')
if [ "$ADMIN_EXISTS" -ge 1 ]; then
    echo -e "${GREEN}✓${NC} Admin user exists"
else
    echo -e "${RED}✗${NC} No admin user found"
fi

# Test 8: API Health Endpoint
echo -n "Checking API health endpoint... "
if curl -s http://localhost:4000/api/v1/health | grep -q "ok"; then
    echo -e "${GREEN}✓${NC} API health OK"
else
    echo -e "${RED}✗${NC} API health check failed"
fi

# Test 9: Login Endpoint
echo -n "Checking login endpoint... "
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@bullvar.com","password":"Admin2025!Bullvar"}')

if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    echo -e "${GREEN}✓${NC} Login successful"
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
else
    echo -e "${RED}✗${NC} Login failed"
fi

# Test 10: Web Application
echo -n "Checking web application... "
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
if [ "$WEB_STATUS" = "200" ] || [ "$WEB_STATUS" = "307" ]; then
    echo -e "${GREEN}✓${NC} Web app responding (HTTP $WEB_STATUS)"
else
    echo -e "${RED}✗${NC} Web app error (HTTP $WEB_STATUS)"
fi

# Test 11: Audit Logs (if login succeeded)
if [ -n "$ACCESS_TOKEN" ]; then
    echo -n "Checking audit logs... "
    AUDIT_LOGS=$(curl -s http://localhost:4000/api/v1/audit-logs \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    if echo "$AUDIT_LOGS" | grep -q "LOGIN_SUCCESS"; then
        echo -e "${GREEN}✓${NC} Audit logs working"
    else
        echo -e "${RED}✗${NC} No audit logs found"
    fi
fi

# Summary
echo ""
echo "=== Validation Complete ==="
echo ""
echo "Access Information:"
echo "  Web: http://analiz.binbirnet.com.tr (or http://194.15.45.47:3000)"
echo "  API: http://analiz.binbirnet.com.tr:4000/api/v1"
echo "  Admin: admin@bullvar.com / Admin2025!Bullvar"
echo ""
echo "Next Steps:"
echo "  1. Access web interface and change admin password"
echo "  2. Configure ISSmanager integration when credentials available"
echo "  3. Set up SSL certificate (certbot)"
echo "  4. Configure reverse proxy (nginx)"
echo ""
