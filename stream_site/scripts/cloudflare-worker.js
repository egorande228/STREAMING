/**
 * Cloudflare Worker — HLS stream edge proxy for WC26 live streaming site.
 *
 * Routes:
 *   OPTIONS *                     → CORS pre-flight (204)
 *   GET /proxy/stream?url=<enc>   → fetch m3u8, rewrite segment URLs through proxy
 *   GET /proxy/segment?url=<enc>  → proxy .ts segment (supports Range)
 *   *                             → pass-through to env.ORIGIN_URL
 *
 * Env vars (configure in wrangler.toml or Cloudflare dashboard):
 *   ORIGIN_URL              Backend origin, e.g. https://wc26.live
 *   ALLOWED_STREAM_DOMAINS  Comma-separated allowlist, e.g. cdn1.example.com,cdn2.example.com
 *                           If empty, any http/https URL is allowed.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
};

function corsResponse(status, body, extra = {}) {
  return new Response(body, {
    status,
    headers: { ...CORS_HEADERS, ...extra },
  });
}

function validateUpstreamUrl(rawUrl, allowedDomains) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'Invalid URL' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Only http/https URLs are allowed' };
  }
  if (allowedDomains && allowedDomains.length > 0) {
    const host = parsed.hostname.toLowerCase();
    const allowed = allowedDomains.some(
      (d) => host === d || host.endsWith(`.${d}`),
    );
    if (!allowed) {
      return { ok: false, reason: `Domain not in allowlist: ${host}` };
    }
  }
  return { ok: true, parsed };
}

/**
 * Rewrite relative URLs inside an m3u8 manifest so all segments
 * and sub-playlists also go through this proxy.
 */
function rewriteM3u8(text, proxyBase, manifestUrl) {
  const base = new URL(manifestUrl);
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      // Resolve relative URLs against the manifest location
      let segmentUrl;
      try {
        segmentUrl = new URL(trimmed, base).toString();
      } catch {
        return line;
      }
      const isM3u8 = trimmed.endsWith('.m3u8') || trimmed.includes('.m3u8?');
      const route = isM3u8 ? 'stream' : 'segment';
      return `${proxyBase}/proxy/${route}?url=${encodeURIComponent(segmentUrl)}`;
    })
    .join('\n');
}

async function handleStream(request, env) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');
  if (!rawUrl) return corsResponse(400, 'Missing ?url= parameter');

  const allowedDomains = env.ALLOWED_STREAM_DOMAINS
    ? env.ALLOWED_STREAM_DOMAINS.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean)
    : [];

  const { ok, parsed, reason } = validateUpstreamUrl(rawUrl, allowedDomains);
  if (!ok) return corsResponse(403, reason);

  let upstream;
  try {
    upstream = await fetch(parsed.toString(), { headers: { 'User-Agent': 'WC26-Proxy/1.0' } });
  } catch (err) {
    return corsResponse(502, `Upstream fetch failed: ${err.message}`);
  }

  if (!upstream.ok) {
    return corsResponse(upstream.status, `Upstream returned ${upstream.status}`);
  }

  const text = await upstream.text();
  const origin = new URL(request.url).origin;
  const rewritten = rewriteM3u8(text, origin, parsed.toString());

  return corsResponse(200, rewritten, {
    'Content-Type': 'application/vnd.apple.mpegurl',
    'Cache-Control': 'no-cache',
  });
}

async function handleSegment(request, env) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');
  if (!rawUrl) return corsResponse(400, 'Missing ?url= parameter');

  const allowedDomains = env.ALLOWED_STREAM_DOMAINS
    ? env.ALLOWED_STREAM_DOMAINS.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean)
    : [];

  const { ok, parsed, reason } = validateUpstreamUrl(rawUrl, allowedDomains);
  if (!ok) return corsResponse(403, reason);

  const upstreamHeaders = {};
  const range = request.headers.get('Range');
  if (range) upstreamHeaders['Range'] = range;

  let upstream;
  try {
    upstream = await fetch(parsed.toString(), {
      headers: { ...upstreamHeaders, 'User-Agent': 'WC26-Proxy/1.0' },
    });
  } catch (err) {
    return corsResponse(502, `Upstream fetch failed: ${err.message}`);
  }

  const responseHeaders = { ...CORS_HEADERS };
  for (const h of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']) {
    const v = upstream.headers.get(h);
    if (v) responseHeaders[h] = v;
  }
  if (!responseHeaders['Content-Type']) responseHeaders['Content-Type'] = 'video/mp2t';

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

async function handlePassthrough(request, env) {
  const origin = env.ORIGIN_URL ?? 'https://wc26.live';
  const url = new URL(request.url);
  const upstreamUrl = `${origin}${url.pathname}${url.search}`;

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  });

  const responseHeaders = new Headers(upstream.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    responseHeaders.set(k, v);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return corsResponse(204, null, { 'Content-Length': '0' });
    }

    if (pathname === '/proxy/stream') return handleStream(request, env);
    if (pathname === '/proxy/segment') return handleSegment(request, env);
    return handlePassthrough(request, env);
  },
};
