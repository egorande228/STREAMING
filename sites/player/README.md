# Player site for Cloudflare Pages

This folder is a standalone static stream player. Deploy `sites/player` as a separate Cloudflare Pages project, for example on `player.example.com`.

## Configure

Primary source is backend `GET /api/streams/active`. `streams.json` is kept as static fallback. The key is the API-Football fixture id (`match_id`):

```json
{
  "1540843": {
    "url": "https://stream-source.example.com/live.m3u8",
    "source_type": "hls",
    "label": "Main stream",
    "language_code": "ru",
    "region": "global",
    "is_active": true,
    "starts_at": "2026-06-11T18:55:00Z",
    "ends_at": "2026-06-11T21:20:00Z"
  }
}
```

`apiBase` can be empty when `/api/*` is routed to the backend by the same domain.
When `starts_at/ends_at` are set, player will only open stream inside that time window.
Viewers cannot override the stream source with URL parameters.

## Banner slots

- `playerTop`: 728x90 leaderboard above the video.
- `playerBottom`: 728x90 leaderboard below the video.
- `playerRail`: 300x250 rectangle beside the video on desktop.

## URL format

```text
https://player.example.com/?match=1&lang=en&region=global
```

Embed the player elsewhere:

```html
<iframe
  src="https://player.example.com/?match=1"
  width="960"
  height="540"
  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
  allowfullscreen
></iframe>
```

The embed copy button is hidden for public viewers. Open the player with `?admin=1` only when you need that admin utility.

## Deploy

Cloudflare Pages settings:

- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `sites/player`

Important:

- For GitHub integration, connect the repository in Cloudflare Pages and use the settings above.
- Do not use `npx wrangler deploy` for a Pages project.
- For manual CLI publishing, use `npx wrangler pages deploy dist --project-name <your-pages-project>`.
