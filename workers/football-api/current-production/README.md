# Current production API snapshot

Read-only review snapshot captured on 2026-09-16. It is included so a
collaborator can inspect the current match-source, cache and match-details code
without receiving Cloudflare, IPTV or server credentials.

This directory is not referenced by `wrangler.toml` and is not a deploy target.
The active checked-in Worker entrypoint remains `../worker.js`. Production uses
bindings and secrets that are deliberately absent from this repository.

Files:

- `worker.mjs`: current bundled Worker source.
- `public-match-details.mjs`: UEFA, Premier League and LaLiga public-source adapters.
- `upstream-cache.mjs`: shared D1 lease and response cache.
- `match-registry.mjs`: stable match registry and stale-day fallback.
- `team-crests.mjs`: safe crest enrichment.
- `upstream-cache.sql`: D1 schema used by these modules.

Do not deploy this snapshot. Prepare cache/API changes as a separate reviewed
commit and include tests. Never add provider keys, stream URLs, Tunnel tokens,
backup files or live binding values.
