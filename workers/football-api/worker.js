const API_BASE = 'https://v3.football.api-sports.io';
const NEWS_FEED_URL = 'https://feeds.bbci.co.uk/sport/football/rss.xml';
const NEWS_FEED_PROXY_URL = `https://morss.it/${NEWS_FEED_URL}`;
const NEWS_FEED_AR_URL = 'https://feeds.bbci.co.uk/arabic/rss.xml';
const NEWS_FEED_AR_PROXY_URL = `https://morss.it/${NEWS_FEED_AR_URL}`;
const NEWS_FEED_AR_FOOTBALL_URL = 'https://news.google.com/rss/search?q=%D9%83%D8%B1%D8%A9+%D8%A7%D9%84%D9%82%D8%AF%D9%85&hl=ar&gl=AE&ceid=AE:ar';
const STREAM_CONFIG_KV_KEY = 'match_streams_json';
const CHAT_MAX_MESSAGES = 100;
const CHAT_MAX_MESSAGE_LENGTH = 240;
const CHAT_MAX_AUTHOR_LENGTH = 24;
const CHAT_RATE_LIMIT_SECONDS = 5;
const LIVE_STATUSES = new Set(['1H', '2H', 'ET', 'P', 'BT', 'INT']);
const HALF_TIME_STATUSES = new Set(['HT']);
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN']);
const POSTPONED_STATUSES = new Set(['PST', 'SUSP', 'CANC', 'ABD']);
const STATUS_PRIORITY = {
  live: 0,
  half_time: 0,
  scheduled: 1,
  postponed: 2,
  finished: 3,
};
const TOP_LEAGUE_PRIORITY = new Map([
  [1, 1], // FIFA World Cup
  [15, 2], // FIFA Club World Cup
  [2, 3], // UEFA Champions League
  [3, 4], // UEFA Europa League
  [848, 5], // UEFA Europa Conference League
  [4, 6], // UEFA European Championship
  [5, 7], // UEFA Nations League
  [11, 8], // CONMEBOL Sudamericana
  [13, 9], // CONMEBOL Libertadores
  [39, 10], // Premier League
  [140, 11], // La Liga
  [135, 12], // Serie A
  [78, 13], // Bundesliga
  [61, 14], // Ligue 1
  [94, 15], // Primeira Liga
  [88, 16], // Eredivisie
  [71, 17], // Serie A Brazil
  [128, 18], // Liga Profesional Argentina
  [253, 19], // Major League Soccer
  [307, 20], // Saudi Pro League
]);

export default {
  fetch(request, env, ctx) {
    return routeRequest(request, env, ctx);
  },
};

export async function routeRequest(request, env = {}, ctx = {}) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return emptyResponse(204);
  if (url.pathname.startsWith('/api/admin')) {
    return routeAdminRequest(request, env);
  }
  if (url.pathname === '/api/streams/active') {
    if (request.method !== 'GET') return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
    return routePublicStreamsRequest(env);
  }
  const chatMatch = url.pathname.match(/^\/api\/chat\/(\d+)$/);
  if (chatMatch) {
    return routeChatRequest(request, env, Number(chatMatch[1]));
  }
  if (request.method !== 'GET') return jsonResponse({ error: 'method_not_allowed' }, 405, 0);

  const statsMatch = url.pathname.match(/^\/api\/matches\/(\d+)\/stats$/);
  const prematchMatch = url.pathname.match(/^\/api\/matches\/(\d+)\/prematch$/);
  if (url.pathname === '/api/news') {
    return routeNewsRequest(request, ctx);
  }
  if (!url.pathname.startsWith('/api/matches')) {
    return jsonResponse({ error: 'not_found' }, 404, 0);
  }

  if (!env.API_FOOTBALL_KEY) {
    if (url.pathname === '/api/matches') {
      return jsonResponse({ matches: [], total: 0, source: 'not_configured' }, 200, 30);
    }
    return jsonResponse({ error: 'API_FOOTBALL_KEY is not configured' }, 503, 30);
  }

  const ttl = resolveCacheTtl(url);
  const cacheKey = new Request(normalizeCacheUrl(url).toString(), request);
  const cache = globalThis.caches?.default;
  const cached = cache ? await cache.match(cacheKey) : null;
  if (cached) return cached;

  const apiUrl = buildFootballApiUrl(url);
  const apiResponse = await fetch(apiUrl, {
    headers: {
      'x-apisports-key': env.API_FOOTBALL_KEY,
      Accept: 'application/json',
    },
  });

  if (!apiResponse.ok) {
    return jsonResponse({ error: 'football_api_error', status: apiResponse.status }, 502, 30);
  }

  const payload = await apiResponse.json();
  if (hasFootballApiErrors(payload.errors)) {
    return jsonResponse({ error: 'football_api_error', details: payload.errors }, 502, 30);
  }

  let response;
  if (statsMatch) {
    response = jsonResponse(normalizeStatistics(Number(statsMatch[1]), payload.response), 200, ttl);
  } else if (prematchMatch) {
    response = jsonResponse(
      normalizePrematch(Number(prematchMatch[1]), Number(url.searchParams.get('home')), Number(url.searchParams.get('away')), payload.response),
      200,
      ttl,
    );
  } else {
    const fixtures = Array.isArray(payload.response) ? payload.response : [];
    const streamConfig = await readRuntimeStreamConfig(env);
    const matches = applyMatchOverrides(fixtures.map((fixture) => normalizeFixture(fixture, env, streamConfig)), env, streamConfig);
    const visibleMatches = url.pathname === '/api/matches' ? sortMatches(matches.filter(isTopLeagueMatch)) : matches;
    response =
      url.pathname === '/api/matches'
        ? jsonResponse({ matches: visibleMatches, total: visibleMatches.length }, 200, ttl)
        : jsonResponse(visibleMatches[0] ?? { error: 'match_not_found' }, visibleMatches[0] ? 200 : 404, ttl);
  }

  if (cache && response.ok) {
    const cacheable = response.clone();
    if (ctx.waitUntil) ctx.waitUntil(cache.put(cacheKey, cacheable));
    else await cache.put(cacheKey, cacheable);
  }

  return response;
}

