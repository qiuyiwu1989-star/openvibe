#!/usr/bin/env bash
set -Eeuo pipefail

archive_path="${1:-}"
release_id="${2:-}"
deploy_root="${3:-/srv/openvibe}"
image_archive_path="${4:-}"

if [[ ! -f "${archive_path}" ]]; then
  echo "发布包不存在" >&2
  exit 1
fi
if [[ ! -f "${image_archive_path}" ]]; then
  echo "容器镜像包不存在" >&2
  exit 1
fi
if [[ ! "${release_id}" =~ ^[0-9a-f]{7,40}$ ]]; then
  echo "版本 ID 必须是 7 至 40 位小写 Git SHA" >&2
  exit 1
fi
if [[ ! "${deploy_root}" =~ ^/[A-Za-z0-9._/-]+$ ]] || [[ "${deploy_root}" == "/" ]] || \
  [[ "/${deploy_root#/}/" == *"/../"* ]] || [[ "/${deploy_root#/}/" == *"/./"* ]]; then
  echo "部署目录必须是明确的绝对路径" >&2
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

while IFS= read -r archive_entry; do
  if [[ "${archive_entry}" == /* ]] || [[ "${archive_entry}" == ".." ]] || \
    [[ "${archive_entry}" == ../* ]] || [[ "${archive_entry}" == */../* ]]; then
    echo "发布包包含不安全路径" >&2
    exit 1
  fi
done < <(tar -tzf "${archive_path}")

release_dir="${deploy_root}/releases/${release_id}"
current_link="${deploy_root}/current"
previous_link="${deploy_root}/previous"
previous_release=""
image_tag="release-${release_id}"
image_ref="openvibe:${image_tag}"
if [[ -e "${current_link}" ]] && [[ ! -L "${current_link}" ]]; then
  echo "current 必须是版本目录的符号链接" >&2
  exit 1
fi
if [[ -L "${current_link}" ]]; then
  previous_release="$(basename "$(readlink "${current_link}")")"
fi

if [[ -e "${release_dir}" ]]; then
  echo "版本目录已经存在，拒绝覆盖：${release_id}" >&2
  exit 1
fi

mkdir -p "${release_dir}"
cleanup_incomplete() {
  if [[ ! -f "${release_dir}/.release-ready" ]]; then
    rm -rf -- "${release_dir}"
    docker image rm "${image_ref}" >/dev/null 2>&1 || true
  fi
  rm -f -- "${image_archive_path}"
}
trap cleanup_incomplete EXIT

tar -xzf "${archive_path}" -C "${release_dir}"
if [[ ! -f "${release_dir}/Dockerfile" ]] || [[ ! -f "${release_dir}/compose.production.yml" ]]; then
  echo "发布包缺少生产容器定义" >&2
  exit 1
fi

compose=(docker compose -p openvibe -f "${release_dir}/compose.production.yml")
docker image load --input "${image_archive_path}"
if ! docker image inspect "${image_ref}" >/dev/null 2>&1; then
  echo "镜像包没有提供预期版本：${image_ref}" >&2
  exit 1
fi

rollback() {
  if [[ -z "${previous_release}" ]] || [[ ! -d "${deploy_root}/releases/${previous_release}" ]]; then
    echo "新版本启动失败，且没有可回滚的上一版本" >&2
    return 1
  fi
  local previous_dir="${deploy_root}/releases/${previous_release}"
  local previous_tag="release-${previous_release}"
  echo "新版本未通过健康检查，正在恢复上一版本" >&2
  OPENVIBE_IMAGE_TAG="${previous_tag}" docker compose -p openvibe \
    -f "${previous_dir}/compose.production.yml" up -d --no-build --pull never --wait --wait-timeout 120
  ln -sfn "${previous_dir}" "${current_link}"
}

if ! OPENVIBE_IMAGE_TAG="${image_tag}" "${compose[@]}" up -d --no-build --pull never --wait --wait-timeout 120; then
  rollback || true
  exit 1
fi

health_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
  --connect-timeout 5 --max-time 15 http://127.0.0.1:3210/api/health || true)"
if [[ "${health_status}" == 000* ]] || [[ "${health_status}" == 5?? ]]; then
  rollback || true
  exit 1
fi

touch "${release_dir}/.release-ready"
if [[ -n "${previous_release}" ]]; then
  ln -sfn "${deploy_root}/releases/${previous_release}" "${previous_link}"
fi
ln -sfn "${release_dir}" "${current_link}"
rm -f -- "${archive_path}"
rm -f -- "${image_archive_path}"
trap - EXIT

echo "OpenVibe 已切换到版本 ${release_id}"
