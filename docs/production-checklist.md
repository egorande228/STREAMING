# Production checklist

## Infrastructure

- Put the app behind Cloudflare.
- Create `main` and `backup` domains pointed at the same deployment target group.
- Enable WAF, rate limiting, bot management, and caching for match pages.
- Keep origin locked down to Cloudflare IPs or private ingress where possible.

## Data layer

- Replace the file-backed store in `lib/store.ts` with Postgres.
- Move audit events, subscriptions, and analytics into database tables.
- Apply `db/schema.sql` or convert it into migrations in your preferred tool.
- Seed operators, site config, announcements, and initial matches before the first live rehearsal.

## Admin security

- Replace Basic Auth middleware with a real auth provider and role-based access control.
- Restrict admin access by IP or VPN during the tournament if possible.
- Add source validation and input sanitization before allowing operators to publish URLs.

## Operations

- Create an incident runbook for source takedown, backup activation, and domain failover.
- Track page availability via `/api/health`.
- Set alerts for origin failure, elevated 5xx rates, and admin login failures.