async function routeNewsRequest(request, ctx = {}) {
  const url = new URL(request.url);
  const newsLang = resolveNewsLanguage(url.searchParams.get('lang'));
  const ttl = resolveCacheTtl(url);
  const cacheKey = new Request(normalizeCacheUrl(url).toString(), request);
  const cache = globalThis.caches?.default;
  const cached = cache ? await cache.match(cacheKey) : null;
  if (cached) return cached;

  const feed = await fetchNewsFeed(newsLang);
  if (!feed.ok) {
    return jsonResponse({ error: 'news_feed_error', status: feed.status, news: [] }, 502, 60);
  }

  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 6, 1), 12);
  const allNews = normalizeRssNews(feed.xml, 24, feed.itemSource);
  let source = feed.source;
  let feedUrl = feed.url;
  let news = newsLang === 'ar' ? allNews.filter((item) => isFootballNews(item, newsLang)).slice(0, limit) : allNews.slice(0, limit);

  if (newsLang === 'ar' && news.length === 0) {
    const fallbackFeed = await fetchArabicFootballFallbackFeed();
    if (fallbackFeed.ok) {
      source = fallbackFeed.source;
      feedUrl = fallbackFeed.url;
      news = normalizeRssNews(fallbackFeed.xml, limit, fallbackFeed.itemSource);
    }
  }

  const body = {
    source,
    feed_url: feedUrl,
    lang: newsLang,
    news,
  };
  const newsResponse = jsonResponse(body, 200, ttl);

  if (cache && newsResponse.ok) {
    const cacheable = newsResponse.clone();
    if (ctx.waitUntil) ctx.waitUntil(cache.put(cacheKey, cacheable));
    else await cache.put(cacheKey, cacheable);
  }

  return newsResponse;
}

