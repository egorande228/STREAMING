#!/usr/bin/env python3
import json
import os
import time
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

STATE = {"ts": time.time(), "rx": 0, "tx": 0, "rx_mbps": 0.0, "tx_mbps": 0.0}


def read_net_bytes():
    rx = 0
    tx = 0
    with open('/proc/net/dev', 'r', encoding='utf-8') as fh:
        for line in fh.readlines()[2:]:
            if ':' not in line:
                continue
            iface, rest = line.split(':', 1)
            iface = iface.strip()
            if iface == 'lo' or iface.startswith(('docker', 'veth', 'br-', 'tun')):
                continue
            parts = rest.split()
            if len(parts) >= 16:
                rx += int(parts[0])
                tx += int(parts[8])
    return rx, tx


def sample_network():
    now = time.time()
    rx, tx = read_net_bytes()
    prev_ts = STATE['ts']
    elapsed = max(0.001, now - prev_ts)
    if STATE['rx'] > 0 or STATE['tx'] > 0:
        STATE['rx_mbps'] = max(0.0, (rx - STATE['rx']) * 8 / elapsed / 1_000_000)
        STATE['tx_mbps'] = max(0.0, (tx - STATE['tx']) * 8 / elapsed / 1_000_000)
    STATE['ts'] = now
    STATE['rx'] = rx
    STATE['tx'] = tx


class Handler(BaseHTTPRequestHandler):
    server_version = "KingLiveEdgeAgent/1.1"

    def log_message(self, fmt, *args):
        return

    def do_GET(self):
        if self.path not in ("/edge-health", "/healthz"):
            self.send_response(404)
            self.end_headers()
            return
        sample_network()
        load1, load5, load15 = os.getloadavg()
        cpus = os.cpu_count() or 1
        payload = {
            "status": "ok",
            "ts": int(time.time()),
            "load1": round(load1, 3),
            "load5": round(load5, 3),
            "load15": round(load15, 3),
            "cpus": cpus,
            "load_ratio": round(load1 / cpus, 3),
            "rx_mbps": round(STATE['rx_mbps'], 3),
            "tx_mbps": round(STATE['tx_mbps'], 3),
        }
        body = json.dumps(payload, separators=(",", ":")).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

sample_network()
ThreadingHTTPServer(("127.0.0.1", 8091), Handler).serve_forever()
