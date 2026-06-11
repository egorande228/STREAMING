#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/opt/stream_site}"
BRANCH="${BRANCH:-main}"
HEALTH_URL="${HEALTH_URL:-http://localhost/api/health}"

cd "${ROOT}"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml pull
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d --wait
curl -fsS "${HEALTH_URL}" >/dev/null

echo "deploy complete"
