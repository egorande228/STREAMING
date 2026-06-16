# melteam.org HLS CDN Cache Test

Local-only plan for testing Cloudflare caching on `melteam.org` without touching
the working KingLive production domains.

## Scope

- Test hostname: `hls-test.melteam.org`
- Production hostnames untouched:
  - `livekinglive.win`
  - `hls.livekinglive.win`
  - `kinglive.live`
- Git workflow: no commit, no push, no `main` changes unless explicitly approved.
- Secrets and donor IPTV URLs stay out of Git.

## Deployed Test Shape

The live test host uses a Cloudflare Worker route:

```text
hls-test.melteam.org/* -> kinglive-hls-test-proxy
```

Worker source:

```text
ops/iptv/cloudflare/melteam-hls-test-worker.js
```

The Worker fetches public HLS from:

```text
https://hls.livekinglive.win
```

This keeps `livekinglive.win`, `hls.livekinglive.win`, and `kinglive.live`
unchanged. The origin Caddyfile is not part of the active test path.

Header/cache policy:

```text
*.m3u8  -> Cache-Control: no-store
*.ts    -> Cache-Control: public, max-age=300, s-maxage=300
*.m4s   -> Cache-Control: public, max-age=300, s-maxage=300
*.mp4   -> Cache-Control: public, max-age=300, s-maxage=300
*.aac   -> Cache-Control: public, max-age=300, s-maxage=300
```

## Cloudflare DNS

In the `melteam.org` zone, create only this test record:

```text
Type: A
Name: hls-test
Target: <origin VPS IP>
Proxy: Proxied / orange cloud
```

Current deployed record:

```text
hls-test.melteam.org A 145.223.69.219 proxied
```

The Worker route intercepts requests before origin. Do not point `@`, `www`, or
any production KingLive hostname during this test.

## Cloudflare Cache Rules

Create rules for `hls-test.melteam.org` only.

Rule 1, HLS segments:

```text
When:
  Hostname equals hls-test.melteam.org
  AND URI Path ends with .ts

Cache eligibility:
  Eligible for cache

Edge TTL:
  5 minutes

Browser TTL:
  1 minute
```

If the test stream uses CMAF or audio sidecars, add the same rule for:

```text
.m4s
.mp4
.aac
```

Rule 2, HLS manifests:

```text
When:
  Hostname equals hls-test.melteam.org
  AND URI Path ends with .m3u8

Cache eligibility:
  Bypass cache
```

## Test Commands

After a test channel is provided and restreamed as `<slug>`:

```bash
curl -sI https://hls-test.melteam.org/live/<slug>/index.m3u8
curl -sL https://hls-test.melteam.org/live/<slug>/index.m3u8
```

Pick a segment URL from the manifest and request it twice:

```bash
curl -sI https://hls-test.melteam.org/live/<slug>/<segment>.ts
curl -sI https://hls-test.melteam.org/live/<slug>/<segment>.ts
```

Expected result:

```text
index.m3u8:
  Cache-Control: no-store
  CF-Cache-Status: BYPASS or DYNAMIC

segment:
  Cache-Control: public, max-age=300, s-maxage=300
  CF-Cache-Status: MISS on first request, HIT on second request
  X-Worker-Cache: MISS on first request, HIT on second request
```

## Dev Player

Open test streams through:

```text
https://player-dev.melteam.org/?src=<encoded_hls_url>&type=hls&title=CDN%20Test
```

Example:

```text
https://player-dev.melteam.org/?src=https%3A%2F%2Fhls-test.melteam.org%2Flive%2F19609139-es-spanish%2Findex.m3u8&type=hls&title=CDN%20Test
```

`player-dev.melteam.org/*` is routed through the Worker
`kinglive-player-dev-proxy`, which serves the current `player-933.pages.dev`
build. Direct `src` playback is enabled only when the hostname is
`player-dev.melteam.org`.

Known verification from setup:

```text
https://hls-test.melteam.org/live/19609139-es-spanish/index.m3u8
manifest: 200, Cache-Control: no-store

segment first GET:  200, CF-Cache-Status: MISS, X-Worker-Cache: MISS
segment second GET: 200, CF-Cache-Status: HIT,  X-Worker-Cache: HIT

player-dev URL: page 200, video element created, currentSrc hls-test URL,
readyState 4, no console errors.
```

## Rollback

Since this is isolated to `hls-test.melteam.org`, rollback is:

1. Delete the Worker route `hls-test.melteam.org/*`.
2. Delete the Worker route `player-dev.melteam.org/*`.
3. Delete the Worker scripts `kinglive-hls-test-proxy` and
   `kinglive-player-dev-proxy` if no longer needed.
4. Disable or delete the Cloudflare DNS records.
5. Delete the `hls-test.melteam.org` cache ruleset if no longer needed.

No production KingLive domain is part of the rollback.