async function routeAdminRequest(request, env = {}) {
  const url = new URL(request.url);
  if (url.pathname === '/api/admin/login') {
    if (request.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
    if (!isCloudflareAccessAllowed(request, env)) return jsonResponse({ error: 'unauthorized' }, 401, 0);
    return routeAdminLogin(request, env);
  }

  if (!isAuthorizedAdminRequest(request, env)) {
    return jsonResponse({ error: 'unauthorized' }, 401, 0);
  }

  if (url.pathname === '/api/admin/streams') {
    if (request.method === 'GET') return routeAdminStreamsList(env);
    if (request.method === 'POST') return routeAdminStreamsCreate(request, env);
    return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
  }

  const streamId = Number(url.pathname.match(/^\/api\/admin\/streams\/(\d+)$/)?.[1]);
  if (streamId > 0) {
    if (request.method === 'PUT') return routeAdminStreamsUpdate(request, env, streamId);
    if (request.method === 'DELETE') return routeAdminStreamsDelete(env, streamId);
    return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
  }

  return jsonResponse({ error: 'not_found' }, 404, 0);
}

async function routeAdminLogin(request, env) {
  const adminToken = String(env.ADMIN_BEARER_TOKEN || '').trim();
  const adminUsername = String(env.ADMIN_USERNAME || 'admin').trim();
  const adminPassword = String(env.ADMIN_PASSWORD || '').trim();
  if (!adminToken || !adminPassword) {
    return jsonResponse({ error: 'admin_credentials_not_configured' }, 503, 0);
  }

  const body = await readJsonBody(request);
  const username = String(body?.username || '').trim();
  const password = String(body?.password || '').trim();
  if (username !== adminUsername || password !== adminPassword) {
    return jsonResponse({ error: 'invalid_credentials' }, 401, 0);
  }

  return jsonResponse({ token: adminToken }, 200, 0);
}

async function routeAdminStreamsList(env) {
  const config = await readRuntimeStreamConfig(env);
  const streams = flattenStreamConfig(config).map((stream) => ({
    ...stream,
    is_live_now: isStreamActiveNow(stream),
  }));
  return jsonResponse({ streams, total: streams.length }, 200, 0);
}

async function routePublicStreamsRequest(env) {
  const config = await readRuntimeStreamConfig(env);
  const streams = flattenStreamConfig(config).filter((stream) => isStreamActiveNow(stream));
  const byMatch = {};
  streams.forEach((stream) => {
    const key = String(stream.match_id);
    if (!byMatch[key]) byMatch[key] = [];
    byMatch[key].push(stream);
  });
  return jsonResponse(
    {
      match_ids: Object.keys(byMatch),
      streams: byMatch,
      total_matches: Object.keys(byMatch).length,
      total_streams: streams.length,
      generated_at: new Date().toISOString(),
    },
    200,
    30,
  );
}

async function routeChatRequest(request, env = {}, matchId) {
  if (!Number.isFinite(matchId) || matchId <= 0) {
    return jsonResponse({ error: 'invalid_match_id' }, 400, 0);
  }
  if (!env.STREAM_CONFIG_KV?.get || !env.STREAM_CONFIG_KV?.put) {
    return jsonResponse({ error: 'chat_kv_not_configured' }, 503, 0);
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const since = Number(url.searchParams.get('since')) || 0;
    const room = await readChatRoom(env, matchId);
    const messages = since > 0 ? room.messages.filter((message) => Number(message.created_at_ms) > since) : room.messages;
    return jsonResponse(
      {
        match_id: matchId,
        messages,
        server_time: Date.now(),
      },
      200,
      0,
    );
  }

  if (request.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, 0);

  const body = await readJsonBody(request);
  const messageText = normalizeChatText(body?.message, CHAT_MAX_MESSAGE_LENGTH);
  if (!messageText) return jsonResponse({ error: 'empty_message' }, 400, 0);

  const fingerprint = chatFingerprint(request, body?.client_id);
  const rateKey = chatRateKey(matchId, fingerprint);
  const rateLimited = await env.STREAM_CONFIG_KV.get(rateKey);
  if (rateLimited) return jsonResponse({ error: 'rate_limited', retry_after: CHAT_RATE_LIMIT_SECONDS }, 429, 0);

  const author = normalizeChatText(body?.author, CHAT_MAX_AUTHOR_LENGTH) || 'Guest';
  const now = Date.now();
  const message = {
    id: crypto.randomUUID(),
    match_id: matchId,
    author,
    message: messageText,
    created_at: new Date(now).toISOString(),
    created_at_ms: now,
  };

  const room = await readChatRoom(env, matchId);
  const messages = [...room.messages, message].slice(-CHAT_MAX_MESSAGES);
  await env.STREAM_CONFIG_KV.put(chatRoomKey(matchId), JSON.stringify({ messages, updated_at: message.created_at }));
  await env.STREAM_CONFIG_KV.put(rateKey, '1', { expirationTtl: CHAT_RATE_LIMIT_SECONDS });

  return jsonResponse({ ok: true, message, server_time: now }, 200, 0);
}

async function routeAdminStreamsCreate(request, env) {
  if (!env.STREAM_CONFIG_KV?.put) {
    return jsonResponse({ error: 'stream_kv_not_configured' }, 503, 0);
  }

  const body = await readJsonBody(request);
  const nextStream = normalizeAdminStreamPayload(body, 0);
  if (!nextStream) return jsonResponse({ error: 'invalid_stream_payload' }, 400, 0);

  const config = await readRuntimeStreamConfig(env);
  const streams = flattenStreamConfig(config);
  const nextId = streams.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  streams.push({ ...nextStream, id: nextId });
  await writeRuntimeStreamConfig(env, expandStreamConfig(streams));
  return jsonResponse({ id: nextId }, 200, 0);
}

async function routeAdminStreamsUpdate(request, env, streamId) {
  if (!env.STREAM_CONFIG_KV?.put) {
    return jsonResponse({ error: 'stream_kv_not_configured' }, 503, 0);
  }

  const body = await readJsonBody(request);
  const updated = normalizeAdminStreamPayload(body, streamId);
  if (!updated) return jsonResponse({ error: 'invalid_stream_payload' }, 400, 0);

  const config = await readRuntimeStreamConfig(env);
  const streams = flattenStreamConfig(config);
  const index = streams.findIndex((item) => Number(item.id) === streamId);
  if (index < 0) return jsonResponse({ error: 'stream_not_found' }, 404, 0);
  streams[index] = updated;
  await writeRuntimeStreamConfig(env, expandStreamConfig(streams));
  return jsonResponse({ ok: true }, 200, 0);
}

async function routeAdminStreamsDelete(env, streamId) {
  if (!env.STREAM_CONFIG_KV?.put) {
    return jsonResponse({ error: 'stream_kv_not_configured' }, 503, 0);
  }

  const config = await readRuntimeStreamConfig(env);
  const streams = flattenStreamConfig(config);
  const filtered = streams.filter((item) => Number(item.id) !== streamId);
  if (filtered.length === streams.length) {
    return jsonResponse({ error: 'stream_not_found' }, 404, 0);
  }

  await writeRuntimeStreamConfig(env, expandStreamConfig(filtered));
  return jsonResponse({ ok: true }, 200, 0);
}

function isAuthorizedAdminRequest(request, env = {}) {
  if (!isCloudflareAccessAllowed(request, env)) return false;
  const expected = String(env.ADMIN_BEARER_TOKEN || '').trim();
  if (!expected) return false;
  const auth = request.headers.get('Authorization') || '';
  return auth === `Bearer ${expected}`;
}

function isCloudflareAccessAllowed(request, env = {}) {
  const requireAccess = String(env.ADMIN_REQUIRE_ACCESS || '').toLowerCase() === 'true';
  if (!requireAccess) return true;

  const authenticatedEmail =
    request.headers.get('Cf-Access-Authenticated-User-Email') ||
    request.headers.get('cf-access-authenticated-user-email') ||
    '';
  if (!authenticatedEmail) return false;

  const rawAllowed = String(env.ADMIN_ACCESS_EMAILS || '').trim();
  if (!rawAllowed) return true;
  const allowlist = rawAllowed
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (!allowlist.length) return true;
  return allowlist.includes(String(authenticatedEmail).trim().toLowerCase());
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function readRuntimeStreamConfig(env = {}) {
  let config;
  if (env.STREAM_CONFIG_KV?.get) {
    const raw = await env.STREAM_CONFIG_KV.get(STREAM_CONFIG_KV_KEY);
    config = readStreamConfig(raw);
  } else {
    config = readStreamConfig(env.MATCH_STREAMS_JSON);
  }
  return applyStreamOverride(config, env);
}

async function writeRuntimeStreamConfig(env = {}, config = {}) {
  if (!env.STREAM_CONFIG_KV?.put) return false;
  await env.STREAM_CONFIG_KV.put(STREAM_CONFIG_KV_KEY, JSON.stringify(config));
  return true;
}

function applyStreamOverride(config = {}, env = {}) {
  const matchId = Number(env.STREAM_OVERRIDE_MATCH_ID);
  const url = String(env.STREAM_OVERRIDE_URL || '').trim();
  if (!Number.isFinite(matchId) || matchId <= 0 || !url) return config;

  const key = String(matchId);
  const current = Array.isArray(config[key]) ? config[key][0] : config[key];
  return {
    ...config,
    [key]: {
      id: Number(current?.id) || 1,
      url,
      source_type: env.STREAM_OVERRIDE_SOURCE_TYPE || current?.source_type || inferStreamType(url),
      label: env.STREAM_OVERRIDE_LABEL || current?.label || 'Live stream',
      language_code: env.STREAM_OVERRIDE_LANGUAGE || current?.language_code || 'en',
      region: env.STREAM_OVERRIDE_REGION || current?.region || 'global',
      priority: Number.isFinite(Number(current?.priority)) ? Number(current.priority) : 100,
      commentary_type: current?.commentary_type || 'full',
      quality: env.STREAM_OVERRIDE_QUALITY || current?.quality || '720p',
      is_active: true,
      starts_at: current?.starts_at || null,
      ends_at: current?.ends_at || null,
    },
  };
}

function flattenStreamConfig(config = {}) {
  const streams = [];
  for (const [matchKey, rawValue] of Object.entries(config)) {
    const matchId = Number(matchKey);
    if (!Number.isFinite(matchId) || matchId <= 0) continue;
    const list = Array.isArray(rawValue) ? rawValue : [rawValue];
    list.forEach((entry, index) => {
      const normalized = normalizeStream(entry, matchId, index);
      if (!normalized) return;
      const id = Number(normalized.id);
      streams.push({
        id: Number.isFinite(id) && id > 0 ? id : hashToPositiveInt(`${matchId}:${index}:${normalized.url}`),
        match_id: matchId,
        label: normalized.label || 'Live stream',
        source_type: normalized.source_type || inferStreamType(normalized.url),
        quality: normalized.quality || '720p',
        language_code: normalized.language_code || 'en',
        url: normalized.url,
        priority: Number.isFinite(Number(normalized.priority)) ? Number(normalized.priority) : 100 - index,
        region: normalized.region || 'global',
        commentary_type: normalized.commentary_type || normalized.commentaryType || 'full',
        is_active: normalized.is_active !== false,
        starts_at: normalized.starts_at || normalized.startsAt || null,
        ends_at: normalized.ends_at || normalized.endsAt || null,
      });
    });
  }

  return streams.sort((a, b) => Number(b.priority) - Number(a.priority));
}

function expandStreamConfig(streams = []) {
  const byMatch = {};
  streams.forEach((stream, index) => {
    const matchId = Number(stream?.match_id);
    if (!Number.isFinite(matchId) || matchId <= 0) return;
    const key = String(matchId);
    if (!byMatch[key]) byMatch[key] = [];
    byMatch[key].push({
      id: Number(stream.id) || index + 1,
      url: String(stream.url || ''),
      source_type: stream.source_type || inferStreamType(stream.url || ''),
      label: stream.label || 'Live stream',
      language_code: stream.language_code || 'en',
      region: stream.region || 'global',
      priority: Number.isFinite(Number(stream.priority)) ? Number(stream.priority) : 100 - index,
      commentary_type: stream.commentary_type || 'full',
      quality: stream.quality || '720p',
      is_active: stream.is_active !== false,
      starts_at: stream.starts_at || null,
      ends_at: stream.ends_at || null,
    });
  });
  return byMatch;
}

function normalizeAdminStreamPayload(payload, streamId) {
  const matchId = Number(payload?.match_id);
  const url = String(payload?.url || '').trim();
  if (!Number.isFinite(matchId) || matchId <= 0 || !url) return null;

  const sourceType = payload?.source_type === 'hls' || payload?.source_type === 'iframe'
    ? payload.source_type
    : inferStreamType(url);
  return {
    id: streamId,
    match_id: matchId,
    label: String(payload?.label || 'Live stream').trim(),
    source_type: sourceType,
    quality: String(payload?.quality || '720p').trim(),
    language_code: String(payload?.language_code || 'en').trim(),
    url,
    priority: Number.isFinite(Number(payload?.priority)) ? Number(payload.priority) : 100,
    region: String(payload?.region || 'global').trim(),
    commentary_type: String(payload?.commentary_type || 'full').trim(),
    is_active: payload?.is_active !== false,
    starts_at: normalizeOptionalDateTime(payload?.starts_at),
    ends_at: normalizeOptionalDateTime(payload?.ends_at),
  };
}

function normalizeOptionalDateTime(value) {
  if (!value) return null;
  const asString = String(value).trim();
  if (!asString) return null;
  const parsed = Date.parse(asString);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

async function readChatRoom(env = {}, matchId) {
  const raw = await env.STREAM_CONFIG_KV.get(chatRoomKey(matchId));
  if (!raw) return { messages: [] };
  try {
    const parsed = JSON.parse(raw);
    const messages = Array.isArray(parsed?.messages) ? parsed.messages.map(normalizeStoredChatMessage).filter(Boolean) : [];
    return { messages: messages.slice(-CHAT_MAX_MESSAGES) };
  } catch {
    return { messages: [] };
  }
}

function normalizeStoredChatMessage(message) {
  const matchId = Number(message?.match_id);
  const text = normalizeChatText(message?.message, CHAT_MAX_MESSAGE_LENGTH);
  if (!Number.isFinite(matchId) || matchId <= 0 || !text) return null;
  const createdAtMs = Number(message?.created_at_ms) || Date.parse(message?.created_at || '') || Date.now();
  return {
    id: String(message?.id || crypto.randomUUID()),
    match_id: matchId,
    author: normalizeChatText(message?.author, CHAT_MAX_AUTHOR_LENGTH) || 'Guest',
    message: text,
    created_at: new Date(createdAtMs).toISOString(),
    created_at_ms: createdAtMs,
  };
}

function normalizeChatText(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function chatRoomKey(matchId) {
  return `chat:${matchId}`;
}

function chatRateKey(matchId, fingerprint) {
  return `chat_rate:${matchId}:${fingerprint}`;
}

function chatFingerprint(request, clientId) {
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0] ||
    'unknown';
  return safeKeyPart(`${ip}:${clientId || ''}`);
}

function safeKeyPart(value) {
  return String(value || 'unknown').replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 120) || 'unknown';
}

function hashToPositiveInt(value = '') {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + 1;
}

async function fetchNewsFeed(newsLang) {
  if (newsLang === 'ar') {
    const primary = await fetchFeedUrl(NEWS_FEED_AR_PROXY_URL);
    if (primary.ok) {
      return {
        ...primary,
        source: 'BBC Arabic',
        itemSource: 'BBC Arabic',
        url: NEWS_FEED_AR_URL,
      };
    }
    const response = await fetchFeedUrl(NEWS_FEED_AR_URL);
    return {
      ...response,
      source: 'BBC Arabic',
      itemSource: 'BBC Arabic',
      url: NEWS_FEED_AR_URL,
    };
  }
  const primary = await fetchFeedUrl(NEWS_FEED_PROXY_URL);
  if (primary.ok) {
    return {
      ...primary,
      source: 'BBC Sport Football',
      itemSource: 'BBC Sport',
      url: NEWS_FEED_URL,
    };
  }
  const fallback = await fetchFeedUrl(NEWS_FEED_URL);
  return {
    ...fallback,
    source: 'BBC Sport Football',
    itemSource: 'BBC Sport',
    url: NEWS_FEED_URL,
  };
}

async function fetchArabicFootballFallbackFeed() {
  const response = await fetchFeedUrl(NEWS_FEED_AR_FOOTBALL_URL);
  return {
    ...response,
    source: 'Google News Arabic Football',
    itemSource: 'Google News',
    url: NEWS_FEED_AR_FOOTBALL_URL,
  };
}

async function fetchFeedUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml',
        'User-Agent': 'KingLive Football News/1.0',
      },
    });
    if (!response.ok) return { ok: false, status: response.status, xml: '' };
    return { ok: true, status: response.status, xml: await response.text() };
  } catch {
    return { ok: false, status: 502, xml: '' };
  }
}

