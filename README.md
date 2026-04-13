# Live Stream Project

Next.js MVP for a match catalog, watch-page routing, operator admin, and resilient source management.

## What This Project Is

This project is the first working scaffold for a sports match platform with two product layers:

- `catalog domain`
  The public-facing match directory with schedules, match pages, audience capture, and content/SEO structure.
- `watch domain`
  A separate watch surface that can later host the actual player-first experience while sharing the same backend and admin workflow.

Right now the repository already includes:

- public homepage with grouped matches
- match detail pages with local kickoff time
- embedded player mode for supported sources
- redirect fallback mode
- source backup and mirror logic
- operator admin panel
- basic analytics and subscriptions capture
- audit log for admin actions
- demo storage mode
- optional Postgres storage mode

## Current Product Flow

1. Operator creates a match in `/admin`
2. Operator adds one or more sources to that match
3. Source can be:
   - `embed` for on-site viewing
   - `redirect` as emergency fallback
4. Public user opens the match page from the main catalog
5. Match page shows:
   - match metadata
   - current viewing mode
   - active source
   - backup links and mirrors
   - audience capture form
6. Operator can quickly rotate source state:
   - `primary`
   - `backup`
   - `disabled`

## What Already Works

- main catalog page at `/`
- test match pages at `/matches/[slug]`
- admin page at `/admin`
- create match flow
- create source flow
- source state switching
- live-config API for current watch state
- analytics event recording
- notification capture form
- basic auth protection for `/admin`
- Postgres-ready schema and seed files

## Stack

- `Next.js 15`
- `React 19`
- `TypeScript`
- `pg` for optional Postgres mode
- file-backed demo store for fast local testing

## Requirements

- Node.js `20.12+`
- npm `10+`

## Local Run

Install dependencies:

```bash
npm install
```

Create local env:

```bash
cp .env.example .env.local
```

Run dev server:

```bash
npm run dev
```

Open:

- `http://localhost:3000`
- `http://localhost:3000/admin`

## Admin Login

Admin credentials are controlled by `.env.local`:

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password
```

If both values are present, `/admin` requires Basic Auth.

## Storage Modes

### 1. Demo mode

Use this when:

- you want to test UI fast
- you do not want to install Postgres yet
- you just need local mock data and admin interactions

Config:

```bash
STORE_MODE=demo
DATA_FILE=/tmp/sport-live-stream-db.json
```

In this mode the project stores matches, sources, mirrors, analytics, and subscriptions in a local JSON file.

### 2. Postgres mode

Use this when:

- you want a proper backend
- you want more stable storage
- you want to move toward production

Config:

```bash
STORE_MODE=postgres
DATABASE_URL=postgres://postgres:postgres@localhost:5432/sport_live_stream
```

Setup:

```bash
psql -d sport_live_stream -f db/schema.sql
psql -d sport_live_stream -f db/seed.sql
```

Then restart:

```bash
npm run dev
```

## Database Files

- `db/schema.sql`
  Base schema for matches, sources, mirrors, operators, audit logs, subscriptions, analytics, and site config.
- `db/seed.sql`
  Starter records so the app opens with working test matches and sources.

## Main Routes

- `/`
  Match catalog homepage
- `/matches/[slug]`
  Public match page
- `/admin`
  Operator admin panel
- `/api/matches`
  Public matches API
- `/api/matches/[id]/live-config`
  Returns active watch configuration
- `/api/analytics`
  Records analytics events
- `/api/subscribe`
  Saves audience capture entries
- `/api/health`
  Basic health/status endpoint

## Core Files

- `app/page.tsx`
  Catalog homepage
- `app/matches/[slug]/page.tsx`
  Public match detail page
- `app/admin/page.tsx`
  Admin UI
- `lib/store.ts`
  Unified storage layer with `demo` and `postgres` modes
- `lib/postgres.ts`
  Postgres connection helper
- `lib/seed.ts`
  Demo data
- `components/source-panel.tsx`
  On-page player/fallback rendering
- `middleware.ts`
  Basic auth protection for admin

## Product Direction

The intended medium-term architecture is:

- one shared backend and admin
- one catalog-facing domain
- one separate watch-facing domain
- optional backup watch domains
- Cloudflare in front for caching, WAF, rate limiting, and traffic shielding

This gives a clean split between:

- discovery and audience growth
- actual watch experience
- operational failover

## Important Constraints

- demo storage is only for local testing
- Basic Auth is only a temporary admin gate
- no production-ready user auth exists yet
- no production deployment config is included yet
- no Cloudflare or multi-domain infra is configured yet
- source legality and licensing strategy are intentionally left outside the codebase

## Recommended Next Steps

1. Move the project to Postgres mode
2. Replace Basic Auth with proper login and roles
3. Split catalog pages and watch pages into separate layouts/domains
4. Add edit/delete flows in admin
5. Add richer analytics dashboard
6. Add real match ingestion workflow
7. Prepare deployment and domain strategy
8. Put Cloudflare in front before any public launch

## Production Notes

See:

- `docs/production-checklist.md`

## Status

This repository is a solid MVP scaffold, not a finished production service.
