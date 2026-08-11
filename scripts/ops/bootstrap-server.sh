#!/usr/bin/env bash
set -Eeuo pipefail

deploy_user="${1:-ubuntu}"
deploy_root="${2:-/srv/openvibe}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "请使用 sudo 运行服务器初始化脚本" >&2
  exit 1
fi
if [[ ! "${deploy_user}" =~ ^[a-z_][a-z0-9_-]*$ ]]; then
  echo "部署用户名不合法" >&2
  exit 1
fi
if [[ ! "${deploy_root}" =~ ^/[A-Za-z0-9._/-]+$ ]] || [[ "${deploy_root}" == "/" ]] || \
  [[ "/${deploy_root#/}/" == *"/../"* ]] || [[ "/${deploy_root#/}/" == *"/./"* ]]; then
  echo "部署目录必须是明确的绝对路径" >&2
  exit 1
fi
if ! id "${deploy_user}" >/dev/null 2>&1; then
  echo "部署用户不存在：${deploy_user}" >&2
  exit 1
fi

for command_name in docker curl tar; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "服务器缺少命令：${command_name}" >&2
    exit 1
  fi
done
if ! docker compose version >/dev/null 2>&1; then
  echo "服务器缺少 Docker Compose 插件" >&2
  exit 1
fi

install -d -m 0750 -o "${deploy_user}" -g "${deploy_user}" "${deploy_root}"
install -d -m 0750 -o "${deploy_user}" -g "${deploy_user}" \
  "${deploy_root}/incoming" "${deploy_root}/releases"

echo "OpenVibe 服务器目录已准备：${deploy_root}"
