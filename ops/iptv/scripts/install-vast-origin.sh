#!/usr/bin/env bash
set -euo pipefail

MEDIAMTX_VERSION="${MEDIAMTX_VERSION:-v1.19.2}"
NODE_VERSION="${NODE_VERSION:-v22.17.1}"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -d "${script_dir}/../mediamtx" && -d "${script_dir}/../scripts" ]]; then
  iptv_root="$(cd "${script_dir}/.." && pwd)"
else
  repo_root="$(cd "${script_dir}/../../.." && pwd)"
  iptv_root="${repo_root}/ops/iptv"
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root inside the Vast container." >&2
  exit 77
fi

arch="$(uname -m)"
if [[ "$arch" != "x86_64" ]]; then
  echo "Unsupported arch for this installer: ${arch}" >&2
  exit 77
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  ca-certificates curl wget xz-utils jq iproute2 net-tools \
  ffmpeg nginx supervisor

install -d -m 0755 \
  /etc/kinglive/iptv/channels \
  /etc/kinglive/restreams \
  /opt/kinglive/overlays \
  /opt/mediamtx \
  /var/lib/kinglive-restream-sync \
  /var/log/kinglive \
  /var/run/kinglive

install -m 0755 "${iptv_root}/scripts/kinglive-restream" /usr/local/bin/kinglive-restream
install -m 0755 "${iptv_root}/scripts/kinglive-iptv-health" /usr/local/bin/kinglive-iptv-health
install -m 0755 "${iptv_root}/scripts/kinglive-restream-watchdog" /usr/local/bin/kinglive-restream-watchdog
install -m 0755 "${iptv_root}/scripts/restream-sync.mjs" /usr/local/bin/kinglive-restream-sync
install -m 0644 "${iptv_root}/mediamtx/mediamtx.yml" /opt/mediamtx/mediamtx.yml

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

if [[ ! -x /opt/mediamtx/mediamtx ]]; then
  curl -fsSL \
    "https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/mediamtx_${MEDIAMTX_VERSION}_linux_amd64.tar.gz" \
    -o "${tmp_dir}/mediamtx.tar.gz"
  tar -xzf "${tmp_dir}/mediamtx.tar.gz" -C "$tmp_dir"
  install -m 0755 "${tmp_dir}/mediamtx" /opt/mediamtx/mediamtx
fi

if [[ ! -x "/opt/node-${NODE_VERSION}-linux-x64/bin/node" ]]; then
  curl -fsSL \
    "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.xz" \
    -o "${tmp_dir}/node.tar.xz"
  tar -xf "${tmp_dir}/node.tar.xz" -C /opt
fi
ln -sf "/opt/node-${NODE_VERSION}-linux-x64/bin/node" /usr/local/bin/node
ln -sf "/opt/node-${NODE_VERSION}-linux-x64/bin/npm" /usr/local/bin/npm
ln -sf "/opt/node-${NODE_VERSION}-linux-x64/bin/npx" /usr/local/bin/npx

cat >/etc/nginx/conf.d/kinglive-hls.conf <<'NGINX'
server {
    listen 80 default_server;
    listen 8080 default_server;
    server_name _;

    access_log /var/log/kinglive/nginx.log;
    error_log /var/log/kinglive/nginx.err.log warn;

    location = /health {
        add_header Content-Type text/plain;
        return 200 "ok\n";
    }

    location /live/ {
        proxy_pass http://127.0.0.1:8888/live/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Range, Origin, Accept, User-Agent, X-Requested-With, If-Modified-Since, Cache-Control, Content-Type" always;
        add_header Access-Control-Expose-Headers "Content-Length, Content-Range, Accept-Ranges" always;

        if ($request_method = OPTIONS) {
            return 204;
        }
    }
}
NGINX

rm -f /etc/nginx/sites-enabled/default

cat >/usr/local/bin/kinglive-restream-supervisorctl <<'WRAPPER'
#!/usr/bin/env bash
set -euo pipefail

prefix="${RESTREAM_SYSTEMD_PREFIX:-kinglive-restream@}"
conf_dir="/etc/supervisor/conf.d"

unit_to_slug() {
  local unit="${1:-}"
  unit="${unit%.service}"
  unit="${unit#${prefix}}"
  if [[ -z "$unit" || "$unit" == *"/"* || "$unit" == *".."* ]]; then
    return 1
  fi
  printf '%s\n' "$unit"
}

write_conf() {
  local slug="$1"
  cat >"${conf_dir}/kinglive_${slug}.conf" <<EOF
[program:kinglive_${slug}]
command=/usr/local/bin/kinglive-restream ${slug}
autostart=true
autorestart=true
startsecs=3
stopasgroup=true
killasgroup=true
stdout_logfile=/var/log/kinglive/${slug}.log
stderr_logfile=/var/log/kinglive/${slug}.err.log
EOF
}

