# MediaMTX + nginx HLS cache

This is the setup tested on `ORIGIN_SERVER_IP` for OBS RTMP ingest and high-volume HLS playback.

## Current server flow

```text
OBS
  -> rtmp://ORIGIN_SERVER_IP:1935/live  stream key: test
  -> MediaMTX on port 1935 / origin HLS on 8888
  -> nginx cache on port 80
  -> viewers open http://ORIGIN_SERVER_IP/live/test/
```

MediaMTX remains the origin. nginx is the public viewer endpoint and caches HLS playlists and `.ts` segments.

## OBS settings used for the stable test

- Encoder: Apple VT H264 hardware encoder
- Resolution: 1280x720
- Bitrate: 3000 Kbps CBR
- Keyframe interval: 2 seconds
- Profile: main
- B-frames: disabled
- Audio: AAC

## MediaMTX container

```bash
docker run -d --name mediamtx --restart unless-stopped \
  -e MTX_HLSVARIANT=mpegts \
  -e MTX_HLSSEGMENTDURATION=2s \
  -e MTX_HLSSEGMENTCOUNT=6 \
  -p 1935:1935 \
  -p 8888:8888 \
  bluenviron/mediamtx:latest
```

## nginx cache container

Copy `docker/mediamtx-nginx-cache/nginx.conf` to the server, then run:

```bash
mkdir -p /root/nginx-hls-cache/cache
cp docker/mediamtx-nginx-cache/nginx.conf /root/nginx-hls-cache/nginx.conf

docker rm -f nginx-hls-cache 2>/dev/null || true
docker run -d --name nginx-hls-cache --restart unless-stopped --network host \
  -v /root/nginx-hls-cache/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v /root/nginx-hls-cache/cache:/var/cache/nginx/hls \
  nginx:alpine
```

Why the config matters: MediaMTX sets HLS cookies/cache headers. nginx must still pass cookies to viewers, but ignore origin cache headers for caching. A warmed segment should show `X-Cache: HIT`.

## Check stream and cache

```bash
curl -s -L -c /tmp/nginx.cookies -b /tmp/nginx.cookies http://127.0.0.1/live/test/index.m3u8
curl -s -L -c /tmp/nginx.cookies -b /tmp/nginx.cookies http://127.0.0.1/live/test/main_stream.m3u8 | tail -20

SEG=$(curl -s -L -c /tmp/nginx.cookies -b /tmp/nginx.cookies http://127.0.0.1/live/test/main_stream.m3u8 | awk '/\.ts/ {s=$0} END{print s}')
curl -s -D - -o /dev/null -L -c /tmp/nginx.cookies -b /tmp/nginx.cookies "http://127.0.0.1/live/test/$SEG" | grep -Ei 'HTTP|X-Cache'
curl -s -D - -o /dev/null -L -c /tmp/nginx.cookies -b /tmp/nginx.cookies "http://127.0.0.1/live/test/$SEG" | grep -Ei 'HTTP|X-Cache'
```

Expected result:

```text
HTTP/1.1 200 OK
X-Cache: MISS
HTTP/1.1 200 OK
X-Cache: HIT
```

## Load test

Run while OBS is actively publishing:

```bash
docker run --rm --network host \
  -v /root/hls-mediamtx-loadtest.k6.js:/hls-mediamtx-loadtest.k6.js:ro \
  grafana/k6:latest run /hls-mediamtx-loadtest.k6.js
```

Or locally with k6:

```bash
BASE=http://ORIGIN_SERVER_IP/live/test/index.m3u8 VUS=500 k6 run scripts/hls-mediamtx-loadtest.k6.js
```

## Load test notes

Earlier 720p cache tests showed that nginx in front of MediaMTX can absorb much more traffic than direct MediaMTX playback. The later live 1080p test on `ORIGIN_SERVER_IP` exposed the actual bottleneck: the server uplink behaved like a 1 Gbit connection, not 10 Gbit.

Live 1080p result on the old 1 Gbit server:

- 50 max VUs: 0.00% failed requests, `p95` HTTP duration 2.42s
- 200 max VUs: 0.34% failed requests, `p95` HTTP duration 6.42s
- 500 max VUs: 23.72% failed requests, `p95` HTTP duration 8.93s

The 500 VU run timed out on playlists and segments because the stream was about 3.3 Mbps at 1080p. At that bitrate, 500 real viewers require roughly 1.65 Gbps before overhead.

Direct MediaMTX without nginx cache was not stable enough at 500 viewers. It had high p95 latency and segment errors.

## Scaling note

At 3000 Kbps, 2000 real viewers need roughly 6 Gbps before overhead. A 10 Gbit server can be enough on paper, but origin-only delivery is risky. Keep nginx cache in front of MediaMTX, and use a CDN for public traffic if viewer count grows or users are geographically spread.
