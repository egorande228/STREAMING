#!/usr/bin/env python3
import html
import http.client
import json
import threading
import urllib.request
import time
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

PRIMARY_TX_OVERLOAD_MBPS = 2500.0
DASHBOARD_KEY = Path('/opt/kinglive-balancer/dashboard.key').read_text().strip()
STREAMS_PATH = Path('/var/www/livekinglive-player/streams.json')
EDGES = [
    {"id": "vps", "role": "primary", "base": "http://EDGE_PRIMARY_A_IP", "health_host": "EDGE_PRIMARY_A_IP", "healthy": False, "overloaded": True, "tx_mbps": 999999.0, "rx_mbps": 999999.0, "load_ratio": 999.0, "load1": 999.0, "cpus": 1, "last_check": 0, "last_error": "not checked"},
    {"id": "vps2", "role": "primary", "base": "http://EDGE_PRIMARY_B_IP", "health_host": "EDGE_PRIMARY_B_IP", "healthy": False, "overloaded": True, "tx_mbps": 999999.0, "rx_mbps": 999999.0, "load_ratio": 999.0, "load1": 999.0, "cpus": 1, "last_check": 0, "last_error": "not checked"},
    {"id": "aws", "role": "overflow", "base": "http://EDGE_OVERFLOW_AWS_IP", "health_host": "EDGE_OVERFLOW_AWS_IP", "healthy": False, "overloaded": True, "tx_mbps": 999999.0, "rx_mbps": 999999.0, "load_ratio": 999.0, "load1": 999.0, "cpus": 1, "last_check": 0, "last_error": "not checked"},
]
LOCK = threading.Lock()
RR = {"primary": 0, "overflow": 0}


def load_streams_config():
    try:
        data = json.loads(STREAMS_PATH.read_text())
    except FileNotFoundError:
        data = {}
    if not isinstance(data, dict):
        data = {}
    if not isinstance(data.get("server-live"), list):
        data["server-live"] = []
    return data


def save_streams_config(data):
    tmp = STREAMS_PATH.with_suffix('.json.tmp')
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    tmp.replace(STREAMS_PATH)


def current_arabic_url():
    data = load_streams_config()
    for stream in data.get("server-live", []):
        if stream.get("id") == "ara":
            return str(stream.get("url") or "")
    return ""


def set_arabic_iframe(url):
    data = load_streams_config()
    streams = [stream for stream in data.get("server-live", []) if stream.get("id") != "ara"]
    if url:
        streams.append({
            "id": "ara",
            "url": url,
            "source_type": "iframe",
            "label": "Arabic",
            "title": "KingLive Arabic Broadcast",
            "language_code": "ar",
            "region": "global",
            "priority": 90,
            "is_active": True,
        })
    data["server-live"] = streams
    save_streams_config(data)
    return current_arabic_url()


