#!/usr/bin/env bash
set -Eeuo pipefail

deploy_root="${1:-/srv/openvibe}"
if [[ ! "${deploy_root}" =~ ^/[A-Za-z0-9._/-]+$ ]] || [[ "${deploy_root}" == "/" ]] || \
  [[ "/${deploy_root#/}/" == *"/../"* ]] || [[ "/${deploy_root#/}/" == *"/./"* ]]; then
  echo "部署目录必须是明确的绝对路径" >&2
  exit 1
fi

previous_link="${deploy_root}/previous"
current_link="${deploy_root}/current"
if [[ ! -L "${previous_link}" ]]; then
  echo "没有可回滚的上一版本" >&2
  exit 1
fi

previous_dir="$(readlink "${previous_link}")"
previous_id="$(basename "${previous_dir}")"
if [[ "${previous_dir}" != "${deploy_root}/releases/${previous_id}" ]] || \
  [[ ! "${previous_id}" =~ ^[0-9a-f]{7,40}$ ]] || [[ ! -f "${previous_dir}/.release-ready" ]]; then
  echo "上一版本不是已验证的 OpenVibe 发布" >&2
  exit 1
fi
if [[ ! -f "${previous_dir}/compose.production.yml" ]]; then
  echo "上一版本缺少生产容器定义" >&2
  exit 1
fi

OPENVIBE_IMAGE_TAG="release-${previous_id}" docker compose -p openvibe \
  -f "${previous_dir}/compose.production.yml" up -d --no-build --pull never --wait --wait-timeout 120

health_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
  --connect-timeout 5 --max-time 15 http://127.0.0.1:3210/api/health || true)"
if [[ "${health_status}" == 000* ]] || [[ "${health_status}" == 5?? ]]; then
  echo "上一版本也没有通过健康检查" >&2
  exit 1
fi

ln -sfn "${previous_dir}" "${current_link}"
echo "OpenVibe 已回滚到版本 ${previous_id}"
