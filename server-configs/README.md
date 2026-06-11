# KingLive Server Recovery Backup

Snapshot date: 2026-06-11.

This folder stores the current live server code and service configs needed to
rebuild the KingLive origin and edge nodes quickly.

## Origin

Server: `ORIGIN_SERVER_IP`

Important paths:

- `var/www/livekinglive-player/` -> public player, `/main/`, `streams.json`
- `opt/kinglive-balancer/balancer.py` -> edge monitor, source admin, stream status
- `etc/systemd/system/kinglive-balancer.service` -> balancer systemd unit
- `root/caddy-hls/Caddyfile` -> Caddy routing for player and HLS

Restore example:

```sh
sudo rsync -a server-configs/origin/files/ /
sudo systemctl daemon-reload
sudo systemctl restart kinglive-balancer.service
cd /root/caddy-hls && sudo docker compose restart caddy
```

The private dashboard key file is intentionally not included.

## Edges

Servers:

- `EDGE_PRIMARY_A_IP`
- `EDGE_PRIMARY_B_IP`
- `EDGE_OVERFLOW_AWS_IP`

Important paths:

- `etc/nginx/conf.d/kinglive-hls-cache.conf` -> HLS cache reverse proxy
- `etc/nginx/nginx.conf` -> Nginx base config
- `opt/kinglive-edge-agent/edge_agent.py` -> `/edge-health`
- `etc/systemd/system/kinglive-edge-agent.service` -> edge agent systemd unit

Restore example:

```sh
sudo rsync -a server-configs/edge-primary-a/files/ /
sudo systemctl daemon-reload
sudo nginx -t
sudo systemctl restart nginx kinglive-edge-agent.service
```

Use the matching folder for each edge server.
