# Load Test Runbook

## Prerequisites

- Install `k6`.
- Start the stack with a valid demo HLS playlist and at least one match row.

## Commands

```bash
make loadtest-viewers TARGET=http://localhost VUS=1000 DURATION=5m STREAM_KEY=demo
make loadtest-chat TARGET=http://localhost VUS=1000 DURATION=10m MATCH_ID=1
make loadtest-mixed TARGET=http://localhost VUS=2000 DURATION=10m MATCH_ID=1 STREAM_KEY=demo
```

## What to Watch

- API latency: `p95 < 1s` for viewer and mixed tests.
- Error rate: viewer flow `< 2%`.
- WebSocket delivery: chat checks `> 99.9%`.
- Nginx cache: confirm `X-Cache-Status: HIT` on warmed `.ts` requests.
- Postgres and Redis: verify pools do not saturate under sustained load.

## Staging Pattern

1. Warm the HLS cache with a small viewer run.
2. Run viewer baseline.
3. Run chat baseline.
4. Run mixed scenario.
5. Save k6 output and compare against previous commit before promoting.
