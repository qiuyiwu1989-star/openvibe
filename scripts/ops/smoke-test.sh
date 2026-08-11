#!/usr/bin/env bash
set -Eeuo pipefail

base_url="${1:-http://127.0.0.1:3000}"
base_url="${base_url%/}"
retry_delay_seconds="${SMOKE_RETRY_DELAY_SECONDS:-3}"
if [[ ! "${base_url}" =~ ^https?://[^[:space:]]+$ ]]; then
  echo "冒烟检查地址必须是 HTTP 或 HTTPS URL" >&2
  exit 1
fi
if [[ ! "${retry_delay_seconds}" =~ ^[0-9]+$ ]]; then
  echo "冒烟重试等待时间必须是非负整数秒" >&2
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

check_route() {
  local route_path="$1"
  local status
  local curl_exit

  if status="$(curl --silent --show-error --location --output /dev/null --write-out '%{http_code}' \
    --connect-timeout 8 --max-time 20 "${base_url}${route_path}")"; then
    curl_exit=0
  else
    curl_exit=$?
  fi

  if (( curl_exit != 0 )) || [[ "${status}" == 000* ]] || [[ "${status}" == 5?? ]]; then
    echo "FAIL ${route_path} status=${status:-000} curl_exit=${curl_exit}" >&2
    return 1
  fi

  echo "PASS ${route_path} ${status}"
}

retry_paths=()
for route_path in "${paths[@]}"; do
  if ! check_route "${route_path}"; then
    retry_paths+=("${route_path}")
  fi
done

if (( ${#retry_paths[@]} == 0 )); then
  exit 0
fi

echo "RETRY ${#retry_paths[@]} 个失败路由；${retry_delay_seconds} 秒后只复核这些路由" >&2
sleep "${retry_delay_seconds}"

failed=0
for route_path in "${retry_paths[@]}"; do
  if ! check_route "${route_path}"; then
    failed=1
  fi
done

exit "${failed}"