def source_admin_html():
    current = html.escape(current_arabic_url(), quote=True)
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>KingLive Source Admin</title>
<style>
:root {{ color-scheme: dark; --bg:#090d12; --panel:#111923; --line:#263446; --text:#eef4fb; --muted:#8da0b7; --accent:#ffd31a; --ok:#35d07f; --bad:#ff5c70; }}
* {{ box-sizing:border-box; }} body {{ margin:0; min-height:100vh; background:var(--bg); color:var(--text); font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; }}
main {{ max-width:760px; margin:0 auto; padding:32px 18px; }}
h1 {{ margin:0 0 8px; font-size:28px; letter-spacing:0; }} p {{ color:var(--muted); margin:0 0 22px; line-height:1.5; }}
.panel {{ background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:18px; }}
label {{ display:block; color:var(--muted); font-size:13px; text-transform:uppercase; margin-bottom:8px; }}
textarea {{ width:100%; min-height:116px; resize:vertical; border:1px solid var(--line); border-radius:8px; background:#070b10; color:var(--text); padding:12px; font:15px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace; outline:none; }}
textarea:focus {{ border-color:var(--accent); }}
.actions {{ display:flex; gap:10px; flex-wrap:wrap; margin-top:14px; }}
button {{ border:0; border-radius:8px; padding:11px 15px; font-weight:800; cursor:pointer; }}
.save {{ background:var(--accent); color:#050505; }} .disable {{ background:#202a36; color:var(--text); border:1px solid var(--line); }}
.status {{ margin-top:14px; min-height:22px; color:var(--muted); }} .status.ok {{ color:var(--ok); }} .status.bad {{ color:var(--bad); }}
.links {{ margin-top:18px; display:flex; gap:12px; flex-wrap:wrap; }} a {{ color:var(--accent); text-decoration:none; }}
</style>
</head>
<body><main>
<h1>Arabic iframe source</h1>
<p>Paste the current Arabic iframe URL here. It will appear on the main language picker immediately. Empty value disables Arabic.</p>
<section class="panel">
<label for="url">Iframe URL</label>
<textarea id="url" placeholder="https://...">{current}</textarea>
<div class="actions"><button class="save" id="save">Save Arabic</button><button class="disable" id="disable">Disable Arabic</button></div>
<div class="status" id="status"></div>
</section>
<div class="links"><a href="https://livekinglive.win/main/">Open main picker</a><a href="/lb/dashboard?key={DASHBOARD_KEY}">Open monitor</a></div>
</main>
<script>
const key = new URLSearchParams(location.search).get('key') || '{DASHBOARD_KEY}';
const url = document.getElementById('url');
const statusEl = document.getElementById('status');
async function save(value) {{
  statusEl.className = 'status';
  statusEl.textContent = 'Saving...';
  const res = await fetch(`/lb/source-admin?key=${{encodeURIComponent(key)}}`, {{
    method: 'POST',
    headers: {{ 'Content-Type': 'application/json' }},
    body: JSON.stringify({{ arabic_iframe_url: value.trim() }})
  }});
  const data = await res.json().catch(() => ({{ error: 'bad response' }}));
  if (!res.ok) throw new Error(data.error || 'save failed');
  url.value = data.arabic_iframe_url || '';
  statusEl.className = 'status ok';
  statusEl.textContent = url.value ? 'Arabic source saved.' : 'Arabic source disabled.';
}}
document.getElementById('save').addEventListener('click', () => save(url.value).catch(err => {{ statusEl.className='status bad'; statusEl.textContent=err.message; }}));
document.getElementById('disable').addEventListener('click', () => {{ url.value=''; save('').catch(err => {{ statusEl.className='status bad'; statusEl.textContent=err.message; }}); }});
</script></body></html>'''


def http_get_json(host, path):
    conn = http.client.HTTPConnection(host, 80, timeout=2)
    conn.request("GET", path)
    resp = conn.getresponse()
    body = resp.read(4096)
    conn.close()
    if resp.status != 200:
        raise RuntimeError(f"bad status {resp.status}")
    return json.loads(body.decode())


def check_edge(edge):
    data = http_get_json(edge["health_host"], "/edge-health")
    if data.get("status") != "ok":
        raise RuntimeError("bad health payload")
    tx_mbps = float(data.get("tx_mbps", 999999.0))
    rx_mbps = float(data.get("rx_mbps", 999999.0))
    load_ratio = float(data.get("load_ratio", 999.0))
    return {
        "healthy": True,
        "overloaded": tx_mbps >= PRIMARY_TX_OVERLOAD_MBPS,
        "tx_mbps": tx_mbps,
        "rx_mbps": rx_mbps,
        "load_ratio": load_ratio,
        "load1": float(data.get("load1", 999.0)),
        "cpus": int(data.get("cpus", 1) or 1),
        "last_error": "ok",
    }


def health_loop():
    while True:
        for edge in EDGES:
            try:
                state = check_edge(edge)
            except Exception as exc:
                state = {
                    "healthy": False,
                    "overloaded": True,
                    "tx_mbps": 999999.0,
                    "rx_mbps": 999999.0,
                    "load_ratio": 999.0,
                    "load1": 999.0,
                    "cpus": edge.get("cpus", 1),
                    "last_error": str(exc),
                }
            with LOCK:
                edge.update(state)
                edge["last_check"] = int(time.time())
        time.sleep(5)


def choose_from(candidates, role):
    idx = RR[role] % len(candidates)
    RR[role] += 1
    return candidates[idx]


def least_loaded(candidates):
    return sorted(candidates, key=lambda e: e.get("tx_mbps", 999999.0))[0]


def pick_edge(forced=None):
    with LOCK:
        healthy = [edge for edge in EDGES if edge["healthy"]]
        if forced:
            for edge in healthy:
                if edge["id"] == forced:
                    return dict(edge)
            return None

        primary_ok = [edge for edge in healthy if edge["role"] == "primary" and not edge["overloaded"]]
        if primary_ok:
            return dict(choose_from(primary_ok, "primary"))

        overflow_ok = [edge for edge in healthy if edge["role"] == "overflow" and not edge["overloaded"]]
        if overflow_ok:
            return dict(choose_from(overflow_ok, "overflow"))

        if healthy:
            return dict(least_loaded(healthy))
        return None


def check_stream_live(stream):
    source_type = str(stream.get("source_type") or stream.get("sourceType") or "hls").lower()
    url = str(stream.get("url") or "")
    if not url or stream.get("is_active") is False or stream.get("isActive") is False:
        return False
    if source_type == "iframe":
        return True
    if source_type != "hls":
        return True
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "KingLiveStatus/1.0", "Cache-Control": "no-cache"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            body = resp.read(65536).decode("utf-8", "ignore")
        return "#EXTM3U" in body
    except Exception:
        return False


def stream_status_payload():
    data = load_streams_config()
    result = {}
    for match_id, configured in data.items():
        streams = configured if isinstance(configured, list) else [configured]
        result[match_id] = []
        for stream in streams:
            if not isinstance(stream, dict):
                continue
            source_type = str(stream.get("source_type") or stream.get("sourceType") or "hls")
            result[match_id].append({
                "id": stream.get("id") or "",
                "language_code": stream.get("language_code") or stream.get("languageCode") or "",
                "source_type": source_type,
                "is_live": check_stream_live(stream),
            })
    return {"matches": result, "generated_at": int(time.time())}


def edges_payload():
    with LOCK:
        keys = ("id", "role", "base", "healthy", "overloaded", "tx_mbps", "rx_mbps", "load_ratio", "load1", "cpus", "last_check", "last_error")
        payload = [{k: edge[k] for k in keys} for edge in EDGES]
    return {"primary_tx_overload_mbps": PRIMARY_TX_OVERLOAD_MBPS, "edges": payload, "generated_at": int(time.time())}


def dashboard_html():
    return f"""<!doctype html>
<html lang=\"en\">
<head>
<meta charset=\"utf-8\" />
<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
<title>KingLive Edge Monitor</title>
<style>
:root {{ color-scheme: dark; --bg:#0b0f14; --panel:#121923; --panel2:#172130; --text:#eef4fb; --muted:#8ea0b5; --line:#263447; --ok:#35d07f; --warn:#ffd166; --bad:#ff5c70; --blue:#5ab0ff; }}
* {{ box-sizing:border-box; }} body {{ margin:0; font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; background:var(--bg); color:var(--text); }}
main {{ max-width:1120px; margin:0 auto; padding:28px 18px 44px; }}
header {{ display:flex; gap:16px; justify-content:space-between; align-items:flex-end; margin-bottom:22px; }}
h1 {{ margin:0; font-size:28px; letter-spacing:0; }} .sub {{ color:var(--muted); margin-top:6px; }}
.badge {{ display:inline-flex; align-items:center; gap:8px; border:1px solid var(--line); background:var(--panel); padding:8px 11px; border-radius:8px; color:var(--muted); font-size:13px; }}
.dot {{ width:9px; height:9px; border-radius:99px; background:var(--ok); box-shadow:0 0 16px var(--ok); }}
.grid {{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-bottom:14px; }}
.metric {{ background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:14px; }}
.label {{ color:var(--muted); font-size:12px; text-transform:uppercase; }} .value {{ font-size:25px; font-weight:750; margin-top:7px; }}
.cards {{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }}
.card {{ background:linear-gradient(180deg,var(--panel),#0f151e); border:1px solid var(--line); border-radius:8px; padding:16px; }}
.card.top {{ border-color:#35516e; }} .row {{ display:flex; justify-content:space-between; gap:10px; align-items:center; }}
.name {{ font-size:21px; font-weight:760; }} .role {{ color:var(--muted); font-size:13px; }}
.pill {{ border:1px solid var(--line); padding:5px 8px; border-radius:999px; font-size:12px; color:var(--muted); }} .pill.ok {{ color:var(--ok); border-color:#285f43; }} .pill.bad {{ color:var(--bad); border-color:#6d2a36; }} .pill.warn {{ color:var(--warn); border-color:#715d25; }}
.bars {{ margin-top:16px; display:grid; gap:12px; }} .bar-label {{ display:flex; justify-content:space-between; color:var(--muted); font-size:13px; margin-bottom:7px; }}
.track {{ height:10px; background:#0a1017; border:1px solid #1f2a39; border-radius:999px; overflow:hidden; }} .fill {{ height:100%; width:0%; background:linear-gradient(90deg,var(--blue),var(--ok)); transition:width .35s; }} .fill.warn {{ background:linear-gradient(90deg,var(--warn),var(--bad)); }}
.detail {{ margin-top:14px; color:var(--muted); font-size:13px; display:grid; gap:7px; }} .detail span {{ color:var(--text); }}
footer {{ margin-top:16px; color:var(--muted); font-size:12px; }}
@media (max-width:850px) {{ header {{ align-items:flex-start; flex-direction:column; }} .grid {{ grid-template-columns:repeat(2,minmax(0,1fr)); }} .cards {{ grid-template-columns:1fr; }} }}
</style>
</head>
<body><main>
<header><div><h1>KingLive Edge Monitor</h1><div class=\"sub\">Network load, health and overflow state</div></div><div class=\"badge\"><span class=\"dot\"></span><span id=\"updated\">loading</span></div></header>
<section class=\"grid\">
<div class=\"metric\"><div class=\"label\">Total TX</div><div class=\"value\" id=\"totalTx\">-</div></div>
<div class=\"metric\"><div class=\"label\">Total RX</div><div class=\"value\" id=\"totalRx\">-</div></div>
<div class=\"metric\"><div class=\"label\">Healthy Edges</div><div class=\"value\" id=\"healthy\">-</div></div>
<div class=\"metric\"><div class=\"label\">Overflow Limit</div><div class=\"value\" id=\"limit\">-</div></div>
</section>
<section class=\"cards\" id=\"cards\"></section>
<footer>Auto-refresh every 3 seconds. Hidden by secret key.</footer>
</main>
<script>
const key = new URLSearchParams(location.search).get('key') || '{DASHBOARD_KEY}';
const fmt = (n) => Number(n || 0).toLocaleString(undefined, {{ maximumFractionDigits: 1 }});
function cls(edge) {{ if (!edge.healthy) return 'bad'; if (edge.overloaded) return 'warn'; return 'ok'; }}
function age(ts) {{ return Math.max(0, Math.round(Date.now()/1000 - Number(ts || 0))); }}
async function load() {{
  const res = await fetch(`/lb/edges?key=${{encodeURIComponent(key)}}`, {{ cache:'no-store' }});
  if (!res.ok) throw new Error('dashboard access denied');
  const data = await res.json();
  const edges = data.edges || [];
  const totalTx = edges.reduce((s,e)=>s+Number(e.tx_mbps||0),0);
  const totalRx = edges.reduce((s,e)=>s+Number(e.rx_mbps||0),0);
  document.getElementById('totalTx').textContent = `${{fmt(totalTx)}} Mbps`;
  document.getElementById('totalRx').textContent = `${{fmt(totalRx)}} Mbps`;
  document.getElementById('healthy').textContent = `${{edges.filter(e=>e.healthy).length}} / ${{edges.length}}`;
  document.getElementById('limit').textContent = `${{fmt(data.primary_tx_overload_mbps)}} Mbps`;
  document.getElementById('updated').textContent = `updated ${{new Date().toLocaleTimeString()}}`;
  const cards = document.getElementById('cards');
  cards.innerHTML = edges.map(e => {{
    const pct = Math.min(100, Number(e.tx_mbps || 0) / Number(data.primary_tx_overload_mbps || 1) * 100);
    const state = cls(e);
    return `<article class=\"card ${{e.role === 'primary' ? 'top' : ''}}\">
      <div class=\"row\"><div><div class=\"name\">${{e.id}}</div><div class=\"role\">${{e.role}} · ${{e.base.replace('http://','')}}</div></div><span class=\"pill ${{state}}\">${{!e.healthy ? 'down' : e.overloaded ? 'overloaded' : 'healthy'}}</span></div>
      <div class=\"bars\"><div><div class=\"bar-label\"><span>Outgoing TX</span><strong>${{fmt(e.tx_mbps)}} Mbps</strong></div><div class=\"track\"><div class=\"fill ${{pct > 75 ? 'warn' : ''}}\" style=\"width:${{pct}}%\"></div></div></div>
      <div><div class=\"bar-label\"><span>Incoming RX</span><strong>${{fmt(e.rx_mbps)}} Mbps</strong></div><div class=\"track\"><div class=\"fill\" style=\"width:${{Math.min(100, Number(e.rx_mbps || 0) / Number(data.primary_tx_overload_mbps || 1) * 100)}}%\"></div></div></div></div>
      <div class=\"detail\"><div>CPU load: <span>${{fmt(Number(e.load_ratio || 0) * 100)}}%</span></div><div>Last check: <span>${{age(e.last_check)}}s ago</span></div><div>Error: <span>${{e.last_error || 'ok'}}</span></div></div>
    </article>`;
  }}).join('');
}}
load().catch(err => document.body.innerHTML = '<main><h1>Access denied</h1><p>' + err.message + '</p></main>');
setInterval(() => load().catch(()=>{{}}), 3000);
</script></body></html>"""


class Handler(BaseHTTPRequestHandler):
    server_version = "KingLiveBalancer/1.3"

    def log_message(self, fmt, *args):
        return

    def authorized(self, parsed):
        return parse_qs(parsed.query).get("key", [""])[0] == DASHBOARD_KEY

    def not_found(self):
        self.send_response(404)
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Range, Origin, Accept, Content-Type")
        self.end_headers()

    def do_HEAD(self):
        self.handle_request(head=True)

    def do_GET(self):
        self.handle_request(head=False)

    def do_POST(self):
        self.handle_request(head=False)

    def handle_request(self, head=False):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self.send_json({"status": "ok"}, head=head)
            return
        if parsed.path in ("/dashboard", "/"):
            if not self.authorized(parsed):
                self.not_found()
                return
            self.send_html(dashboard_html(), head=head)
            return
        if parsed.path == "/stream-status":
            self.send_json(stream_status_payload(), head=head)
            return
        if parsed.path == "/edges":
            if not self.authorized(parsed):
                self.not_found()
                return
            self.send_json(edges_payload(), head=head)
            return
        if parsed.path == "/source-admin":
            if not self.authorized(parsed):
                self.not_found()
                return
            if self.command == "POST":
                try:
                    length = int(self.headers.get("Content-Length", "0") or "0")
                    body = self.rfile.read(min(length, 65536))
                    payload = json.loads(body.decode() or "{}")
                    url = str(payload.get("arabic_iframe_url") or "").strip()
                    if url and not (url.startswith("http://") or url.startswith("https://")):
                        self.send_json({"error": "URL must start with http:// or https://"}, status=400, head=head)
                        return
                    saved = set_arabic_iframe(url)
                    self.send_json({"status": "ok", "arabic_iframe_url": saved}, head=head)
                except Exception as exc:
                    self.send_json({"error": str(exc)}, status=500, head=head)
                return
            self.send_html(source_admin_html(), head=head)
            return
        if not parsed.path.startswith("/live/"):
            self.not_found()
            return

        forced = parse_qs(parsed.query).get("edge", [None])[0]
        edge = pick_edge(forced)
        if not edge:
            self.send_response(503)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            if not head:
                self.wfile.write(b"no healthy edge\n")
            return

        query = ""
        if parsed.query:
            kept = "&".join(part for part in parsed.query.split("&") if not part.startswith("edge="))
            if kept:
                query = "?" + kept
        target = edge["base"] + parsed.path + query
        self.send_response(302)
        self.send_header("Location", target)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Balancer", "origin-ORIGIN_SERVER_IP")
        self.send_header("X-Selected-Edge", edge["id"])
        self.send_header("X-Selected-Role", edge["role"])
        self.send_header("X-Selected-Tx-Mbps", str(edge["tx_mbps"]))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

    def send_html(self, html, head=False):
        body = html.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Robots-Tag", "noindex, nofollow")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if not head:
            self.wfile.write(body)

    def send_json(self, payload, head=False, status=200):
        body = json.dumps(payload, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Robots-Tag", "noindex, nofollow")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if not head:
            self.wfile.write(body)


if __name__ == "__main__":
    threading.Thread(target=health_loop, daemon=True).start()
    ThreadingHTTPServer(("127.0.0.1", 8090), Handler).serve_forever()
