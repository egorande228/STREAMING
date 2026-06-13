#!/usr/bin/env bash
set -euo pipefail

install -d -m 0755 /opt/kinglive-restream
install -d -m 0750 /etc/kinglive/restreams
install -d -m 0750 /var/lib/kinglive-restream-sync

install -m 0755 "$(dirname "$0")/../restream-sync.mjs" /opt/kinglive-restream/restream-sync.mjs
install -m 0644 "$(dirname "$0")/kinglive-restream@.service" /etc/systemd/system/kinglive-restream@.service
install -m 0644 "$(dirname "$0")/kinglive-restream-sync.service" /etc/systemd/system/kinglive-restream-sync.service
install -m 0644 "$(dirname "$0")/kinglive-restream-sync.timer" /etc/systemd/system/kinglive-restream-sync.timer

if [[ ! -f /etc/kinglive/restream-sync.env ]]; then
  cat > /etc/kinglive/restream-sync.env <<'ENV'
RESTREAM_API_URL=https://kinglive.live/api/restreams/desired
RESTREAM_SYNC_TOKEN=replace-me
RESTREAM_CONFIG_DIR=/etc/kinglive/restreams
RESTREAM_STATE_FILE=/var/lib/kinglive-restream-sync/state.json
RESTREAM_RTMP_BASE_URL=rtmp://127.0.0.1:1935/live
RESTREAM_PUBLIC_BASE_URL=https://hls.livekinglive.win/live
ENV
  chmod 0640 /etc/kinglive/restream-sync.env
fi

systemctl daemon-reload
systemctl enable --now kinglive-restream-sync.timer
