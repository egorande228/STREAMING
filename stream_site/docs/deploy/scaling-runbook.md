# Scaling Runbook

## Before Match Peak

1. Warm `.m3u8` and `.ts` caches using the viewer load test.
2. Confirm `X-Cache-Status: HIT` on repeated segment requests.
3. Check `/metrics/ws` for abnormal dropped messages.
4. Verify `redis-cli GET ch:mirror-leader` returns exactly one backend instance.
5. Confirm RTMP publish is accepted only from internal or whitelisted networks.

## During Event

- Watch nginx active connections, cache-hit ratio, and origin bandwidth.
- If API latency rises first, scale backend replicas.
- If HLS origin bandwidth rises first, inspect cache bypasses and Cloudflare cache rules.
- If chat delivery drops, inspect `/metrics/ws` and Redis latency.

## Incident Playbook

1. Domain blocked: push fresh mirror list to Telegram and validate DoH TXT record.
2. Primary origin down: verify Cloudflare pool failover and promote the standby.
3. RTMP ingest rejected: verify `stream_keys` row and `/internal/rtmp/authorize` logs.
