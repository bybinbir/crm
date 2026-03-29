#!/bin/bash
#
# CRM Analiz Production Health Check
#

set -Eeuo pipefail

ERRORS=0
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_service() {
    local service=$1
    if systemctl is-active --quiet "$service"; then
        echo -e "  ${GREEN}✅${NC} $service: active"
        return 0
    else
        echo -e "  ${RED}❌${NC} $service: inactive"
        ((ERRORS++))
        return 1
    fi
}

check_http() {
    local url=$1
    local name=$2
    local code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    if [[ "$code" == "200" ]]; then
        echo -e "  ${GREEN}✅${NC} $name: HTTP $code"
        return 0
    else
        echo -e "  ${RED}❌${NC} $name: HTTP $code"
        ((ERRORS++))
        return 1
    fi
}

check_port() {
    local port=$1
    local name=$2
    if lsof -i :$port -sTCP:LISTEN >/dev/null 2>&1; then
        echo -e "  ${GREEN}✅${NC} Port $port ($name): listening"
        return 0
    else
        echo -e "  ${RED}❌${NC} Port $port ($name): not listening"
        ((ERRORS++))
        return 1
    fi
}

check_disk() {
    local usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ $usage -lt 85 ]]; then
        echo -e "  ${GREEN}✅${NC} Disk usage: ${usage}%"
        return 0
    else
        echo -e "  ${YELLOW}⚠️${NC}  Disk usage: ${usage}%"
        return 0
    fi
}

echo "========================================"
echo "  CRM ANALIZ HEALTH CHECK"
echo "========================================"
echo ""

echo "1. SYSTEMD SERVICES"
check_service "crm-analiz-api"
check_service "crm-analiz-web"
check_service "nginx"
check_service "postgresql"
check_service "redis-server"
echo ""

echo "2. PORT STATUS"
check_port 3000 "API"
check_port 4000 "Web"
check_port 80 "HTTP"
check_port 443 "HTTPS"
echo ""

echo "3. HTTP HEALTH"
check_http "https://analiz.binbirnet.com.tr" "Public Web"
check_http "https://analiz.binbirnet.com.tr/api/v1/health" "API Health"
echo ""

echo "4. RESOURCE STATUS"
check_disk
echo "  Memory: $(free -h | awk 'NR==2{print $3"/"$2}')"
echo "  Load: $(uptime | awk -F'load average:' '{print $2}')"
echo ""

echo "========================================"
if [[ $ERRORS -eq 0 ]]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo "========================================"
    exit 0
else
    echo -e "${RED}❌ $ERRORS CHECKS FAILED${NC}"
    echo "========================================"
    exit 1
fi
