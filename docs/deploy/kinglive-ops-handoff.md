# KingLive safe ops handoff

This note is for a developer continuing KingLive work without breaking production.

## Current production map

- Main/admin Pages project: `kinglive-pages-main`
- Admin URL: `https://kinglive.live/admin`
- Player URL: `https://livekinglive.win/`
- Public API Worker: `kinglive-football-api`
- API URL: `https://kinglive-football-api.figurator228.workers.dev`
- Origin HLS: `https://hls.livekinglive.win/`
- CDN HLS: `https://cdn-hls.livekinglive.win/`
- Current working branch: `codex/dami-stream-fixes`

Do not deploy unrelated branches to production. Do not push directly to `main` unless explicitly requested.

## What changed recently

- API rewrites managed restream public URLs to `cdn-hls.livekinglive.win`.
- HLS CDN Worker caches media segments and bypasses manifests.
- Admin supports up to 3 video banners per restream.
- Admin banner canvas shows stream preview, real banner image, drag position, and resize handle.
- Restream sync emits numbered overlay env vars.
- Origin `kinglive-restream` supports multiple FFmpeg overlays.

## Before touching anything

Run:

```bash
git status
git branch --show-current
```

Expected branch for this work:

```text
codex/dami-stream-fixes
```

Never run these unless the owner explicitly asks:

```bash
git reset --hard
git checkout -- .
git clean -fd
```

Do not commit local secret files, `.env`, exported tokens, IPTV donor URLs, or files from `/private/tmp`.

## Tests before deploy

From repo root:

```bash
node --test workers/football-api/worker.test.mjs
npm test --prefix sites/main
npm test --prefix sites/player
node --test ops/iptv/scripts/restream-sync.test.mjs
bash -n ops/iptv/scripts/kinglive-restream
```

For a small admin-only CSS/JS change, at minimum run:

```bash
npm test --prefix sites/main
node --check sites/main/admin.js
```

## Deploy API Worker

Use the Cloudflare token from the private access note. Do not paste it into git or chat.

```bash
cd workers/football-api
CLOUDFLARE_API_TOKEN=... npx wrangler deploy
```

After deploy, verify:

```bash
curl -sL https://kinglive-football-api.figurator228.workers.dev/api/streams/active
```

Do not change `STREAM_CONFIG_KV` id unless you are intentionally moving accounts.

## Deploy main/admin Pages

```bash
cd sites/main
npm run build
CLOUDFLARE_API_TOKEN=... npx wrangler pages deploy dist --project-name kinglive-pages-main --branch main
```

This deploys Cloudflare Pages production for `kinglive.live`. It is not a git push to `main`.

Verify:

```bash
curl -sL https://kinglive.live/admin | rg 'admin.js|admin.css'
curl -sI https://kinglive.live/admin.css
```

## Deploy player Pages

Only do this when player code changed and was tested:

```bash
cd sites/player
npm test
npm run build
CLOUDFLARE_API_TOKEN=... npx wrangler pages deploy dist --project-name player --branch main
```

Confirm the actual Pages project before deploy if unsure.

## Origin VPS restream scripts

Production restream path:

```text
FFmpeg -> MediaMTX -> nginx/cache/Caddy -> hls.livekinglive.win -> cdn-hls.livekinglive.win -> player
```

Origin files:

```text
/usr/local/bin/kinglive-restream
/opt/kinglive-restream/restream-sync.mjs
```

After changing origin scripts, copy them to VPS, run syntax checks, then restart only the needed services.

Do not enable the watchdog unless explicitly requested. It should stay disabled/inactive:

```bash
systemctl show kinglive-restream-watchdog.timer -p ActiveState -p SubState --no-pager
```

Expected:

```text
ActiveState=inactive
SubState=dead
```

## Admin banner workflow

1. Open `https://kinglive.live/admin`.
2. Edit a stream.
3. Open `Video banners`.
4. Enable Banner 1/2/3.
5. Drag the banner image to change `X %` and `Y %`.
6. Drag the small corner handle to change `Width`.
7. Click `Save stream`.
8. If the restream is already running, click `Restart` for that stream.

## Git workflow

Stage only relevant files:

```bash
git add <files>
git status --short
git commit -m "..."
git push origin codex/dami-stream-fixes
```

Do not add these unless there is a specific reason:

```text
HANDOFF_KINGLIVE_STATUS.txt
sports-channels*.m3u*
sports-channels*.txt
stream_site/
/private/tmp/kinglive-access-secrets.md
```

## Quick rollback logic

- API Worker: redeploy previous commit's `workers/football-api/worker.js`.
- Admin Pages: redeploy previous `sites/main/dist` from a known good commit.
- HLS CDN Worker: route can be disabled in Cloudflare, falling back to origin HLS URLs only if API/public URLs are changed back.
- Origin restream: restore previous `/usr/local/bin/kinglive-restream` backup and restart only affected `kinglive-restream@<slug>.service`.

