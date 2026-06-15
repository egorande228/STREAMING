#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -d "${script_dir}/../mediamtx" && -d "${script_dir}/../systemd" ]]; then
  iptv_root="$(cd "${script_dir}/.." && pwd)"
else
  repo_root="$(cd "${script_dir}/../../.." && pwd)"
  iptv_root="${repo_root}/ops/iptv"
fi
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root on the origin VPS." >&2
  exit 77
fi

install -d -m 0755 /etc/kinglive/iptv/channels
install -d -m 0755 /opt/mediamtx

install -m 0755 "${iptv_root}/scripts/kinglive-restream" /usr/local/bin/kinglive-restream
install -m 0755 "${iptv_root}/scripts/kinglive-iptv-health" /usr/local/bin/kinglive-iptv-health
install -m 0755 "${iptv_root}/scripts/kinglive-restream-watchdog" /usr/local/bin/kinglive-restream-watchdog
install -m 0644 "${iptv_root}/systemd/kinglive-restream@.service" /etc/systemd/system/kinglive-restream@.service
install -m 0644 "${iptv_root}/systemd/kinglive-restream-watchdog.service" /etc/systemd/system/kinglive-restream-watchdog.service
install -m 0644 "${iptv_root}/systemd/kinglive-restream-watchdog.timer" /etc/systemd/system/kinglive-restream-watchdog.timer

if [[ -f /opt/mediamtx/mediamtx.yml ]]; then
  cp -a /opt/mediamtx/mediamtx.yml "/opt/mediamtx/mediamtx.yml.bak.${timestamp}"
fi
install -m 0644 "${iptv_root}/mediamtx/mediamtx.yml" /opt/mediamtx/mediamtx.yml

systemctl daemon-reload

echo "Installed IPTV origin files."
echo "Next:"
echo "  1. Put channel env files in /etc/kinglive/iptv/channels/*.env with chmod 600."
echo "  2. Restart MediaMTX."
echo "  3. Start one channel, for example: systemctl start kinglive-restream@fox-sport-1-hd"
echo "  4. Optional watchdog: systemctl enable --now kinglive-restream-watchdog.timer"
