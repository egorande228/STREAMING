const UPSTREAM_ORIGIN = 'https://hls.livekinglive.win';
const AWS_UPSTREAM_ORIGIN = 'http://ec2-54-164-65-76.compute-1.amazonaws.com';
const SEGMENT_RE = /\.(ts|m4s|mp4|aac)$/i;

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return withCors(new Response(null, { status: 204 }), 'BYPASS');
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return withCors(new Response('Method Not Allowed', { status: 405 }), 'BYPASS');
  }

  const upstream = resolveUpstream(url);
  const upstreamUrl = new URL(upstream.pathname + url.search, upstream.origin);
  const isSegment = SEGMENT_RE.test(url.pathname);
  const isManifest = url.pathname.toLowerCase().endsWith('.m3u8');

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
  const headers = new Headers(request.headers);
  headers.delete('host');
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
    'Range, Origin, Accept, User-Agent, X-Requested-With, If-Modified-Since, Cache-Control, Content-Type',
  );
  next.headers.set(
    'Access-Control-Expose-Headers',
    'Content-Length, Content-Range, Accept-Ranges, CF-Cache-Status, X-Worker-Cache',
  );
  next.headers.set('X-Worker-Cache', workerCacheStatus);
  return next;
}
