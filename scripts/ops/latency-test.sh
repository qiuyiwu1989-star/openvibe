#!/usr/bin/env bash
set -Eeuo pipefail

base_url="${1:-https://tongxue.yongle.school/openvibe}"
base_url="${base_url%/}"
samples="${LATENCY_SAMPLES:-5}"
warn_seconds="${LATENCY_WARN_SECONDS:-3}"
fail_seconds="${LATENCY_FAIL_SECONDS:-8}"
fail_count="${LATENCY_FAIL_COUNT:-3}"

if [[ ! "${base_url}" =~ ^https?://[^[:space:]]+$ ]]; then
  echo "延迟检查地址必须是 HTTP 或 HTTPS URL" >&2
  exit 1
fi

if [[ ! "${samples}" =~ ^[1-9][0-9]*$ ]] || [[ ! "${fail_count}" =~ ^[1-9][0-9]*$ ]]; then
  echo "采样数和失败样本数必须是正整数" >&2
  exit 1
fi

if [[ ! "${warn_seconds}" =~ ^[0-9]+([.][0-9]+)?$ ]] || [[ ! "${fail_seconds}" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
  echo "延迟阈值必须是非负秒数" >&2
  exit 1
fi

if (( fail_count > samples )); then
  echo "失败样本数不能大于总采样数" >&2
  exit 1
fi

is_greater_than() {
  awk -v left="$1" -v right="$2" 'BEGIN { exit !(left > right) }'
}

severe=0
warnings=0
target="${base_url}/api/health"

for (( sample = 1; sample <= samples; sample += 1 )); do
  measurement="$(curl --silent --show-error --location --output /dev/null \
    --write-out '%{http_code} %{time_connect} %{time_appconnect} %{time_total}' \
    --connect-timeout 8 --max-time 20 "${target}" 2>/dev/null || true)"

  read -r status connect tls total <<< "${measurement:-000 0 0 20}"
  status="${status:-000}"
  connect="${connect:-0}"
  tls="${tls:-0}"
  total="${total:-20}"

  echo "SAMPLE ${sample}/${samples} status=${status} connect=${connect}s tls=${tls}s total=${total}s"

  unavailable=0
  if [[ "${status}" == 000* ]] || [[ "${status}" == 5?? ]]; then
    unavailable=1
  fi

  if (( unavailable == 1 )) || is_greater_than "${tls}" "${fail_seconds}" || is_greater_than "${total}" "${fail_seconds}"; then
    severe=$((severe + 1))
  elif is_greater_than "${tls}" "${warn_seconds}" || is_greater_than "${total}" "${warn_seconds}"; then
    warnings=$((warnings + 1))
  fi
done

if (( warnings > 0 )); then
  echo "::warning::OpenVibe 延迟监控发现 ${warnings}/${samples} 个样本超过 ${warn_seconds}s 提醒线"
fi

if (( severe >= fail_count )); then
  echo "OpenVibe 延迟监控失败：${severe}/${samples} 个样本不可用或超过 ${fail_seconds}s，阈值为 ${fail_count} 个" >&2
  exit 1
fi

if (( severe > 0 )); then
  echo "::warning::OpenVibe 延迟监控发现 ${severe}/${samples} 个严重慢样本，尚未达到失败阈值"
fi

echo "PASS latency severe=${severe}/${samples} warning=${warnings}/${samples}"
