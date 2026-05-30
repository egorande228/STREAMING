# Cloudflare Setup

This project can run in two modes:

- **Cloudflare-only**: static Pages sites plus a Worker API proxy. Use this when you only have a Cloudflare domain and no VPS.
- **VPS origin**: Docker, nginx, backend, PostgreSQL and Cloudflare in front. Use this only when a VPS is available.

## 1. Domain Registration

Buy 3–5 domains across **different registrars** (resilience against registrar-level takedowns):

| Domain | Registrar | Notes |
|--------|-----------|-------|
| `wc26.live` | Namecheap | primary |
| `wc2026.tv` | Porkbun | backup |
| `worldcup.stream` | Njalla | privacy-first |
| `wc26.watch` | Cloudflare Registrar | cheapest renewal |
| `wc26.online` | Spaceship | cold standby |

Enable **Privacy WHOIS** on every domain.

## 2. Add Domains to Cloudflare

1. Go to https://dash.cloudflare.com → **Add a site** for each domain.
2. Choose the **Free** plan to start (upgrade to Pro for load balancer).
3. Update the NS records at your registrar to the two Cloudflare nameservers shown (e.g., `vera.ns.cloudflare.com`).
4. Wait for propagation (usually <15 min). Cloudflare will email when active.

## 3. DNS Records

### Cloudflare-only

Use Cloudflare Pages custom domains for:

| Host | Target |
|------|--------|
| `@` or `www` | `sites/main` Pages project |
| `player` | `sites/player` Pages project |

Add a Worker route for the football API proxy:

```text
kinglive.example.com/api/*
```

### VPS origin

For **each** zone, create:

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| A | `@` | `<VPS primary IP>` | Proxied (orange) |
| A | `www` | `<VPS primary IP>` | Proxied (orange) |
| TXT | `_mirrors` | `mirror=https://wc2026.tv` | DNS only |

The `_mirrors` TXT record is used by the frontend DoH fallback (`frontend/lib/api.ts:discoverMirrorViaDns`). Update it whenever the primary domain changes.

## 4. SSL/TLS

1. **SSL/TLS mode**: `Full (strict)` — Cloudflare encrypts both edges.
2. **Origin Certificate**: SSL/TLS → Origin Server → **Create Certificate**
   - Key type: RSA 2048 (or ECDSA P-256 for faster handshakes)
   - Expiry: **15 years**
   - Click **Create** → copy `origin.pem` and `origin.key`
   - Place them on the VPS at `docker/nginx/certs/origin.pem` and `.../origin.key` (mode 600, owner root)
3. **Always Use HTTPS**: SSL/TLS → Edge Certificates → On
4. **HSTS**: SSL/TLS → Edge Certificates → HSTS → `max-age=31536000; includeSubDomains` (enable after verifying HTTPS works)
5. **Minimum TLS Version**: TLS 1.2

## 5. Cache Rules

Rules → **Cache Rules** → Create rules in this order:

### Rule 1 — HLS segments (immutable)
- **When**: URI path ends with `.ts`
- **Cache Eligibility**: Eligible for cache
- **Edge TTL**: 300 s (5 min)
- **Browser TTL**: 60 s

### Rule 2 — Playlist files (near-realtime)
- **When**: URI path ends with `.m3u8`
- **Cache Eligibility**: Eligible for cache
- **Edge TTL**: 1 s
- **Browser TTL**: 1 s

### Rule 3 — API reads (honour origin Cache-Control)
- **When**: URI path matches regex `^/api/(matches|groups|mirrors|health)`
- **Cache Eligibility**: Eligible for cache
- **Edge TTL**: Respect origin
- **Browser TTL**: Respect origin

### Rule 4 — Bypass admin + WebSocket
- **When**: URI path starts with `/api/admin/` OR `/api/ws/`
- **Cache Eligibility**: Bypass cache

## 6. Rate Limiting (Pro plan)

Security → **Rate Limiting** → Create rules:

| Rule | Match | Threshold | Action |
|------|-------|-----------|--------|
| Admin login bruteforce | `/api/admin/login` | 5 req / 10 min / IP | Managed Challenge |
| API flood | `/api/*` | 120 req / min / IP | Block 1 h |

## 7. WAF and Bot Protection

Security → **WAF**:
- **Security Level**: Medium
- **Bot Fight Mode**: On (free; blocks known bad bots)
- **Custom Rule**: Challenge requests to `/api/admin/*` from unverified bots

Security → **DDoS**: leave Managed DDoS rules enabled at default.

## 8. Load Balancer (multi-origin failover)

Requires **Pro** ($20/mo) or **Load Balancing** add-on (~$5/mo extra).

1. Traffic → **Load Balancing** → Create Load Balancer.
2. Create **two origin pools**:
   - `eu-primary`: origin = EU VPS IP, weight 1
   - `us-secondary`: origin = US VPS IP, weight 1
3. Create a **health monitor**:
   - Type: HTTP
   - Path: `/api/health`
   - Expected status: 200
   - Expected body: `"ok"`
   - Check interval: 30 s
   - Unhealthy threshold: 3 failures
   - Healthy threshold: 2 successes