export function buildFootballApiUrl(siteUrl) {
  const statsMatch = siteUrl.pathname.match(/^\/api\/matches\/(\d+)\/stats$/)?.[1];
  if (statsMatch) {
    const apiUrl = new URL('/fixtures/statistics', API_BASE);
    apiUrl.searchParams.set('fixture', statsMatch);
    return apiUrl;
  }

  const prematchMatch = siteUrl.pathname.match(/^\/api\/matches\/(\d+)\/prematch$/)?.[1];
  if (prematchMatch) {
    const apiUrl = new URL('/fixtures/headtohead', API_BASE);
    apiUrl.searchParams.set('h2h', `${siteUrl.searchParams.get('home')}-${siteUrl.searchParams.get('away')}`);
    return apiUrl;
  }

  const apiUrl = new URL('/fixtures', API_BASE);
  const matchId = siteUrl.pathname.match(/^\/api\/matches\/(\d+)$/)?.[1];
  if (matchId) {
    apiUrl.searchParams.set('id', matchId);
    return apiUrl;
  }

  const status = siteUrl.searchParams.get('status') || '';
  const date = siteUrl.searchParams.get('date') || '';

  if (status === 'live' || status === 'half_time') {
    apiUrl.searchParams.set('live', 'all');
  } else if (date) {
    apiUrl.searchParams.set('date', date);
  } else if (status === 'scheduled') {
    apiUrl.searchParams.set('date', todayDate());
  } else {
    apiUrl.searchParams.set('date', todayDate());
  }

  return apiUrl;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function hasFootballApiErrors(errors) {
  if (!errors) return false;
  if (Array.isArray(errors)) return errors.length > 0;
  if (typeof errors === 'object') return Object.keys(errors).length > 0;
  return Boolean(errors);
}

export function normalizeFixture(item, env = {}, streamConfig = null) {
  const fixture = item.fixture ?? {};
  const league = item.league ?? {};
  const teams = item.teams ?? {};
  const goals = item.goals ?? {};
  const status = fixture.status ?? {};

  return applyMatchOverride({
    id: fixture.id,
    external_id: fixture.id,
    league: {
      id: league.id,
      name: league.name || 'Football',
      country: league.country || '',
    },
    stage: league.round || league.name || 'Football',
    venue: fixture.venue?.name || '',
    city: fixture.venue?.city || '',
    scheduled_at: fixture.date,
    status: normalizeStatus(status.short),
    home_score: goals.home ?? 0,
    away_score: goals.away ?? 0,
    minute: typeof status.elapsed === 'number' ? status.elapsed : undefined,
    home_team: normalizeTeam(teams.home),
    away_team: normalizeTeam(teams.away),
    streams: streamsForMatch(fixture.id, env, streamConfig),
  }, env, streamConfig);
}

function applyMatchOverrides(matches = [], env = {}, streamConfig = null) {
  const override = createOverrideMatch(env, streamConfig);
  if (!override) return matches;

  const next = [];
  let replaced = false;
  matches.forEach((match) => {
    if (String(match?.id) === String(override.id)) {
      next.push(applyMatchOverride(match, env, streamConfig));
      replaced = true;
      return;
    }
    next.push(match);
  });
  if (!replaced) next.unshift(override);
  return next;
}

function applyMatchOverride(match = {}, env = {}, streamConfig = null) {
  const override = createOverrideMatch(env, streamConfig);
  if (!override || String(match?.id) !== String(override.id)) return match;
  return {
    ...match,
    stage: env.MATCH_OVERRIDE_STAGE || match.stage,
    venue: env.MATCH_OVERRIDE_VENUE || match.venue,
    city: env.MATCH_OVERRIDE_CITY || match.city,
    scheduled_at: env.MATCH_OVERRIDE_SCHEDULED_AT || match.scheduled_at || override.scheduled_at,
    status: env.MATCH_OVERRIDE_STATUS || match.status,
    minute: Number.isFinite(Number(env.MATCH_OVERRIDE_MINUTE)) ? Number(env.MATCH_OVERRIDE_MINUTE) : match.minute,
    home_team: override.home_team,
    away_team: override.away_team,
    streams: streamsForMatch(override.id, env, streamConfig),
  };
}

function createOverrideMatch(env = {}, streamConfig = null) {
  const matchId = Number(env.MATCH_OVERRIDE_ID || env.STREAM_OVERRIDE_MATCH_ID);
  if (!Number.isFinite(matchId) || matchId <= 0) return null;
  const home = env.MATCH_OVERRIDE_HOME || 'VALENCIA';
  const away = env.MATCH_OVERRIDE_AWAY || 'BARCELONA';
  return {
    id: matchId,
    external_id: matchId,
    league: {
      id: Number(env.MATCH_OVERRIDE_LEAGUE_ID) || 140,
      name: env.MATCH_OVERRIDE_LEAGUE_NAME || 'La Liga',
      country: env.MATCH_OVERRIDE_LEAGUE_COUNTRY || 'Spain',
    },
    stage: env.MATCH_OVERRIDE_STAGE || 'Live match',
    venue: env.MATCH_OVERRIDE_VENUE || '',
    city: env.MATCH_OVERRIDE_CITY || '',
    scheduled_at: env.MATCH_OVERRIDE_SCHEDULED_AT || new Date().toISOString(),
    status: env.MATCH_OVERRIDE_STATUS || 'live',
    home_score: Number.isFinite(Number(env.MATCH_OVERRIDE_HOME_SCORE)) ? Number(env.MATCH_OVERRIDE_HOME_SCORE) : 0,
    away_score: Number.isFinite(Number(env.MATCH_OVERRIDE_AWAY_SCORE)) ? Number(env.MATCH_OVERRIDE_AWAY_SCORE) : 0,
    minute: Number.isFinite(Number(env.MATCH_OVERRIDE_MINUTE)) ? Number(env.MATCH_OVERRIDE_MINUTE) : 1,
    home_team: makeOverrideTeam(home, env.MATCH_OVERRIDE_HOME_ID, env.MATCH_OVERRIDE_HOME_LOGO),
    away_team: makeOverrideTeam(away, env.MATCH_OVERRIDE_AWAY_ID, env.MATCH_OVERRIDE_AWAY_LOGO),
    streams: streamsForMatch(matchId, env, streamConfig),
  };
}

function makeOverrideTeam(name, id, logo) {
  return {
    id: Number.isFinite(Number(id)) ? Number(id) : undefined,
    external_id: Number.isFinite(Number(id)) ? Number(id) : undefined,
    code: shortCode(name),
    name_en: name,
    name_ru: name,
    flag_url: logo || '',
  };
}

export function isTopLeagueMatch(match) {
  const id = Number(match?.league?.id);
  if (TOP_LEAGUE_PRIORITY.has(id)) return true;

  const name = String(match?.league?.name || '').toLowerCase();
  return (
    name.includes('world cup') ||
    name.includes('uefa champions league') ||
    name.includes('uefa europa league') ||
    name.includes('uefa europa conference league') ||
    name.includes('conmebol libertadores') ||
    name.includes('conmebol sudamericana')
  );
}

export function sortMatches(matches) {
  return [...matches].sort((a, b) => {
    const statusDelta = statusPriority(a) - statusPriority(b);
    if (statusDelta !== 0) return statusDelta;

    const leagueDelta = leaguePriority(a) - leaguePriority(b);
    if (leagueDelta !== 0) return leagueDelta;

    return Date.parse(a.scheduled_at || '') - Date.parse(b.scheduled_at || '');
  });
}

function statusPriority(match) {
  return STATUS_PRIORITY[match?.status] ?? 4;
}

function leaguePriority(match) {
  return TOP_LEAGUE_PRIORITY.get(Number(match?.league?.id)) ?? 999;
}

function streamsForMatch(matchId, env = {}, streamConfig = null) {
  const config = streamConfig || readStreamConfig(env.MATCH_STREAMS_JSON);
  const configured = config[String(matchId)];
  if (!configured) return [];
  const streams = Array.isArray(configured) ? configured : [configured];

  return streams
    .map((stream, index) => normalizeStream(stream, matchId, index))
    .filter((stream) => isStreamActiveNow(stream));
}

function readStreamConfig(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeStream(stream, matchId, index) {
  if (typeof stream === 'string') {
    if (!stream) return null;
    return {
      id: `env-${matchId}-${index}`,
      url: stream,
      source_type: inferStreamType(stream),
      label: 'Live stream',
      language_code: 'en',
      region: 'global',
      priority: 100 - index,
      is_active: true,
      starts_at: null,
      ends_at: null,
    };
  }

  if (!stream || !stream.url) return null;
  return {
    id: stream.id || `env-${matchId}-${index}`,
    url: stream.url,
    source_type: stream.source_type || stream.sourceType || inferStreamType(stream.url),
    label: stream.label || 'Live stream',
    language_code: stream.language_code || stream.languageCode || 'en',
    region: stream.region || 'global',
    priority: typeof stream.priority === 'number' ? stream.priority : 100 - index,
    is_active: stream.is_active !== false && stream.isActive !== false,
    title: stream.title || '',
    starts_at: normalizeOptionalDateTime(stream.starts_at || stream.startsAt),
    ends_at: normalizeOptionalDateTime(stream.ends_at || stream.endsAt),
  };
}

function isStreamActiveNow(stream, now = Date.now()) {
  if (!stream || stream.is_active === false || stream.isActive === false) return false;
  const startsAt = Date.parse(stream.starts_at || stream.startsAt || '');
  const endsAt = Date.parse(stream.ends_at || stream.endsAt || '');
  if (!Number.isNaN(startsAt) && now < startsAt) return false;
  if (!Number.isNaN(endsAt) && now > endsAt) return false;
  return true;
}

function inferStreamType(url) {
  return /\.m3u8(\?|$)/i.test(url) ? 'hls' : 'iframe';
}

export function normalizeStatistics(matchId, response) {
  const teams = Array.isArray(response) ? response : [];
  return {
    match_id: matchId,
    teams: teams.map((item) => ({
      team: {
        id: item.team?.id,
        name: item.team?.name || 'TBD',
        logo: item.team?.logo || '',
      },
      stats: normalizeTeamStats(item.statistics),
    })),
  };
}

export function normalizePrematch(matchId, homeId, awayId, response) {
  const fixtures = Array.isArray(response) ? response : [];
  const finishedFixtures = fixtures.filter((item) => FINISHED_STATUSES.has(item.fixture?.status?.short));
  const totals = {
    match_id: matchId,
    sample_size: finishedFixtures.length,
    home: { team_id: homeId, wins: 0, goals: 0 },
    away: { team_id: awayId, wins: 0, goals: 0 },
    draws: 0,
    label: `Head-to-head last ${finishedFixtures.length} matches`,
  };

  for (const item of finishedFixtures) {
    const fixtureHomeId = Number(item.teams?.home?.id);
    const homeGoals = Number(item.goals?.home ?? 0);
    const awayGoals = Number(item.goals?.away ?? 0);

    if (fixtureHomeId === homeId) {
      totals.home.goals += homeGoals;
      totals.away.goals += awayGoals;
      if (homeGoals > awayGoals) totals.home.wins += 1;
      else if (awayGoals > homeGoals) totals.away.wins += 1;
      else totals.draws += 1;
    } else {
      totals.home.goals += awayGoals;
      totals.away.goals += homeGoals;
      if (awayGoals > homeGoals) totals.home.wins += 1;
      else if (homeGoals > awayGoals) totals.away.wins += 1;
      else totals.draws += 1;
    }
  }

  return totals;
}

export function normalizeRssNews(xml, limit = 6, itemSource = 'BBC Sport') {
  const items = String(xml || '').match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return items.slice(0, limit).map((item, index) => {
    const descriptionHtml = textFromXml(item, 'description');
    const contentHtml = textFromXml(item, 'content:encoded');
    const summary = summaryFromDescription(descriptionHtml);
    const fullText = contentHtml ? htmlToStoryText(contentHtml) : summary;

    return {
      id: textFromXml(item, 'guid') || textFromXml(item, 'link') || `news-${index}`,
      title: textFromXml(item, 'title') || 'Football news',
      summary: summary || fullText.split('\n')[0] || '',
      full_text: fullText,
      has_full_text: Boolean(contentHtml),
      url: textFromXml(item, 'link'),
      published_at: textFromXml(item, 'pubDate'),
      image_url: normalizeNewsImageUrl(attributeFromXml(item, 'media:thumbnail', 'url')),
      source: itemSource,
    };
  });
}

function isFootballNews(item, lang) {
  const title = String(item?.title || '').toLowerCase();
  const summary = String(item?.summary || '').toLowerCase();
  const url = String(item?.url || '').toLowerCase();
  const value = `${title}\n${summary}\n${url}`;
  if (!value.trim()) return false;

  if (lang === 'ar') {
    const strongKeywords = [
      'كرة القدم',
      'كرة قدم',
      'الدوري',
      'دوري أبطال',
      'كأس العالم',
      'كأس آسيا',
      'كأس أمم',
      'منتخب',
      'رونالدو',
      'ميسي',
      'ريال مدريد',
      'برشلونة',
      'ليفربول',
      'مانشستر',
      'بايرن',
      'أرسنال',
      'تشيلسي',
      'باريس سان جيرمان',
      'uefa',
      'fifa',
      '/sport/',
    ];
    const hasStrongSignal = strongKeywords.some((keyword) => value.includes(keyword));
    if (!hasStrongSignal) return false;

    if (url.includes('/arabic/live/') && !title.includes('كرة') && !summary.includes('كرة')) {
      return false;
    }

    const keywords = [
      'مباراة',
      'مباريات',
      'مدرب',
    ];
    return keywords.some((keyword) => value.includes(keyword)) || hasStrongSignal;
  }

  return true;
}

function normalizeNewsImageUrl(value) {
  const image = String(value || '').trim();
  if (!image) return '';

  try {
    const url = new URL(image);
    if (!/bbci\.co\.uk$/i.test(url.hostname)) return image;
    url.pathname = url.pathname.replace(/\/ace\/standard\/\d+\//i, '/ace/standard/1024/');
    return url.toString();
  } catch {
    return image;
  }
}

function textFromXml(xml, tagName) {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`<${escapedTag}\\b[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, 'i').exec(xml);
  if (!match) return '';
  return decodeXml(stripCdata(match[1]).trim());
}

function attributeFromXml(xml, tagName, attributeName) {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedAttribute = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = new RegExp(`<${escapedTag}\\b[^>]*>`, 'i').exec(xml)?.[0] || '';
  const match = new RegExp(`${escapedAttribute}=["']([^"']+)["']`, 'i').exec(tag);
  return match ? decodeXml(match[1]) : '';
}

function stripCdata(value) {
  return value.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function plainText(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function summaryFromDescription(html) {
  const value = String(html || '');
  if (!value) return '';
  const linked = /<a\b[^>]*>([\s\S]*?)<\/a>/i.exec(value)?.[1];
  return plainText(linked || value);
}

function htmlToStoryText(html) {
  const value = String(html || '');
  if (!value) return '';

  const normalized = value
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li\b[^>]*>/gi, '- ')
    .replace(/<\/\s*(p|div|li|h[1-6]|blockquote|tr)\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ');

  const paragraphs = normalized
    .split(/\n+/)
    .map((part) =>
      part
        .replace(/\s+/g, ' ')
        .replace(/\s+([.,!?;:])/g, '$1')
        .trim(),
    )
    .filter(Boolean);

  return paragraphs.join('\n\n').trim();
}

function normalizeTeamStats(statistics = []) {
  const lookup = new Map(
    statistics.map((stat) => [String(stat.type || '').toLowerCase(), stat.value ?? null]),
  );

  return {
    possession: lookup.get('ball possession') ?? null,
    shots_on_goal: lookup.get('shots on goal') ?? null,
    total_shots: lookup.get('total shots') ?? null,
    corners: lookup.get('corner kicks') ?? null,
    fouls: lookup.get('fouls') ?? null,
    yellow_cards: lookup.get('yellow cards') ?? null,
    red_cards: lookup.get('red cards') ?? null,
  };
}

function normalizeTeam(team = {}) {
  return {
    id: team.id,
    external_id: team.id,
    code: team.code || shortCode(team.name),
    name_en: team.name || 'TBD',
    name_ru: team.name || 'TBD',
    flag_url: team.logo || '',
  };
}

function shortCode(name = '') {
  return name.replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase() || 'TBD';
}

function normalizeStatus(short = '') {
  if (HALF_TIME_STATUSES.has(short)) return 'half_time';
  if (LIVE_STATUSES.has(short)) return 'live';
  if (FINISHED_STATUSES.has(short)) return 'finished';
  if (POSTPONED_STATUSES.has(short)) return 'postponed';
  return 'scheduled';
}

function resolveNewsLanguage(value) {
  const lang = String(value || '').toLowerCase();
  return lang === 'ar' ? 'ar' : 'en';
}

export function resolveCacheTtl(url) {
  const status = url.searchParams.get('status') || '';
  if (url.pathname === '/api/streams/active') return 30;
  if (url.pathname === '/api/news') return secondsUntilNextUtcDay();
  if (status === 'live' || status === 'half_time') return 30;
  if (/^\/api\/matches\/\d+\/stats$/.test(url.pathname)) return 1800;
  if (/^\/api\/matches\/\d+\/prematch$/.test(url.pathname)) return secondsUntilNextUtcDay();
  if (/^\/api\/matches\/\d+$/.test(url.pathname)) return 1800;
  return secondsUntilNextUtcDay();
}

function normalizeCacheUrl(url) {
  const normalized = new URL(url);
  normalized.searchParams.sort();
  return normalized;
}

export function jsonResponse(body, status = 200, maxAge = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(maxAge),
  });
}

function emptyResponse(status) {
  return new Response(null, {
    status,
    headers: responseHeaders(0),
  });
}

function responseHeaders(maxAge) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': maxAge > 0 ? `public, max-age=${maxAge}` : 'no-store',
  };
}

function secondsUntilNextUtcDay() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const seconds = Math.floor((next - now.getTime()) / 1000);
  return Math.max(60, seconds);
}
