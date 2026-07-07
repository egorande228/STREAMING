const UPSTREAM_ORIGIN = 'https://hls.livekinglive.win';
const AWS_UPSTREAM_ORIGIN = 'http://vast-origin.livekinglive.win:46204';
const API_ADMIN_CHECK_URL = 'https://kinglive-football-api.figurator228.workers.dev/api/admin/monitoring';
const SEGMENT_RE = /\.(ts|m4s|mp4|aac)$/i;
const HLS_REFERRER_KV_PREFIX = 'hls_referrer:';
const HLS_REFERRER_TTL_SECONDS = 7 * 24 * 60 * 60;
const MANIFEST_LOG_TTL_MS = 60 * 1000;
const manifestLogSeen = new Map();

export default {
  fetch(request, env, ctx) {
    return handleRequest(
      {
        request,
        waitUntil: ctx?.waitUntil ? ctx.waitUntil.bind(ctx) : () => {},
      },
      env,
    );
  },
};

async function handleRequest(event, env = {}) {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return withCors(new Response(null, { status: 204 }), 'BYPASS');
  }

  if (url.pathname === '/__admin/hls-referrers') {
    return routeAdminHlsReferrers(request, env);
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return withCors(new Response('Method Not Allowed', { status: 405 }), 'BYPASS');
  }

  const upstream = resolveUpstream(url);
  const upstreamUrl = new URL(upstream.pathname + url.search, upstream.origin);
  const isSegment = SEGMENT_RE.test(url.pathname);
  const isManifest = url.pathname.toLowerCase().endsWith('.m3u8');

  if (isManifest) {
    event.waitUntil(logManifestRequest(request, url, env));
  }

  if (request.method === 'GET' && isSegment) {
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    const cached = await cache.match(cacheKey);

    if (cached) {
      return withCors(cached, 'HIT');
    }

    const upstreamResponse = await fetchUpstream(request, upstreamUrl, true);
    const response = withCors(upstreamResponse, 'MISS');

    if (response.ok) {
      event.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  }

  const upstreamResponse = await fetchUpstream(request, upstreamUrl, false);
  const response = withCors(upstreamResponse, 'BYPASS');

  if (isManifest) {
    response.headers.set('Cache-Control', 'no-store');
  }

  return response;
}

async function routeAdminHlsReferrers(request, env = {}) {
  if (request.method !== 'GET') {
    return withCors(jsonResponse({ error: 'method_not_allowed' }, 405), 'BYPASS');
  }

  const authorized = await isAuthorizedAdminRequest(request);
  if (!authorized) {
    return withCors(jsonResponse({ error: 'unauthorized' }, 401), 'BYPASS');
  }

  const kv = getHlsLogKv(env);
  if (!kv?.list || !kv?.get) {
    return withCors(jsonResponse({ error: 'hls_referrer_kv_not_configured' }, 503), 'BYPASS');
  }

  const keys = await listKvKeys(kv, HLS_REFERRER_KV_PREFIX);
  const records = await Promise.all(
    keys.slice(0, 300).map(async (key) => {
      try {
        const raw = await kv.get(key);
        const record = raw ? JSON.parse(raw) : null;
        if (!record || typeof record !== 'object') return null;
        return normalizeHlsReferrerRecord(record);
      } catch (_) {
        return null;
      }
    }),
  );
  const referrers = records
    .filter(Boolean)
    .sort((left, right) => {
      const byTime = Number(right.last_seen_at_ms || 0) - Number(left.last_seen_at_ms || 0);
      return byTime || Number(right.count || 0) - Number(left.count || 0);
    })
    .slice(0, 100);

  return withCors(
    jsonResponse({ generated_at: new Date().toISOString(), total: referrers.length, referrers }, 200),
    'BYPASS',
  );
}

async function isAuthorizedAdminRequest(request) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization) return false;

  try {
    const response = await fetch(API_ADMIN_CHECK_URL, {
      method: 'GET',
      headers: { Authorization: authorization },
      cf: { cacheEverything: false, cacheTtl: 0 },
    });
    return response.ok;
  } catch (_) {
    return false;
  }
}

async function listKvKeys(kv, prefix) {
  const keys = [];
  let cursor;
  do {
    const page = await kv.list({ prefix, cursor });
    keys.push(...(Array.isArray(page?.keys) ? page.keys.map((item) => item.name).filter(Boolean) : []));
    cursor = page?.cursor;
    if (page?.list_complete !== false) break;
  } while (cursor);
  return keys;
}

