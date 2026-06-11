#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/tmp/stream-site-backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT="${BACKUP_DIR}/streamdb-${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"
pg_dump "${DATABASE_URL:?DATABASE_URL is required}" | gzip -9 > "${OUTPUT}"

if [[ -n "${B2_REMOTE:-}" ]]; then
  rclone copy "${OUTPUT}" "${B2_REMOTE}"
fi

echo "${OUTPUT}"