case "${1:-}" in
  enable)
    shift
    [[ "${1:-}" == "--now" ]] && shift
    slug="$(unit_to_slug "${1:-}")"
    write_conf "$slug"
    supervisorctl reread >/dev/null || true
    supervisorctl update >/dev/null || true
    supervisorctl start "kinglive_${slug}" >/dev/null 2>&1 || true
    ;;
  disable)
    shift
    [[ "${1:-}" == "--now" ]] && shift
    slug="$(unit_to_slug "${1:-}")"
    supervisorctl stop "kinglive_${slug}" >/dev/null 2>&1 || true
    rm -f "${conf_dir}/kinglive_${slug}.conf"
    supervisorctl reread >/dev/null || true
    supervisorctl update >/dev/null || true
    ;;
  restart)
    shift
    slug="$(unit_to_slug "${1:-}")"
    write_conf "$slug"
    supervisorctl reread >/dev/null || true
    supervisorctl update >/dev/null || true
    supervisorctl restart "kinglive_${slug}" >/dev/null 2>&1 || supervisorctl start "kinglive_${slug}" >/dev/null 2>&1 || true
    ;;
  list-units)
    for file in "${conf_dir}"/kinglive_*.conf; do
      [[ -e "$file" ]] || continue
      slug="$(basename "$file" .conf)"
      slug="${slug#kinglive_}"
      echo "${prefix}${slug}.service loaded active running"
    done
    ;;
  *)
    echo "Unsupported command: $*" >&2
    exit 64
    ;;
esac
WRAPPER
chmod 0755 /usr/local/bin/kinglive-restream-supervisorctl

cat >/usr/local/bin/kinglive-restream-sync-loop <<'LOOP'
#!/usr/bin/env bash
set -euo pipefail
env_file="${RESTREAM_SYNC_ENV_FILE:-/etc/kinglive/restream-sync.env}"
interval="${RESTREAM_SYNC_INTERVAL_SECONDS:-15}"

while true; do
  if [[ -r "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
    /usr/local/bin/node /usr/local/bin/kinglive-restream-sync || true
  else
    echo "missing env file: $env_file" >&2
  fi
  sleep "$interval"
done
LOOP
chmod 0755 /usr/local/bin/kinglive-restream-sync-loop

if [[ ! -f /etc/kinglive/restream-sync.env ]]; then
  cat >/etc/kinglive/restream-sync.env <<'ENV'
# Fill RESTREAM_SYNC_TOKEN on the server only. Do not commit real secrets.
RESTREAM_API_URL='https://kinglive-football-api.figurator228.workers.dev/api/restreams?origin_id=aws-us-1'
RESTREAM_OVERLAY_API_URL='https://kinglive-football-api.figurator228.workers.dev/api/restream-overlays'
RESTREAM_PUBLIC_BASE_URL='https://cdn-hls.livekinglive.win/aws/live'
RESTREAM_SYNC_TOKEN=''
RESTREAM_CONFIG_DIR='/etc/kinglive/iptv/channels'
RESTREAM_STATE_FILE='/var/lib/kinglive-restream-sync/state.json'
RESTREAM_SYSTEMD_PREFIX='kinglive-restream@'
RESTREAM_RTMP_BASE_URL='rtmp://127.0.0.1:1935/live'
RESTREAM_OVERLAY_DIR='/opt/kinglive/overlays'
SYSTEMCTL_BIN='/usr/local/bin/kinglive-restream-supervisorctl'
ENV
  chmod 0600 /etc/kinglive/restream-sync.env
fi

cat >/etc/supervisor/conf.d/kinglive-origin.conf <<'SUPERVISOR'
[program:mediamtx]
command=/opt/mediamtx/mediamtx /opt/mediamtx/mediamtx.yml
autostart=true
autorestart=true
stdout_logfile=/var/log/kinglive/mediamtx.log
stderr_logfile=/var/log/kinglive/mediamtx.err.log

[program:nginx]
command=/usr/sbin/nginx -g "daemon off;"
autostart=true
autorestart=true
stdout_logfile=/var/log/kinglive/nginx.log
stderr_logfile=/var/log/kinglive/nginx.err.log

[program:kinglive_restream_sync]
command=/usr/local/bin/kinglive-restream-sync-loop
autostart=true
autorestart=true
stdout_logfile=/var/log/kinglive/restream-sync.log
stderr_logfile=/var/log/kinglive/restream-sync.err.log
SUPERVISOR

nginx -t
if ! pgrep -x supervisord >/dev/null 2>&1; then
  supervisord -c /etc/supervisor/supervisord.conf
fi
supervisorctl reread || true
supervisorctl update || true
supervisorctl restart mediamtx nginx kinglive_restream_sync >/dev/null 2>&1 || true

echo "Installed KingLive Vast origin."
echo "Next:"
echo "  1. Put the real RESTREAM_SYNC_TOKEN into /etc/kinglive/restream-sync.env"
echo "  2. Run: supervisorctl restart kinglive_restream_sync"
echo "  3. Check: curl -sS http://127.0.0.1:80/health"
echo "  4. Point Cloudflare/Vast origin DNS or Worker upstream to this host IP and mapped port."
