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

exec bash "${repo_dir}/ops/iptv/scripts/install-vast-origin.sh"
