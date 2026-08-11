#!/usr/bin/env bash
set -Eeuo pipefail

base_url="${1:-http://127.0.0.1:3000}"
base_url="${base_url%/}"
if [[ ! "${base_url}" =~ ^https?://[^[:space:]]+$ ]]; then
  echo "冒烟检查地址必须是 HTTP 或 HTTPS URL" >&2
  exit 1
fi

paths=(
  "/api/health"
  "/"
  "/start"
  "/paths"
  "/paths/responsible-product"
  "/pilot"
  "/pilot/guide"
  "/explore"
  "/works"
  "/updates"
  "/updates/feed.xml"
)

failed=0
for route_path in "${paths[@]}"; do
  status="$(curl --silent --show-error --location --output /dev/null --write-out '%{http_code}' \
    --connect-timeout 8 --max-time 20 "${base_url}${route_path}" || true)"
  if [[ "${status}" == 000* ]] || [[ "${status}" == 5?? ]]; then
    echo "FAIL ${route_path} ${status:-000}" >&2
    failed=1
  else
    echo "PASS ${route_path} ${status}"
  fi
done

exit "${failed}"
