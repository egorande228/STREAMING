# KingLive old stream server backup

Old server: `ORIGIN_SERVER_IP`
Backup date: `2026-06-05`

Archive:

```text
kinglive-old-server-backup-20260605.tgz
```

The archive contains:

- `migration-backup/inventory.txt` - server inventory
- `migration-backup/docker-inspect.json` - Docker container configuration
- `migration-backup/nginx.conf` - nginx HLS cache configuration
- `migration-backup/restore-on-new-server.sh` - restore script for a fresh server
- `migration-backup/*.log` - recent container logs
- `root/hls-*.js` - k6/HLS load test scripts

The live HLS cache directory contents are intentionally excluded because they are temporary stream segments.

Restore outline on the new server:

```bash
scp kinglive-old-server-backup-20260605.tgz root@NEW_SERVER_IP:/root/
ssh root@NEW_SERVER_IP
tar -xzf /root/kinglive-old-server-backup-20260605.tgz -C /
/root/migration-backup/restore-on-new-server.sh
```

OBS settings after restore:

```text
Server: rtmp://NEW_SERVER_IP/live
Stream key: test
HLS check: http://NEW_SERVER_IP/live/test/index.m3u8
```
