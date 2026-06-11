# VPS Setup Guide

## 1. Provider and Spec

### Recommended providers (privacy-friendly, DMCA-tolerant)

| Provider | Location | Plan | Monthly |
|----------|----------|------|---------|
| BuyVM | LU / LV / US | KVM, unmetered 1 Gbps | $7–$15 |
| FlokiNET | IS / RO | KVM, GDPR-friendly | $12–$20 |
| 1984 Hosting | IS | OpenStack | $15 |
| Frantech | EU | SSD VPS | $7 |

### Target spec for 20k concurrent viewers

| Role | vCPU | RAM | Disk | Network |
|------|------|-----|------|---------|
| Primary origin (EU) | 4 | 8 GB | 200 GB NVMe | 1 Gbps unmetered |
| Secondary origin (US) | 2 | 4 GB | 100 GB NVMe | 500 Mbps |

> **Bottleneck is network bandwidth**, not CPU. At 20k viewers pulling 2 Mbps segments from Cloudflare edge, origin bandwidth needed is far lower (CF caches `.ts` at 95%+), but plan for at least 500 Mbps burst headroom.

OS: **Debian 12 stable** (recommended) or Ubuntu 22.04 LTS.

## 2. Bootstrap

Run once as root on a fresh server:

```bash
curl -fsSL https://raw.githubusercontent.com/your-org/stream_site/main/scripts/deploy/bootstrap.sh | sudo bash
```

Or clone the repo first:

```bash
git clone https://github.com/your-org/stream_site /opt/stream_site
sudo bash /opt/stream_site/scripts/deploy/bootstrap.sh
```

`bootstrap.sh` does:
- apt update + unattended-upgrades
- Install Docker CE + compose plugin, git, jq, fail2ban, ufw
- Create `deploy` user with Docker access
- 4 GB swapfile, `vm.swappiness=10`
- Kernel tuning: `net.core.somaxconn=65535`, `net.ipv4.tcp_tw_reuse=1`, `fs.file-max=1048576`
- SSH hardening: PermitRootLogin no, PasswordAuthentication no, port 2222
- fail2ban: sshd jail, max 5 retries, 1h ban
- ufw: allow 2222 from your IP only, allow 80/443 from Cloudflare ranges, allow 1935 from whitelist

After bootstrap, add your SSH public key to `/home/deploy/.ssh/authorized_keys`.

## 3. TLS Certificates

Generate the **Cloudflare Origin Certificate** (see `docs/deploy/cloudflare-setup.md` § 4).

Place files on the VPS:

```bash
mkdir -p /opt/stream_site/docker/nginx/certs
# SCP or paste the content:
cat > /opt/stream_site/docker/nginx/certs/origin.pem  # paste cert
cat > /opt/stream_site/docker/nginx/certs/origin.key  # paste key
chmod 600 /opt/stream_site/docker/nginx/certs/origin.key
```

The prod nginx config (`docker-compose.prod.yml`) mounts `./nginx/certs:/etc/nginx/certs:ro`.

## 4. Environment File

Copy `.env.prod.example` to `.env.prod` and fill in values:

```bash
cp /opt/stream_site/.env.prod.example /opt/stream_site/.env.prod
vim /opt/stream_site/.env.prod
```

Required variables (see `.env.prod.example` for full list):

```
JWT_SECRET=<64-char random string — openssl rand -hex 32>
POSTGRES_PASSWORD=<strong password>
REDIS_PASSWORD=<strong password>
REDIS_URL=redis://:REDIS_PASSWORD@redis:6379
DATABASE_URL=postgres://stream:POSTGRES_PASSWORD@postgres:5432/streamdb?sslmode=disable
TELEGRAM_BOT_TOKEN=<from @BotFather>
TELEGRAM_CHANNEL_ID=<your channel numeric id>
```

## 5. Cloudflare IP Ranges

Run before starting nginx for the first time:

```bash
sudo bash /opt/stream_site/scripts/deploy/cf-ips-update.sh
```

Add weekly cron:

```bash
echo '0 3 * * 0 root OUT=/opt/stream_site/docker/nginx/cloudflare-ips.conf bash /opt/stream_site/scripts/deploy/cf-ips-update.sh' \
  | sudo tee /etc/cron.d/cf-ips-update
```

## 6. First Deploy

```bash
cd /opt/stream_site
git pull origin main

bash scripts/deploy/deploy.sh
```

`deploy.sh` runs:
```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml pull
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d --wait
curl -f https://<your-domain>/api/health
```

If the health check fails, it prints logs and exits 1 (no automatic rollback on first deploy).

## 7. Verify Everything

```bash
# All services healthy
docker compose -f docker/docker-compose.yml ps

# Backend API
curl -s http://localhost:8080/api/health | jq .

# Nginx is caching HLS
curl -sI http://localhost/live/demo.m3u8 | grep Cache-Control

# ETag on API
curl -sI http://localhost/api/matches | grep -E "ETag|Cache-Control"

# WS metrics
curl -s http://localhost/metrics/ws | jq .

# Mirror leader lock (single instance expected)
docker compose exec redis redis-cli GET ch:mirror-leader

# RTMP publish locked down
# From outside: ffmpeg -f lavfi -i anullsrc -f flv rtmp://<VPS_IP>:1935/live/test
# Expected: connection refused or RTMP error (not from whitelist)
```

## 8. Backups

Set up daily Postgres dump to Backblaze B2:

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash
rclone config  # create a B2 remote named "b2"

# Test backup
DATABASE_URL="$(grep DATABASE_URL /opt/stream_site/.env.prod | cut -d= -f2-)" \
  B2_REMOTE="b2:your-bucket-name" \
  bash /opt/stream_site/scripts/deploy/backup-pg.sh

# Daily cron
echo '0 3 * * * deploy DATABASE_URL=... B2_REMOTE=b2:your-bucket bash /opt/stream_site/scripts/deploy/backup-pg.sh' \
  | sudo tee /etc/cron.d/stream-backup
```

## 9. Monitoring

Add Uptime Kuma for mirror/health checks:

```yaml
# append to docker/docker-compose.prod.yml
  uptime-kuma:
    image: louislam/uptime-kuma:latest
    restart: unless-stopped
    volumes:
      - uptime_data:/app/data
    ports:
      - "127.0.0.1:3001:3001"
```

Access at `http://localhost:3001` via SSH tunnel and configure HTTP monitors for each mirror domain's `/api/health`.

## 10. Scale-out Playbook

When origin bandwidth or CPU saturates:

1. **API latency** rises first → scale backend replicas in `docker-compose.prod.yml` (increase `replicas: 2` → `3`).
2. **HLS bandwidth** rises → cache hit rate is low; check CF Cache Rules are applied and `.ts` TTL is 300 s.
3. **Chat delivery drops** → inspect `/metrics/ws` dropped messages; scale Redis if pub/sub fan-out lags.
4. **Full origin overload** → add a second VPS, add it to the Cloudflare Load Balancer pool, update the `_mirrors` TXT DNS record.

See `docs/deploy/scaling-runbook.md` for incident playbooks.
