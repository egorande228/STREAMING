#!/usr/bin/env bash
set -euo pipefail

OUT="${OUT:-/etc/nginx/cloudflare-ips.conf}"
TMP="$(mktemp)"

{
  echo "# generated $(date -u +%FT%TZ)"
  curl -fsSL https://www.cloudflare.com/ips-v4 | while read -r cidr; do
    echo "set_real_ip_from ${cidr};"
  done
  curl -fsSL https://www.cloudflare.com/ips-v6 | while read -r cidr; do
    echo "set_real_ip_from ${cidr};"
  done
} > "${TMP}"

install -D -m 0644 "${TMP}" "${OUT}"
rm -f "${TMP}"
nginx -s reload
