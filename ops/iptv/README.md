# KingLive IPTV Restream

This setup keeps IPTV donor URLs away from browsers.

Runtime flow:

```text
Sharavoz HLS -> FFmpeg -> RTMP localhost -> MediaMTX -> HLS localhost:8888 -> Caddy/edge cache -> https://hls.livekinglive.win/live/<slug>/index.m3u8 -> player-dev Video.js
```

Do not put Sharavoz URLs or tokens in Git. Keep them only on the origin VPS in:

```text
/etc/kinglive/iptv/channels/<slug>.env
```

The current origin VPS also has the legacy path `/etc/kinglive/restreams/<slug>.env`.
The launcher supports both paths so existing channel env files can keep working.

## Files

- `systemd/kinglive-restream@.service` - one FFmpeg restream process per channel.
- `scripts/kinglive-restream` - FFmpeg launcher with VLC user-agent and reconnect flags.
- `scripts/kinglive-iptv-health` - checks public HLS manifests and segments.
- `scripts/kinglive-restream-watchdog` - checks active restreams and restarts only stuck channels.
- `mediamtx/mediamtx.yml` - MediaMTX RTMP ingest + local HLS muxing config.
- `nginx/hls-live-location.conf` - Nginx `/live/` proxy to local MediaMTX HLS.
- `examples/channel.env.example` - channel env file template.

## Channel Limit

Sharavoz account/session limits are the real constraint. Start with one channel only.
If one channel works alone but two fail, use separate donor accounts/tokens or keep only one active restream.
The launcher refuses to start more than `MAX_RESTREAMS=3` simultaneous FFmpeg restreams by default.
Manual overrides are capped at `MAX_RESTREAMS=4`.
For multiple simultaneous IPTV restreams, prefer `h264_720p25` on unstable or heavy donor channels.

## Install On Origin VPS

Copy files to the server:

```bash
sudo install -m 0755 ops/iptv/scripts/kinglive-restream /usr/local/bin/kinglive-restream
sudo install -m 0755 ops/iptv/scripts/kinglive-iptv-health /usr/local/bin/kinglive-iptv-health
sudo install -m 0755 ops/iptv/scripts/kinglive-restream-watchdog /usr/local/bin/kinglive-restream-watchdog
sudo install -m 0644 ops/iptv/systemd/kinglive-restream@.service /etc/systemd/system/kinglive-restream@.service
sudo install -m 0644 ops/iptv/systemd/kinglive-restream-watchdog.service /etc/systemd/system/kinglive-restream-watchdog.service
sudo install -m 0644 ops/iptv/systemd/kinglive-restream-watchdog.timer /etc/systemd/system/kinglive-restream-watchdog.timer
sudo install -m 0644 ops/iptv/mediamtx/mediamtx.yml /opt/mediamtx/mediamtx.yml
sudo mkdir -p /etc/kinglive/iptv/channels
sudo systemctl daemon-reload
```

Add one channel:

```bash
sudo install -m 0600 ops/iptv/examples/channel.env.example /etc/kinglive/iptv/channels/fox-sport-1-hd.env
sudo nano /etc/kinglive/iptv/channels/fox-sport-1-hd.env
```

Start one channel:

```bash
sudo systemctl restart mediamtx
sudo systemctl start kinglive-restream@fox-sport-1-hd
sudo systemctl status kinglive-restream@fox-sport-1-hd --no-pager
```

Check:

```bash
curl -I http://127.0.0.1:8888/live/fox-sport-1-hd/index.m3u8
curl -I https://hls.livekinglive.win/live/fox-sport-1-hd/index.m3u8
kinglive-iptv-health fox-sport-1-hd
```

## Manual And Automatic Restarts

The admin API supports a per-stream restart request:

```text
POST /api/admin/streams/<id>/restart
```

The admin page shows a **Restart** button for active Video.js IPTV restreams.
It does not restart all channels. It only updates `restart_requested_at`; the origin
sync process then restarts the matching `kinglive-restream@<slug>.service`.

For automatic recovery on the origin VPS, enable the watchdog timer:

```bash
sudo systemctl enable --now kinglive-restream-watchdog.timer
sudo systemctl status kinglive-restream-watchdog.timer --no-pager
```

The watchdog checks every active `kinglive-restream@*.service` through the public HLS URL.
It first verifies the manifest and media segment, then samples frames to catch the
"one frozen frame while timer still moves" failure mode. If a channel is unhealthy,
it restarts only that channel and applies a cooldown before another restart.

Useful knobs:

```bash
KINGLIVE_WATCHDOG_SAMPLE_SECONDS=8
KINGLIVE_WATCHDOG_MIN_UNIQUE_FRAMES=2
KINGLIVE_WATCHDOG_COOLDOWN_SECONDS=180
KINGLIVE_WATCHDOG_FRAME_CHECK=true
```

## Admin Stream Settings

For a restreamed IPTV channel use:

```text
URL: https://hls.livekinglive.win/live/<slug>/index.m3u8
Source type: videojs
Transcode profile: auto
```

Use `h264_720p25` when a donor channel is unstable, HEVC-heavy, or too large for smooth playback.
