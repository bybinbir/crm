#!/bin/bash
#
# CRM Analiz Health Monitoring Script
# Checks web, api, database health and sends alerts on failure
#
# Usage:
#   ./health-monitor.sh
#
# Install as cron job:
#   */5 * * * * /var/www/crmanaliz/scripts/health-monitor.sh
#

set -euo pipefail

# ============================================
# Configuration
# ============================================
API_URL="${API_URL:-https://analiz.binbirnet.com.tr/api/v1/health}"
WEB_URL="${WEB_URL:-https://analiz.binbirnet.com.tr}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-crmanaliz}"

LOG_FILE="${LOG_FILE:-/var/log/crmanaliz/health-monitor.log}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"
ALERT_ENABLED="${ALERT_ENABLED:-false}"

# Disk usage warning threshold (%)
DISK_THRESHOLD=85

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ============================================
# Functions
# ============================================
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_api_health() {
    log "Checking API health..."

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" --connect-timeout 10)

    if [[ "$HTTP_CODE" == "200" ]]; then
        log "✅ API health check: PASS (HTTP $HTTP_CODE)"
        return 0
    else
        log "❌ API health check: FAIL (HTTP $HTTP_CODE)"
        send_alert "API Health Check Failed" "API returned HTTP $HTTP_CODE instead of 200"
        return 1
    fi
}

check_web_health() {
    log "Checking Web health..."

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL" --connect-timeout 10)

    if [[ "$HTTP_CODE" == "200" ]]; then
        log "✅ Web health check: PASS (HTTP $HTTP_CODE)"
        return 0
    else
        log "❌ Web health check: FAIL (HTTP $HTTP_CODE)"
        send_alert "Web Health Check Failed" "Web returned HTTP $HTTP_CODE instead of 200"
        return 1
    fi
}

check_database() {
    log "Checking PostgreSQL connection..."

    if command -v pg_isready &> /dev/null; then
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -q; then
            log "✅ PostgreSQL check: PASS"
            return 0
        else
            log "❌ PostgreSQL check: FAIL (cannot connect)"
            send_alert "PostgreSQL Connection Failed" "Cannot connect to database at $DB_HOST:$DB_PORT"
            return 1
        fi
    else
        log "⚠️  PostgreSQL check: SKIPPED (pg_isready not installed)"
        return 0
    fi
}

check_disk_usage() {
    log "Checking disk usage..."

    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

    if [[ "$DISK_USAGE" -lt "$DISK_THRESHOLD" ]]; then
        log "✅ Disk usage check: PASS ($DISK_USAGE%)"
        return 0
    else
        log "⚠️  Disk usage check: WARNING ($DISK_USAGE% >= $DISK_THRESHOLD%)"
        send_alert "Disk Usage Warning" "Disk usage is at $DISK_USAGE%, threshold is $DISK_THRESHOLD%"
        return 1
    fi
}

check_systemd_services() {
    log "Checking systemd services..."

    SERVICES=("crm-analiz-api.service" "crm-analiz-web.service" "postgresql@16-main.service" "nginx.service")
    ALL_RUNNING=true

    for service in "${SERVICES[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            log "✅ Service $service: RUNNING"
        else
            log "❌ Service $service: NOT RUNNING"
            send_alert "Service Down: $service" "systemd service $service is not running"
            ALL_RUNNING=false
        fi
    done

    if $ALL_RUNNING; then
        return 0
    else
        return 1
    fi
}

send_alert() {
    local subject="$1"
    local message="$2"

    log "🚨 ALERT: $subject - $message"

    if [[ "$ALERT_ENABLED" == "true" ]]; then
        if command -v mail &> /dev/null; then
            echo "$message" | mail -s "[CRM Analiz Alert] $subject" "$ALERT_EMAIL"
            log "Alert email sent to $ALERT_EMAIL"
        else
            log "⚠️  Alert email not sent (mail command not available)"
        fi
    fi
}

# ============================================
# Main Execution
# ============================================
main() {
    log "========================================="
    log "CRM Analiz Health Monitor - Starting"
    log "========================================="

    EXIT_CODE=0

    check_api_health || EXIT_CODE=1
    check_web_health || EXIT_CODE=1
    check_database || EXIT_CODE=1
    check_disk_usage || EXIT_CODE=1
    check_systemd_services || EXIT_CODE=1

    if [[ $EXIT_CODE -eq 0 ]]; then
        log "========================================="
        log "✅ All health checks PASSED"
        log "========================================="
    else
        log "========================================="
        log "❌ Some health checks FAILED"
        log "========================================="
    fi

    exit $EXIT_CODE
}

# Create log directory if not exists
mkdir -p "$(dirname "$LOG_FILE")"

main
