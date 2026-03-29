#!/bin/bash
API_URL="${API_URL:-http://localhost:4000}"
WEB_URL="${WEB_URL:-http://localhost:3000}"
echo "🏥 Health Check"
echo -n "API: "
curl -sf "$API_URL/api/v1/health" > /dev/null && echo "✅" || (echo "❌"; exit 1)
echo -n "Web: "
curl -sf "$WEB_URL" > /dev/null && echo "✅" || (echo "❌"; exit 1)
echo "✅ All services healthy"
