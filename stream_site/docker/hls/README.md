# HLS Restream Proxy (pcruz1905/hls-restream-proxy)

This project mounts `channels.conf` into the proxy container and exposes it:

- Internal: `http://hls_proxy:8089`
- Host: `http://localhost:8089`
- Through nginx: `http://localhost/hls/...`

## Endpoints

- `GET /hls/proxy?url=<encoded_m3u8_url>`
  - Direct passthrough + playlist rewriting.
  - Works with direct `.m3u8` URLs.

- `GET /hls/channel/<slug>`
  - Resolves channel from `channels.conf`.
  - Expects a source page that contains an iframe/embed page with an m3u8 URL.

## Quick test

```bash
curl -s "http://localhost/hls/proxy?url=https%3A%2F%2Ftest-streams.mux.dev%2Fx36xhzz%2Fx36xhzz.m3u8" | head
```

Expected: playlist output starting with `#EXTM3U`.

Smoke test for channel mode configured in `channels.conf`:

```bash
curl -s "http://localhost/hls/channel/demo" | head
```

Expected: playlist output starting with `#EXTM3U`.

## How to use in admin streams

Set stream URL to:

```text
http://localhost/hls/proxy?url=<encoded_upstream_m3u8>
```

Or, if you configured `channels.conf` with a real source page:

```text
http://localhost/hls/channel/<slug>
```
