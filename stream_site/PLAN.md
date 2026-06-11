# Streaming Site - Current Implementation Snapshot

## Summary

Проект сейчас состоит из двух Next.js приложений, одного Go backend, PostgreSQL, Redis, RTMP ingest и HLS restream proxy. Основной сайт обслуживается через `nginx`, а stream surface поднимается как отдельный Next.js runtime на `:3100`.

## Current Structure

```text
stream_site/
  backend/
    cmd/server/main.go
    internal/
      config/config.go
      handler/
      middleware/
      model/
      repository/
      service/
      ws/
    migrations/
      001_initial.sql
      002_mirrors_priority.sql
      003_external_ids.sql
      010_perf_indexes.sql
      011_stream_keys.sql
      012_stream_source_type.sql
      013_stats.sql
      014_mirrors_primary_unique.sql
  frontend/
    Dockerfile
    apps/
      main/
      stream/
  docker/
    docker-compose.yml
    docker-compose.prod.yml
    nginx/nginx.conf
  scripts/
    seed-admin.sh
    seed-admin.sql
    seed-schedule.sql
    seed-teams.sql
```

## Runtime Layout

```text
http://localhost/              -> nginx -> frontend_main
http://localhost/api/*         -> nginx -> backend
http://localhost/live/*        -> nginx -> rtmp
http://localhost/hls/*         -> nginx -> hls_proxy
http://localhost:3100/         -> frontend_stream
```

`frontend_main` is the public site with schedule, groups, match pages, and admin UI. `frontend_stream` is the separate stream/watch surface. `backend` owns auth, match/stream/mirror CRUD, match stats, live score push, and RTMP authorization.

## Security And Bootstrap

- Development defaults are allowed only in `ENV=development`.
- `backend/internal/config/config.go` now rejects production startup without a real `JWT_SECRET`.
- Production startup also requires `ADMIN_PASSWORD_HASH`, so admin bootstrap is explicit instead of silently falling back to `admin/admin123`.
- `scripts/seed-admin.sh` handles bootstrap:
  - uses `ADMIN_PASSWORD_HASH` when provided
  - falls back to the dev hash only when `ENABLE_DEV_ADMIN_BOOTSTRAP=true`
  - can seed `DEFAULT_MIRROR_DOMAIN` when explicitly configured

## Mirror Integrity

- `backend/internal/handler/mirror.go` now demotes existing primaries in a transaction before promoting a new one through create/update flows.
- `backend/migrations/014_mirrors_primary_unique.sql` cleans duplicate primaries and adds a partial unique index so only one `is_primary=true` row can exist.
- Frontend mirror consumers now use `health_status === "healthy"` to match backend values.

## API Surface

### Public

- `GET /api/health`
- `GET /api/mirrors`
- `GET /api/matches`
- `GET /api/matches/:id`
- `GET /api/matches/:id/stats`
- `GET /api/groups`
- `GET /api/groups/:id`
- `WS /api/ws/chat/:matchId`
- `WS /api/ws/live`

### Admin

- `POST /api/admin/login`
- `GET/POST/PUT/DELETE /api/admin/matches`
- `PUT /api/admin/matches/:id/score`
- `POST/DELETE /api/admin/matches/:id/events`
- `POST/DELETE /api/admin/matches/:id/lineups`
- `GET/POST/PUT/DELETE /api/admin/streams`
- `GET/POST/PUT/DELETE /api/admin/mirrors`
- `POST /api/admin/mirrors/:id/activate`

### Internal

- `POST /internal/rtmp/authorize`
- `POST /internal/rtmp/done`
- `GET /metrics/ws`

## Local Workflows

### Full stack via Docker

```bash
cp docker/.env.example docker/.env
cd docker
docker compose up --build -d
```

### App URLs

- Main site: `http://localhost/`
- Admin: `http://localhost/admin/login`
- Stream surface: `http://localhost:3100/en/stream/1`

If `3100` is busy locally, override `STREAM_SURFACE_PORT` and `NEXT_PUBLIC_STREAM_SITE_URL` together before building the Docker stack.

### Local dev without Dockerized frontends

```bash
cd backend && go run ./cmd/server
cd frontend && npm run dev
```

In that mode, set `NEXT_PUBLIC_STREAM_SITE_URL` in `frontend/apps/main/.env.local` if the stream app runs on a separate origin.

## Known Next Steps

- Add stronger backend integration coverage around database-backed handlers.
- Add more frontend smoke coverage beyond stream URL resolution and admin unauthorized handling.
- Decide whether production should expose `frontend_stream` directly on a separate port or route it behind a dedicated reverse-proxy hostname.
- Replace remaining hardcoded fallback mirror domains in frontend API clients with deployment-owned configuration.
