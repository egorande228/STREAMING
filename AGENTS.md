# UI/news handoff boundaries

Read HANDOFF-UI-NEWS.md before editing or deploying.
For design/news work, limit changes to presentation in sites/main.
Do not alter match/stream IDs, source selection, player URLs/query propagation,
HLS cookies, API configuration, advertising, analytics or admin behavior.
Do not change or deploy workers, sites/player, ops, Cloudflare data, Tunnel,
DNS, Vast or scheduled jobs. Do not run historical operations scripts.
Production deploy needs owner approval of the exact commit and a full artifact
comparison against the current production deployment. Preview first.
Never commit playlists, credentials, backup ciphertext or operational receipts.
