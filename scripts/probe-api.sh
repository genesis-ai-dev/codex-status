#!/usr/bin/env bash
set -e
API="${API_BASE:-https://api.frontierrnd.com}"

probe() {
  local id="$1" method="$2" path="$3" body="$4" expect="$5"
  local start end res ms ok="false"
  start=$(date +%s%3N)
  if [ -n "$body" ]; then
    res=$(curl -s -o /tmp/resp.json -w "%{http_code}" -X "$method" "$API$path" \
      -H "Content-Type: application/json" -d "$body" 2>/dev/null || echo "000")
  else
    res=$(curl -s -o /tmp/resp.json -w "%{http_code}" -X "$method" "$API$path" 2>/dev/null || echo "000")
  fi
  end=$(date +%s%3N)
  ms=$((end - start))
  [ "$res" = "$expect" ] && ok="true"
  echo "{\"id\":\"$id\",\"ok\":$ok,\"statusCode\":$res,\"ms\":$ms}"
}

r1=$(probe "api-health" "GET" "/health" "" "200")
r2=$(probe "extended-health" "GET" "/api/v2/health" "" "200")
r3=$(probe "dashboard" "GET" "/api/v2/health/dashboard" "" "200")
r4=$(probe "auth" "POST" "/api/v2/auth/token" '{"username":"x","password":"y"}' "401")
r5=$(probe "llm" "POST" "/api/v2/chat/completions" '{}' "401")

echo "{\"results\":[$r1,$r2,$r3,$r4,$r5]}"