function normalizeHlsReferrerRecord(record = {}) {
  return {
    source: String(record.source || 'direct').slice(0, 180),
    referer_host: String(record.refererHost || '').slice(0, 180),
    origin_host: String(record.originHost || '').slice(0, 180),
    country: String(record.country || 'XX').slice(0, 8),
    path: String(record.path || '').slice(0, 300),
    user_agent: String(record.userAgent || '').slice(0, 160),
    count: Number(record.count || 0),
    first_seen_at: String(record.firstSeenAt || ''),
    last_seen_at: String(record.lastSeenAt || ''),
    first_seen_at_ms: Number(record.firstSeenAtMs || 0),
    last_seen_at_ms: Number(record.lastSeenAtMs || 0),
  };
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function getHlsLogKv(env = {}) {
  if (env.HLS_LOG_KV) return env.HLS_LOG_KV;
  if (env.STREAM_CONFIG_KV) return env.STREAM_CONFIG_KV;

  try {
    if (typeof HLS_LOG_KV !== 'undefined') return HLS_LOG_KV;
  } catch (_) {}

  try {
    if (typeof STREAM_CONFIG_KV !== 'undefined') return STREAM_CONFIG_KV;
  } catch (_) {}

  return null;
}

async function logManifestRequest(request, url, env = {}) {
  const headers = request.headers;
  const refererHost = getHeaderHost(headers.get('referer'));
  const originHost = getHeaderHost(headers.get('origin'));
  const source = refererHost || originHost || 'direct';
  const country = headers.get('cf-ipcountry') || 'XX';
  const key = `${source}|${country}|${url.pathname}`;
  const now = Date.now();
  const lastSeenAt = manifestLogSeen.get(key) || 0;

  if (now - lastSeenAt < MANIFEST_LOG_TTL_MS) return;

  manifestLogSeen.set(key, now);
  pruneManifestLogSeen(now);

  const entry = {
    event: 'hls_manifest_request',
    source,
    refererHost,
    originHost,
    country,
    path: url.pathname,
    userAgent: compactUserAgent(headers.get('user-agent')),
  };

  console.log(JSON.stringify(entry));
  await writeManifestReferrerSnapshot(entry, now, env);
}

function getHeaderHost(value) {
  if (!value) return '';
  try {
    return new URL(value).hostname.toLowerCase();
  } catch (_) {
    return '';
  }
}

function compactUserAgent(value) {
  if (!value) return '';
  return value.slice(0, 120);
}

function pruneManifestLogSeen(now) {
  if (manifestLogSeen.size < 500) return;

  for (const [key, seenAt] of manifestLogSeen) {
    if (now - seenAt > MANIFEST_LOG_TTL_MS) {
      manifestLogSeen.delete(key);
    }
  }
}

async function writeManifestReferrerSnapshot(entry, now, env = {}) {
  const kv = getHlsLogKv(env);
  if (!kv?.put) return;

  const source = safeLogKeyPart(entry.source || 'direct');
  const country = safeLogKeyPart(entry.country || 'XX');
  const path = safeLogKeyPart(entry.path || '/');
  const key = `${HLS_REFERRER_KV_PREFIX}${source}:${country}:${path}`;
  const payload = {
    source: entry.source || 'direct',
    refererHost: entry.refererHost || '',
    originHost: entry.originHost || '',
    country: entry.country || 'XX',
    path: entry.path || '/',
    userAgent: entry.userAgent || '',
    lastSeenAt: new Date(now).toISOString(),
    lastSeenAtMs: now,
  };

  try {
    if (kv.get) {
      const raw = await kv.get(key);
      const current = raw ? JSON.parse(raw) : null;
      if (current && typeof current === 'object') {
        payload.firstSeenAt = current.firstSeenAt || payload.lastSeenAt;
        payload.firstSeenAtMs = Number(current.firstSeenAtMs) || now;
        payload.count = Number(current.count || 0) + 1;
      } else {
        payload.firstSeenAt = payload.lastSeenAt;
        payload.firstSeenAtMs = now;
        payload.count = 1;
      }
    } else {
      payload.firstSeenAt = payload.lastSeenAt;
      payload.firstSeenAtMs = now;
      payload.count = 1;
    }

    await kv.put(key, JSON.stringify(payload), { expirationTtl: HLS_REFERRER_TTL_SECONDS });
  } catch (error) {
    console.log(JSON.stringify({ event: 'hls_manifest_log_error', message: String(error?.message || error) }));
  }
}

function safeLogKeyPart(value) {
  return encodeURIComponent(String(value || '').slice(0, 180));
}

function resolveUpstream(url) {
  if (url.pathname === '/aws' || url.pathname.startsWith('/aws/')) {
    return {
      origin: AWS_UPSTREAM_ORIGIN,
      pathname: url.pathname.replace(/^\/aws(?=\/|$)/, '') || '/',
    };
  }
  return {
    origin: UPSTREAM_ORIGIN,
    pathname: url.pathname,
  };
}

async function fetchUpstream(request, upstreamUrl, cacheable) {
  const headers = new Headers();
  const range = request.headers.get('range');
  const ifModifiedSince = request.headers.get('if-modified-since');
  const ifNoneMatch = request.headers.get('if-none-match');
  if (range) headers.set('Range', range);
  if (ifModifiedSince) headers.set('If-Modified-Since', ifModifiedSince);
  if (ifNoneMatch) headers.set('If-None-Match', ifNoneMatch);
  headers.set('Origin', 'https://livekinglive.win');
  headers.set(
    'User-Agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  );

  const response = await fetch(upstreamUrl.toString(), {
    method: request.method,
    headers,
    cf: cacheable
      ? { cacheEverything: true, cacheTtl: 300 }
      : { cacheEverything: false, cacheTtl: 0 },
  });

  const next = new Response(response.body, response);

  if (cacheable && next.ok) {
    next.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300');
  }

  return next;
}

function withCors(response, workerCacheStatus) {
  const next = new Response(response.body, response);
  next.headers.set('Access-Control-Allow-Origin', '*');
  next.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  next.headers.set(
    'Access-Control-Allow-Headers',
    'Range, Origin, Accept, User-Agent, X-Requested-With, If-Modified-Since, Cache-Control, Content-Type, Authorization',
  );
  next.headers.set(
    'Access-Control-Expose-Headers',
    'Content-Length, Content-Range, Accept-Ranges, CF-Cache-Status, X-Worker-Cache',
  );
  next.headers.set('X-Worker-Cache', workerCacheStatus);
  return next;
}
