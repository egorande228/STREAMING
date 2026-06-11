#!/usr/bin/env bash
# Deploy script for WC26 streaming site.
# Required env vars: VPS_HOST, REGION
# Optional env vars: REMOTE_DIR (default: /opt/stream_site)
set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}[OK]${RESET} $*"; }
fail() { echo -e "${RED}[FAIL]${RESET} $*" >&2; exit 1; }

[[ -z "${REGION:-}" ]] && fail "REGION env var is required (eu|us|asia|mena)"
[[ -z "${VPS_HOST:-}" ]] && fail "VPS_HOST env var is required"

REMOTE_DIR="${REMOTE_DIR:-/opt/stream_site}"

echo "Deploying to region=${REGION} host=${VPS_HOST} dir=${REMOTE_DIR}"

ssh -o StrictHostKeyChecking=no "${VPS_HOST}" bash <<REMOTE
  set -euo pipefail

  echo "--- Pulling latest code ---"
  cd "${REMOTE_DIR}"
  git pull origin main

  echo "--- Rebuilding containers ---"
  cd docker
  docker compose pull --quiet
  docker compose up -d --build --remove-orphans

  echo "--- Waiting for backend ---"
  for i in \$(seq 1 12); do
    if curl -sf http://localhost:8080/api/health > /dev/null 2>&1; then
      echo "Backend is healthy"
      exit 0
    fi
    echo "  attempt \$i/12..."
    sleep 5
  done
  echo "Backend health check failed" >&2
  exit 1
REMOTE

ok "Deploy to ${REGION} (${VPS_HOST}) succeeded"
