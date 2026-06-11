# WC 2026 Streaming Platform

Streaming platform for FIFA World Cup 2026. The stack serves a multilingual main site, a separate stream surface, a Go API, mirror discovery, RTMP ingest, and HLS restreaming.

## Runtime

```text
browser
  ├─ http://localhost/              -> nginx -> frontend_main
  ├─ http://localhost/api/*         -> nginx -> backend
  ├─ http://localhost/live/*        -> nginx -> rtmp
  ├─ http://localhost/hls/*         -> nginx -> hls_proxy
  └─ http://localhost:3100/         -> frontend_stream
```

## Services

| Service | Port | Purpose |
|---|---:|---|
| `nginx` | `80` | Main entrypoint for the public site and API proxy |
| `frontend_main` | internal `3000` | Main Next.js site (`frontend/apps/main`) |
| `frontend_stream` | `3100` | Stream Next.js surface (`frontend/apps/stream`) |
| `backend` | `8080` | Go API, JWT auth, WebSocket hub, mirror health |
| `postgres` | `5432` | Persistent relational data |
| `redis` | `6379` | Rate limiting and pub/sub |
| `rtmp` | `1935`, `8088` | RTMP ingest and HLS segment generation |
| `hls_proxy` | `8089` | External HLS restream proxy |

## API

| Method | Path |
|---|---|
| `GET` | `/api/health` |
| `GET` | `/api/mirrors` |
| `GET` | `/api/matches` |
| `GET` | `/api/matches/:id` |
| `GET` | `/api/matches/:id/stats` |
| `GET` | `/api/groups` |
| `GET` | `/api/groups/:id` |
| `WS` | `/api/ws/chat/:matchId` |
| `WS` | `/api/ws/live` |
| `POST` | `/api/admin/login` |
| `CRUD` | `/api/admin/matches` |
| `CRUD` | `/api/admin/streams` |
| `CRUD` | `/api/admin/mirrors` |
| `POST` | `/internal/rtmp/authorize` |
| `POST` | `/internal/rtmp/done` |

## Local Docker Start

```bash
cp docker/.env.example docker/.env
cd docker
docker compose up --build -d
```

Then open:

- Main site: `http://localhost/`
- Admin login: `http://localhost/admin/login`
- Stream surface: `http://localhost:3100/en/stream/1`

If `3100` is already occupied, override both `STREAM_SURFACE_PORT` and `NEXT_PUBLIC_STREAM_SITE_URL` before running `docker compose up`.

For local bootstrap, `.env.example` keeps `ENABLE_DEV_ADMIN_BOOTSTRAP=true`, which creates a development-only admin user with password `admin123`. Production must disable that path and provide a real `ADMIN_PASSWORD_HASH`.

## Production Requirements

- Set `ENV=production`
- Set a non-default `JWT_SECRET`
- Set `ADMIN_PASSWORD_HASH`
- Set `ENABLE_DEV_ADMIN_BOOTSTRAP=false`
- Set `NEXT_PUBLIC_STREAM_SITE_URL` to the real stream surface URL before building `frontend_main`

## Notes

- `frontend/apps/main` links to the stream surface through `NEXT_PUBLIC_STREAM_SITE_URL` when configured, otherwise it falls back to the current mirror/base URL.
- Mirror primary selection is enforced both in application logic and by a partial unique index in `backend/migrations/014_mirrors_primary_unique.sql`.
- Admin API calls now clear invalid JWTs and bounce the user back to `/admin/login` on `401`.
