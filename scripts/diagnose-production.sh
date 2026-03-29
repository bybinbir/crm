#!/bin/bash
#
# CRM Analiz Production Diagnostics
#

echo "========================================"
echo "  CRM ANALIZ DIAGNOSTICS"
echo "========================================"
echo "Time: $(date)"
echo "Hostname: $(hostname)"
echo "Uptime: $(uptime)"
echo ""

echo "=== SYSTEMD STATUS ==="
for svc in crm-analiz-api crm-analiz-web nginx postgresql redis-server; do
    echo "--- $svc ---"
    systemctl status $svc --no-pager | head -10
    echo ""
done

echo "=== FAILED UNITS ==="
systemctl list-units --failed
echo ""

echo "=== RECENT LOGS (API) ==="
journalctl -u crm-analiz-api -n 50 --no-pager
echo ""

echo "=== RECENT LOGS (WEB) ==="
journalctl -u crm-analiz-web -n 50 --no-pager
echo ""

echo "=== PORT BINDING ==="
ss -tlnp | grep -E ':80 |:443 |:3000 |:4000 |:5432 |:6379 '
echo ""

echo "=== PROCESS OWNERSHIP ==="
ps -eo user,pid,command | grep -E 'crm-analiz|next-server|node dist/main' | grep -v grep
echo ""

echo "=== DISK USAGE ==="
df -h /
echo ""

echo "=== MEMORY USAGE ==="
free -h
echo ""

echo "=== NGINX CONFIG TEST ==="
nginx -t
echo ""

echo "========================================"
