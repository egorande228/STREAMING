# KingLive football API Worker

Cloudflare-only proxy for match fixtures and scores. The Worker keeps the API key server-side and exposes a small API that matches the static site.

## Endpoints

- `GET /api/matches?status=live`
- `GET /api/matches?status=half_time`
- `GET /api/matches?status=scheduled`
- `GET /api/matches?date=YYYY-MM-DD`
- `GET /api/matches/:id`
- `GET /api/matches/:id/stats`
- `GET /api/streams/active`
- `POST /api/admin/login`
- `GET /api/admin/streams`
- `POST /api/admin/streams`
- `PUT /api/admin/streams/:id`
- `DELETE /api/admin/streams/:id`

## Secrets

```bash
npx wrangler secret put API_FOOTBALL_KEY
```

For local development, copy `.dev.vars.example` to `.dev.vars` and put the real key there. Do not commit `.dev.vars`.

## Streams

Set `MATCH_STREAMS_JSON` as a Worker variable to make the API attach playable streams to matching fixtures. This is the only stream source: API-FOOTBALL is used for fixtures and stats, not for deciding which matches have streams. The main site only shows the player button when a returned match has at least one active stream from this manual config.

```json
{
  "1540843": [
    {
      "url": "https://stream-source.example.com/live.m3u8",
      "source_type": "hls",
      "label": "English HD",
      "language_code": "en",
      "region": "global",
      "priority": 100,
      "is_active": true,
      "starts_at": "2026-06-11T18:55:00Z",
      "ends_at": "2026-06-11T21:20:00Z"
    }
  ]
}
```

`starts_at/ends_at` are optional. If present, stream is visible only during this window.

For admin editing from Cloudflare Pages, use KV instead of static `MATCH_STREAMS_JSON`:

1. Create KV namespace and bind it as `STREAM_CONFIG_KV` in `wrangler.toml`.
2. Set admin credentials as secrets:

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ADMIN_BEARER_TOKEN
```

3. Set admin username as variable:

```bash
npx wrangler secret put ADMIN_USERNAME
```

4. Enable Cloudflare Access enforcement for admin routes (recommended):

- Set Worker vars:
  - `ADMIN_REQUIRE_ACCESS=true`
  - `ADMIN_ACCESS_EMAILS=mail1@example.com,mail2@example.com`
- In Cloudflare Zero Trust, protect:
  - `https://<main-domain>/admin*`
  - `https://<worker-domain>/api/admin/*`
  with Google or Email OTP login policy.

The admin panel logs in via `POST /api/admin/login` and then manages streams in KV through `/api/admin/streams`.

## Deploy

```bash
cd workers/football-api
npx wrangler deploy
```

Use a Worker route like:

```text
kinglive.example.com/api/*
```

The static site can keep `apiBase: ''` when the Worker is routed on the same domain.
