# KingLive Vast orchestrator

This Worker adds an isolated control plane for a single disposable Vast HLS
origin. It does not replace the existing admin stream controls.

Required Worker secrets:

- `ADMIN_TOKEN`
- `VAST_API_KEY`
- `RESTREAM_SYNC_TOKEN`

The first release is manual by design:

1. `POST /api/admin/vast/plan` returns a safe offer and a five-minute plan token.
2. `POST /api/admin/vast/create` requires that token and the exact confirmation
   string `CREATE VAST INSTANCE`.
3. `GET /api/admin/vast/status` reports provisioning and bootstrap state.
4. `POST /api/admin/vast/activate` requires `ACTIVATE VAST ORIGIN`, verifies the
   direct health endpoint, then atomically updates `hls_origin:aws` in KV.
5. `POST /api/admin/vast/stop` pauses compute but leaves storage billing active.
6. `POST /api/admin/vast/destroy` requires `DESTROY VAST INSTANCE`, permanently
   deletes the instance, and removes the dynamic HLS origin only when it still
   points at that instance.

The bootstrap endpoint exchanges a one-time token for the restream sync secret.
The long-lived secret is never stored in Git, the Vast template, or KV.

Do not deploy until the HLS Worker change accepting validated public IPv4
origins has been deployed and verified independently.
