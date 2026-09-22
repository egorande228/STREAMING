import { normalizeRssNews } from '../football-api/worker.js';

const FEED = { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', source: 'BBC Sport Football', itemSource: 'BBC Sport' };

const NEWS_TTL_SECONDS = 900;
const MAX_FEED_BYTES = 512 * 1024;

function json(body, status = 200, ttl = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': ttl ? `public, max-age=${ttl}` : 'no-store',
    },
  });
}

async function readFeed(feed) {
  const response = await fetch(feed.url, {
    headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`feed_${response.status}`);
  const length = Number(response.headers.get('content-length'));
  if (length > MAX_FEED_BYTES) throw new Error('feed_too_large');
  const xml = await response.text();
  if (xml.length > MAX_FEED_BYTES) throw new Error('feed_too_large');
  return xml;
}

export default {
  async fetch(request, _env, ctx) {
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.pathname !== '/api/news') return json({ error: 'not_found' }, 404);
    const lang = url.searchParams.get('lang') || 'en';
    if (lang !== 'en') return json({ error: 'unsupported_locale' }, 400);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 6, 1), 12);
    const feed = FEED;
    const cache = globalThis.caches?.default;
    const cacheKey = new Request(`${url.origin}/api/news?lang=${lang}&limit=${limit}`);
    const cached = await cache?.match(cacheKey);
    if (cached) return cached;

    try {
      const xml = await readFeed(feed);
      const news = normalizeRssNews(xml, limit, feed.itemSource).map((item) => ({ ...item, image_url: '' }));
      if (!news.length) throw new Error('feed_empty');
      const result = json({ source: feed.source, feed_url: feed.url, lang, news }, 200, NEWS_TTL_SECONDS);
      if (cache && ctx?.waitUntil) ctx.waitUntil(cache.put(cacheKey, result.clone()));
      return result;
    } catch {
      return json({ error: 'news_feed_error', news: [] }, 502);
    }
  },
};
