#!/usr/bin/env bash
set -euo pipefail

# Intended for Vast's On-start Script on a fresh Ubuntu 22.04 instance.
# The restream token is deliberately not passed here and must remain a secret.
repo_url="${KINGLIVE_REPO_URL:-https://github.com/egorande228/STREAMING.git}"
repo_ref="${KINGLIVE_REPO_REF:-codex/dami-stream-fixes}"
repo_dir="${KINGLIVE_REPO_DIR:-/opt/kinglive/source}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates git

if [[ ! -d "${repo_dir}/.git" ]]; then
  install -d -m 0755 "$(dirname "${repo_dir}")"
  git clone --depth 1 --branch "${repo_ref}" "${repo_url}" "${repo_dir}"
fi

bash "${repo_dir}/ops/iptv/scripts/install-vast-origin.sh"

# Managed launches exchange a short-lived token for the restream secret. When
# these variables are absent, the existing manual setup remains unchanged.
if [[ -n "${KINGLIVE_BOOTSTRAP_URL:-}" && -n "${KINGLIVE_BOOTSTRAP_TOKEN:-}" ]]; then
  response_file="$(mktemp)"
  env_file="$(mktemp)"
  trap 'rm -f "$response_file" "$env_file"' EXIT

  curl -fsS --retry 12 --retry-all-errors --retry-delay 5 \
    -X POST \
    -H "Authorization: Bearer ${KINGLIVE_BOOTSTRAP_TOKEN}" \
    -H 'Content-Type: application/json' \
    -d '{}' \
    "${KINGLIVE_BOOTSTRAP_URL}" >"${response_file}"

  restream_api_url="$(jq -er '.restream_api_url' "${response_file}")"
  restream_overlay_api_url="$(jq -er '.restream_overlay_api_url' "${response_file}")"
  restream_public_base_url="$(jq -er '.restream_public_base_url' "${response_file}")"
  restream_sync_token="$(jq -er '.restream_sync_token' "${response_file}")"

  {
    printf 'RESTREAM_API_URL=%q\n' "${restream_api_url}"
    printf 'RESTREAM_OVERLAY_API_URL=%q\n' "${restream_overlay_api_url}"
    printf 'RESTREAM_PUBLIC_BASE_URL=%q\n' "${restream_public_base_url}"
    printf 'RESTREAM_SYNC_TOKEN=%q\n' "${restream_sync_token}"
    printf '%s\n' \
      "RESTREAM_CONFIG_DIR=/etc/kinglive/iptv/channels" \
      "RESTREAM_STATE_FILE=/var/lib/kinglive-restream-sync/state.json" \
      "RESTREAM_SYSTEMD_PREFIX=kinglive-restream@" \
      "RESTREAM_RTMP_BASE_URL=rtmp://127.0.0.1:1935/live" \
      "RESTREAM_OVERLAY_DIR=/opt/kinglive/overlays" \
      "SYSTEMCTL_BIN=/usr/local/bin/kinglive-restream-supervisorctl"
  } >"${env_file}"

  install -m 0600 "${env_file}" /etc/kinglive/restream-sync.env
  unset KINGLIVE_BOOTSTRAP_TOKEN restream_sync_token
  supervisorctl restart kinglive_restream_sync >/dev/null
fi
