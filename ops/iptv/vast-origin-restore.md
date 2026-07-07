# KingLive Vast Origin Restore

This is the safe fallback for replacing the temporary AWS/Vast HLS origin without using provider snapshots.

It intentionally does not contain secrets, donor IPTV URLs, SSH keys, or Cloudflare tokens.

## What It Installs

- FFmpeg from Ubuntu packages for the stable CPU pipeline.
- MediaMTX for RTMP ingest and HLS output.
- nginx for `/health` and `/live/*`.
- supervisor for process management in Vast containers without systemd.
- `kinglive-restream` and `restream-sync.mjs`.
- A systemctl compatibility wrapper for `restream-sync.mjs`.

## New Vast Instance Requirements

- Ubuntu 22.04 container.
- SSH enabled.
- Public mapped ports for container `80` or `8080`.
- Enough CPU for the expected number of transcodes.
- Do not require GPU/NVENC for the current stable setup.

## Deploy Steps

1. SSH into the new Vast instance as root.

2. Clone the repository or upload the repo folder.

3. Run:

```bash
cd /path/to/Sport-live-stream
bash ops/iptv/scripts/install-vast-origin.sh
```

4. Edit the env file on the server only:

```bash
nano /etc/kinglive/restream-sync.env
```

Set the real `RESTREAM_SYNC_TOKEN`. Do not commit it.

5. Restart sync:

```bash
supervisorctl restart kinglive_restream_sync
```

6. Check health:

```bash
curl -sS http://127.0.0.1:80/health
curl -sS http://127.0.0.1:8080/health
supervisorctl status
```

7. Point Cloudflare to the new origin:

- Update `vast-origin.livekinglive.win` to the new Vast public IP, if using DNS.
- If Vast changed the mapped container port, update the Worker upstream port too.
- Keep the route `https://cdn-hls.livekinglive.win/aws/live/<slug>/index.m3u8`.

## Admin Usage

In the KingLive admin, continue choosing `AWS US` for streams that should run on this extra origin. The label is historical; it can point to Vast through Cloudflare.

## Rollback

If the new origin fails:

1. Put the Cloudflare Worker/DNS upstream back to the previous working origin.
2. Stop the new Vast instance.
3. Keep the old working origin untouched until the replacement is verified.

## Notes

- Current stable pipeline uses CPU (`libx264`) for overlays and H.264 output.
- NVENC is not enabled by this restore script because some Vast hosts expose GPUs with drivers too old for the current RTX 50-series NVENC stack.
- Secrets stay in `/etc/kinglive/restream-sync.env`, not in Git.
