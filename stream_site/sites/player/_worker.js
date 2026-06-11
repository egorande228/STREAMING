const HLS_ORIGIN = 'http://ORIGIN_SERVER_IP';

const CONTENT_TYPES = {
  m3u8: 'application/vnd.apple.mpegurl',
  ts: 'video/mp2t',
  m4s: 'video/iso.segment',
  mp4: 'video/mp4',
  aac: 'audio/aac',
};

function getContentType(pathname, upstreamType) {
  const ext = pathname.split('.').pop()?.toLowerCase();
  return CONTENT_TYPES[ext] || upstreamType || 'application/octet-stream';
}

function getSetCookieValue(headers, name) {
  const cookies = headers.get('Set-Cookie') || '';
  const match = cookies.match(new RegExp(`${name}=([^;]+)`));
  return match?.[1] || '';
}

function toProxyPath(basePath, line, session) {
  if (!line || line.startsWith('#')) return line;

  const absolute = /^https?:\/\//i.test(line);
  const sourceUrl = absolute ? new URL(line) : new URL(line, `http://origin${basePath.substring(0, basePath.lastIndexOf('/') + 1)}`);
  sourceUrl.searchParams.set('hlsSession', session);

  return `/hls-proxy${sourceUrl.pathname}${sourceUrl.search}`;
}

function rewritePlaylist(body, pathname, session) {
  if (!session) return body;
  return body
    .split('\n')
    .map((line) => toProxyPath(pathname, line.trim(), session))
    .join('\n');
}

async function proxyHls(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/^\/hls-proxy/, '') || '/';

  if (!pathname.startsWith('/live/')) {
    return new Response('Not found', { status: 404 });
  }

  const session = url.searchParams.get('hlsSession') || '';
  const upstreamSearch = new URLSearchParams(url.search);
  upstreamSearch.delete('hlsSession');
  upstreamSearch.set('cookieCheck', '1');

  const upstreamUrl = new URL(pathname, HLS_ORIGIN);
  upstreamUrl.search = upstreamSearch.toString();
  const upstream = await fetch(upstreamUrl, {
    headers: {
      Accept: request.headers.get('Accept') || '*/*',
      Cookie: `cookieCheck=1${session ? `; hlsSession=${session}` : ''}`,
      'User-Agent': 'KingLive-HLS-Proxy',
    },
  });

  const headers = new Headers(upstream.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Cache-Control', pathname.endsWith('.m3u8') ? 'no-store' : 'public, max-age=8');
  headers.set('Content-Type', getContentType(pathname, upstream.headers.get('Content-Type')));

  if (pathname.endsWith('.m3u8')) {
    const body = await upstream.text();
    const nextSession = session || getSetCookieValue(upstream.headers, 'hlsSession');
    return new Response(rewritePlaylist(body, pathname, nextSession), {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

export default {
  fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/hls-proxy/')) {
      return proxyHls(request);
    }

    return env.ASSETS.fetch(request);
  },
};