4. Attach the monitor to both pools.
5. **Steering**: Latency-based (CF routes to the fastest healthy pool).
6. When the primary pool fails health checks 3× in a row, CF shifts traffic to secondary within ~30 s.

If you are not using the Load Balancer, instead point each domain's A record to the secondary VPS manually when the primary goes down.

## 9. Cloudflare Workers

### Football API proxy (Cloudflare-only)

The Worker in `workers/football-api` proxies match and score requests to API-FOOTBALL without exposing the API key in browser code.

Free-plan fit:

- Workers Free includes 100,000 requests/day, 10 ms CPU/request, 128 MB memory and 50 external subrequests/request.
- This Worker uses one external API request only on a cache miss.
- Cache TTLs are 30 s for live data, 60 s for a match detail, and 600 s for schedules.

Deploy:

```bash
cd workers/football-api
npx wrangler secret put API_FOOTBALL_KEY
npx wrangler deploy
```

Do not put the API key into `sites/main/config.js`, browser code, or git. For local Worker testing, create `workers/football-api/.dev.vars` from `.dev.vars.example`.

Route it in Cloudflare:

```text
kinglive.example.com/api/*
```

Supported endpoints:

```text
/api/matches?status=live
/api/matches?status=half_time
/api/matches?status=scheduled
/api/matches?date=2026-06-11
/api/matches/123456
```

When this Worker is on the same domain as the main Pages site, keep `sites/main/config.js` as:

```js
window.KINGLIVE_MAIN_CONFIG = {
  apiBase: '',
  playerBase: 'https://player.kinglive.example.com',
  defaultLocale: 'en',
  adSlots: {},
};
```

### Stream proxy

Optional: hides the upstream m3u8 source from viewers.

```bash
cd workers/stream-proxy
npm install
# edit wrangler.toml — set account_id and zone_id
npx wrangler deploy
```

This deploys the worker in `workers/stream-proxy/worker.js` which proxies `/proxy?url=<hmac-signed-m3u8-url>`.

## 9a. Cloudflare Pages (separate static sites)

For a simpler split deployment, two standalone static sites are available:

| Site | Folder | Purpose |
|------|--------|---------|
| Main | `sites/main` | Public homepage, live/upcoming match entry points, iframe code copy |
| Player | `sites/player` | Standalone HLS/iframe player that can also be embedded elsewhere |

Deploy each folder as its own Cloudflare Pages project:

```bash
npx wrangler pages deploy sites/main --project-name stream-main-site
npx wrangler pages deploy sites/player --project-name stream-player-site
```

Or use the dashboard:

- Framework preset: **None**
- Build command: empty
- Build output directory: `/`
- Root directory: `sites/main` or `sites/player`

Before deploying, edit:

- `sites/main/config.js`: set `apiBase` and `playerBase`
- `sites/player/config.js`: set `apiBase`
- optional banner HTML in `adSlots` for each site

Player page banner placeholders:

- `playerTop`: `728x90`, above the video.
- `playerBottom`: `728x90`, below the video.
- `playerRail`: `300x250`, right rail on desktop.

The player supports three URL shapes:

```text
https://player.example.com/?match=1&lang=en&region=global
https://player.example.com/?src=https%3A%2F%2Fexample.com%2Flive.m3u8&type=hls
https://player.example.com/?src=https%3A%2F%2Frestream.example.com%2Fembed&type=iframe
```

To embed the standalone player:

```html
<iframe
  src="https://player.example.com/?match=1"
  width="960"
  height="540"
  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
  allowfullscreen
></iframe>
```

## 10. Origin IP Firewall

After enabling Cloudflare proxy, block all direct origin traffic:

```bash
# On the VPS — run as part of bootstrap.sh or manually
sudo bash scripts/deploy/cf-ips-update.sh
```

This script downloads Cloudflare IP ranges and:
- Writes `set_real_ip_from` directives to `docker/nginx/cloudflare-ips.conf`
- Reloads nginx

Also add ufw rules (already in `bootstrap.sh`):
```bash
ufw allow from <CF IPv4 range> to any port 80
ufw allow from <CF IPv4 range> to any port 443
# ... (bootstrap.sh does all CF ranges automatically)
```

Set up a weekly cron to keep CF ranges current:
```cron
0 3 * * 0 root OUT=/opt/stream_site/docker/nginx/cloudflare-ips.conf bash /opt/stream_site/scripts/deploy/cf-ips-update.sh
```

## 11. Sanity Checks

After full setup, verify:

```bash
# CF is proxying (you see Cloudflare anycast IPs, not VPS IP)
dig +short wc26.live

# Origin cert is served
openssl s_client -connect wc26.live:443 -alpn h2 </dev/null 2>&1 | grep -E "Protocol|CN="

# .ts caching works
curl -sI https://wc26.live/live/demo/0.ts | grep -E "CF-Cache-Status|Cache-Control"
# Second request: CF-Cache-Status: HIT

# Rate limit works
for i in $(seq 1 130); do curl -so/dev/null -w "%{http_code}\n" https://wc26.live/api/matches; done | sort | uniq -c
# Should see 429 after ~120 requests per minute
```
