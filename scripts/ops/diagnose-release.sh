#!/usr/bin/env bash
set -Eeuo pipefail

deploy_root="${1:-/srv/openvibe}"
if [[ ! "${deploy_root}" =~ ^/[A-Za-z0-9._/-]+$ ]] || [[ "${deploy_root}" == "/" ]] || \
  [[ "/${deploy_root#/}/" == *"/../"* ]] || [[ "/${deploy_root#/}/" == *"/./"* ]]; then
  echo "部署目录必须是明确的绝对路径" >&2
  exit 1
fi

container_name="openvibe-web-1"

echo "TIME $(date -u +%Y-%m-%dT%H:%M:%SZ)"
uptime
free -m
df -h "${deploy_root}"
systemctl is-active nginx 2>/dev/null || true
docker ps --filter "name=^/${container_name}$" \
  --format 'container={{.Names}} status={{.Status}} image={{.Image}} ports={{.Ports}}'
docker inspect "${container_name}" \
  --format 'restart={{.RestartCount}} state={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} image={{.Config.Image}}'

for sample in 1 2 3 4 5; do
  docker stats --no-stream --format \
    "sample=${sample} cpu={{.CPUPerc}} memory={{.MemUsage}} memory_percent={{.MemPerc}} pids={{.PIDs}}" \
    "${container_name}"
  curl --silent --show-error --output /dev/null \
    --write-out "sample=${sample} local_status=%{http_code} local_total=%{time_total}s\n" \
    --connect-timeout 3 --max-time 5 http://127.0.0.1:3210/api/health
done
