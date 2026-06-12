const API_BASE = 'https://v3.football.api-sports.io';
const SPORTMONKS_API_BASE = 'https://api.sportmonks.com/v3/football';
const SPORTMONKS_MATCH_INCLUDES = 'participants;scores;events.type;statistics.type;periods;state;venue;stage;league';
const SPORTMONKS_DETAIL_INCLUDES = 'participants;scores;events.type;statistics.type;lineups.player:display_name,image_path;periods;state;venue;stage;league';
const SPORTMONKS_STATS_INCLUDES = 'participants;statistics.type';
const SPORTMONKS_EVENTS_INCLUDES = 'participants;events.type';
const SPORTMONKS_LINEUPS_INCLUDES = 'participants;lineups.player:display_name,image_path';
const SPORTMONKS_NEWS_INCLUDES = 'fixture;league;lines';
const NEWS_FEED_URL = 'https://feeds.bbci.co.uk/sport/football/rss.xml';
const NEWS_FEED_PROXY_URL = `https://morss.it/${NEWS_FEED_URL}`;
const NEWS_FEED_AR_URL = 'https://feeds.bbci.co.uk/arabic/rss.xml';
const NEWS_FEED_AR_PROXY_URL = `https://morss.it/${NEWS_FEED_AR_URL}`;
const NEWS_FEED_AR_FOOTBALL_URL = 'https://news.google.com/rss/search?q=%D9%83%D8%B1%D8%A9+%D8%A7%D9%84%D9%82%D8%AF%D9%85&hl=ar&gl=AE&ceid=AE:ar';
const GOOGLE_NEWS_FEEDS = {
  es: 'https://news.google.com/rss/search?q=f%C3%BAtbol&hl=es&gl=ES&ceid=ES:es',
  fr: 'https://news.google.com/rss/search?q=football&hl=fr&gl=FR&ceid=FR:fr',
  mn: 'https://news.google.com/rss/search?q=football&hl=mn&gl=MN&ceid=MN:mn',
};
const STREAM_CONFIG_KV_KEY = 'match_streams_json';
const DAMI_STREAMS_API_URL = 'https://damitv.b-cdn.net/papi/api/streams';
const DAMI_TEAM_CODE_ALIASES = {
  ARG: 'argentina',
  AUS: 'australia',
  BEL: 'belgium',
  BIH: 'bosnia herzegovina',
  BRA: 'brazil',
  CAN: 'canada',
  CMR: 'cameroon',
  COL: 'colombia',
  CRC: 'costa rica',
  CRO: 'croatia',
  CZE: 'czech',
  DEN: 'denmark',
  ECU: 'ecuador',
  EGY: 'egypt',
  ENG: 'england',
  ESP: 'spain',
  FRA: 'france',
  GER: 'germany',
  GHA: 'ghana',
  IRN: 'iran',
  ITA: 'italy',
  JPN: 'japan',
  KOR: 'korea',
  MAR: 'morocco',
  MEX: 'mexico',
  NED: 'netherlands',
  NGA: 'nigeria',
  POL: 'poland',
  POR: 'portugal',
  QAT: 'qatar',
  RSA: 'south africa',
  KSA: 'saudi arabia',
  SEN: 'senegal',
  SRB: 'serbia',
  SUI: 'switzerland',
  SWE: 'sweden',
  TUN: 'tunisia',
  TUR: 'turkey',
  UKR: 'ukraine',
  URU: 'uruguay',
  USA: 'usa',
};
const SPORTMONKS_SUPPORTED_LOCALES = new Set(['ar', 'ckb', 'de', 'el', 'es', 'fa', 'fr', 'hu', 'it', 'ja', 'kmr', 'ru', 'ua', 'zh']);
const NEWS_SUPPORTED_LOCALES = new Set(['en', 'es', 'fr', 'ar', 'mn']);
const CHAT_MAX_MESSAGES = 100;
const CHAT_MAX_MESSAGE_LENGTH = 240;
const CHAT_MAX_AUTHOR_LENGTH = 24;
const CHAT_RATE_LIMIT_SECONDS = 5;
const VIEWER_HEARTBEAT_TTL_SECONDS = 75;
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
  if (url.pathname.startsWith('/api/')) {
    await recordMetric(env, 'api_calls');
  }
  const viewerHeartbeatMatch = url.pathname.match(/^\/api\/viewers\/(\d+)\/heartbeat$/);
  if (viewerHeartbeatMatch) {
    return routeViewerHeartbeatRequest(request, env, Number(viewerHeartbeatMatch[1]));
  }
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
    return routeNewsRequest(request, env, ctx);
  }
  if (!url.pathname.startsWith('/api/matches')) {
    return jsonResponse({ error: 'not_found' }, 404, 0);
  }

  if (!env.SPORTMONKS_TOKEN && !env.API_FOOTBALL_KEY) {
    if (url.pathname === '/api/matches') {
      return jsonResponse({ matches: [], total: 0, source: 'not_configured' }, 200, 30);
    }
    return jsonResponse({ error: 'football API token is not configured' }, 503, 30);
  }

  const provider = env.SPORTMONKS_TOKEN ? 'sportmonks' : 'api-football';
  const ttl = resolveCacheTtl(url);
  const cacheKey = new Request(normalizeCacheUrl(url, provider).toString(), request);
  const cache = globalThis.caches?.default;
  const cached = cache ? await cache.match(cacheKey) : null;
  if (cached) {
    await recordMetric(env, 'cache_hits');
    return cached;
  }

  let response;
  if (provider === 'sportmonks') {
    response = await routeSportmonksFootballRequest(url, env, ttl, ctx);
  } else {
    response = await routeApiFootballRequest(url, env, ttl);
  }

  if (cache && response.ok) {
    const cacheable = response.clone();
    if (ctx.waitUntil) ctx.waitUntil(cache.put(cacheKey, cacheable));
    else await cache.put(cacheKey, cacheable);
  }

  return response;
}

async function routeApiFootballRequest(url, env, ttl) {
  const statsMatch = url.pathname.match(/^\/api\/matches\/(\d+)\/stats$/);
  const prematchMatch = url.pathname.match(/^\/api\/matches\/(\d+)\/prematch$/);
  const apiUrl = buildFootballApiUrl(url);
  await recordMetric(env, 'upstream_calls');
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

  if (statsMatch) {
    return jsonResponse(normalizeStatistics(Number(statsMatch[1]), payload.response), 200, ttl);
  }
  if (prematchMatch) {
    return jsonResponse(
      normalizePrematch(Number(prematchMatch[1]), Number(url.searchParams.get('home')), Number(url.searchParams.get('away')), payload.response),
      200,
      ttl,
    );
  }

  const fixtures = Array.isArray(payload.response) ? payload.response : [];
  const streamConfig = await readRuntimeStreamConfig(env);
  const matches = applyMatchOverrides(fixtures.map((fixture) => normalizeFixture(fixture, env, streamConfig)), env, streamConfig);
  const visibleMatches = url.pathname === '/api/matches' ? sortMatches(matches.filter(isTopLeagueMatch)) : matches;
  const responseTtl = visibleMatches.length ? ttl : 30;
  return url.pathname === '/api/matches'
    ? jsonResponse({ matches: visibleMatches, total: visibleMatches.length }, 200, responseTtl)
    : jsonResponse(visibleMatches[0] ?? { error: 'match_not_found' }, visibleMatches[0] ? 200 : 404, ttl);
}

async function routeSportmonksFootballRequest(url, env, ttl, ctx = {}) {
  const statsMatch = url.pathname.match(/^\/api\/matches\/(\d+)\/stats$/);
  const splitDetailMatch = url.pathname.match(/^\/api\/matches\/(\d+)\/(events|lineups|facts|odds)$/);
  if (splitDetailMatch) {
    return routeSportmonksSplitDetailRequest(url, env, ttl, ctx, Number(splitDetailMatch[1]), splitDetailMatch[2]);
  }

  if (statsMatch) {
    const matchId = Number(statsMatch[1]);
    const liveTtl = isLiveStatsRequest(url) ? 30 : 1800;
    const [statisticsPayload, eventsPayload, lineupsPayload, factsPayload, oddsPayload] = await Promise.all([
      fetchCachedSportmonksJson(buildSportmonksFixtureDetailUrl(matchId, url, SPORTMONKS_STATS_INCLUDES), env, liveTtl, ctx),
      fetchCachedSportmonksJson(buildSportmonksFixtureDetailUrl(matchId, url, SPORTMONKS_EVENTS_INCLUDES), env, liveTtl, ctx),
      fetchCachedSportmonksJson(buildSportmonksFixtureDetailUrl(matchId, url, SPORTMONKS_LINEUPS_INCLUDES), env, 1800, ctx),
      fetchCachedSportmonksJson(buildSportmonksMatchFactsUrl(matchId, url), env, 1800, ctx),
      fetchCachedSportmonksJson(buildSportmonksOddsUrl(matchId, url), env, 300, ctx),
    ]);
    if (!statisticsPayload.ok && !eventsPayload.ok && !lineupsPayload.ok) {
      return jsonResponse({ error: 'sportmonks_api_error', status: statisticsPayload.status || eventsPayload.status || lineupsPayload.status }, 502, 30);
    }
    const facts = factsPayload.ok ? sportmonksDataList(factsPayload.body) : [];
    const odds = oddsPayload.ok ? sportmonksDataList(oddsPayload.body) : [];
    return jsonResponse(
      normalizeSportmonksMatchDetails(matchId, statisticsPayload.body?.data || eventsPayload.body?.data || lineupsPayload.body?.data, facts, odds, {
        statistics: statisticsPayload.ok ? statisticsPayload.body?.data : null,
        events: eventsPayload.ok ? eventsPayload.body?.data : null,
        lineups: lineupsPayload.ok ? lineupsPayload.body?.data : null,
      }),
      200,
      ttl,
    );
  }

  const apiUrl = buildSportmonksApiUrl(url);
  const fixturePayload = await fetchSportmonksJson(apiUrl, env);
  if (!fixturePayload.ok) {
    return jsonResponse({ error: 'sportmonks_api_error', status: fixturePayload.status }, 502, 30);
  }

  const streamConfig = await readRuntimeStreamConfig(env);
  const data = fixturePayload.body?.data;
  const fixtures = Array.isArray(data) ? data : data ? [data] : [];
  const matches = await applyDamiAutoStreams(
    applyMatchOverrides(fixtures.map((fixture) => normalizeSportmonksFixture(fixture, env, streamConfig)), env, streamConfig),
    env,
  );
  const visibleMatches = url.pathname === '/api/matches' ? sortMatches(filterSportmonksWorldCupMatches(matches, env)) : matches;
  const responseTtl = visibleMatches.length ? ttl : 30;
  return url.pathname === '/api/matches'
    ? jsonResponse({ matches: visibleMatches, total: visibleMatches.length, source: 'sportmonks' }, 200, responseTtl)
    : jsonResponse(visibleMatches[0] ?? { error: 'match_not_found' }, visibleMatches[0] ? 200 : 404, ttl);
}

async function routeSportmonksSplitDetailRequest(url, env, ttl, ctx, matchId, section) {
  if (section === 'facts') {
    const payload = await fetchCachedSportmonksJson(buildSportmonksMatchFactsUrl(matchId, url), env, ttl, ctx);
    if (!payload.ok) return jsonResponse({ error: 'sportmonks_api_error', status: payload.status }, 502, 30);
    return jsonResponse({ match_id: matchId, facts: normalizeSportmonksFacts(sportmonksDataList(payload.body)) }, 200, ttl);
  }

  if (section === 'odds') {
    const payload = await fetchCachedSportmonksJson(buildSportmonksOddsUrl(matchId, url), env, ttl, ctx);
    if (!payload.ok) return jsonResponse({ error: 'sportmonks_api_error', status: payload.status }, 502, 30);
    return jsonResponse({ match_id: matchId, odds: normalizeSportmonksOdds(sportmonksDataList(payload.body)) }, 200, ttl);
  }

  const include = section === 'lineups' ? SPORTMONKS_LINEUPS_INCLUDES : SPORTMONKS_EVENTS_INCLUDES;
  const payload = await fetchCachedSportmonksJson(buildSportmonksFixtureDetailUrl(matchId, url, include), env, ttl, ctx);
  if (!payload.ok) return jsonResponse({ error: 'sportmonks_api_error', status: payload.status }, 502, 30);
  const fixture = payload.body?.data;
  const teamSideById = sportmonksTeamSideById(fixture);
  if (section === 'lineups') {
    return jsonResponse({ match_id: matchId, lineups: normalizeSportmonksLineups(matchId, fixture?.lineups, teamSideById) }, 200, ttl);
  }
  return jsonResponse({ match_id: matchId, events: normalizeSportmonksEvents(matchId, fixture?.events, teamSideById) }, 200, ttl);
}

async function fetchSportmonksJson(apiUrl, env = {}) {
  const url = new URL(apiUrl);
  url.searchParams.set('api_token', env.SPORTMONKS_TOKEN);
  await recordMetric(env, 'upstream_calls');
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) return { ok: false, status: response.status, body: null };
  const body = await response.json();
  if (body?.errors || (body?.message && !('data' in body))) return { ok: false, status: 422, body };
  await recordMetric(env, 'last_sportmonks_update', new Date().toISOString());
  return { ok: true, status: response.status, body };
}

async function fetchCachedSportmonksJson(apiUrl, env = {}, ttl = 0, ctx = {}) {
  const cache = globalThis.caches?.default;
  const cacheKey = cache && ttl > 0 ? new Request(normalizeSportmonksSubrequestCacheUrl(apiUrl).toString()) : null;
  if (cacheKey) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      await recordMetric(env, 'cache_hits');
      try {
        return await cached.json();
      } catch {}
    }
  }

  const payload = await fetchSportmonksJson(apiUrl, env);
  if (cache && cacheKey && payload.ok) {
    const cacheable = jsonResponse(payload, 200, ttl);
    if (ctx.waitUntil) ctx.waitUntil(cache.put(cacheKey, cacheable));
    else await cache.put(cacheKey, cacheable);
  }
  return payload;
}

async function routeNewsRequest(request, env = {}, ctx = {}) {
  const url = new URL(request.url);
  const newsLang = resolveNewsLanguage(url.searchParams.get('lang'));
  const ttl = resolveCacheTtl(url);
  const cacheKey = new Request(normalizeCacheUrl(url).toString(), request);
  const cache = globalThis.caches?.default;
  const cached = cache ? await cache.match(cacheKey) : null;
  if (cached) return cached;

  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 6, 1), 12);
  if (env?.SPORTMONKS_TOKEN) {
    const sportmonksNews = await fetchSportmonksNews(newsLang, env, limit);
    if (sportmonksNews.ok && sportmonksNews.news.length) {
      const body = {
        source: 'Sportmonks Football News',
        feed_url: sportmonksNews.feed_url,
        lang: newsLang,
        news: sportmonksNews.news,
      };
      const newsResponse = jsonResponse(body, 200, ttl);
      if (cache && newsResponse.ok) {
        const cacheable = newsResponse.clone();
        if (ctx.waitUntil) ctx.waitUntil(cache.put(cacheKey, cacheable));
        else await cache.put(cacheKey, cacheable);
      }
      return newsResponse;
    }
  }

  const feed = await fetchNewsFeed(newsLang);
  if (!feed.ok) {
    return jsonResponse({ error: 'news_feed_error', status: feed.status, news: [] }, 502, 60);
  }

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
  const newsTtl = news.length ? ttl : 60;
  const newsResponse = jsonResponse(body, 200, newsTtl);

  if (cache && newsResponse.ok && news.length) {
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

  if (url.pathname === '/api/admin/monitoring') {
    if (request.method === 'GET') return routeAdminMonitoring(env);
    return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
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

async function routeViewerHeartbeatRequest(request, env = {}, matchId) {
  if (request.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
  if (!Number.isFinite(matchId) || matchId <= 0) return jsonResponse({ error: 'invalid_match_id' }, 400, 0);
  if (!env.STREAM_CONFIG_KV?.put) return jsonResponse({ error: 'viewer_kv_not_configured' }, 503, 0);

  const body = await readJsonBody(request);
  const clientId = safeKeyPart(body?.client_id || viewerFingerprint(request));
  const page = safeKeyPart(body?.page || 'player');
  const now = Date.now();
  const record = {
    match_id: matchId,
    client_id: clientId,
    page,
    updated_at: new Date(now).toISOString(),
    updated_at_ms: now,
    expires_at_ms: now + VIEWER_HEARTBEAT_TTL_SECONDS * 1000,
  };
  await env.STREAM_CONFIG_KV.put(viewerKey(matchId, clientId), JSON.stringify(record), {
    expirationTtl: VIEWER_HEARTBEAT_TTL_SECONDS,
  });
  const viewers = await countActiveViewers(env, matchId, now);
  return jsonResponse({ ok: true, match_id: matchId, viewers, ttl: VIEWER_HEARTBEAT_TTL_SECONDS }, 200, 0);
}

async function routeAdminMonitoring(env = {}) {
  const config = await readRuntimeStreamConfig(env);
  const streams = flattenStreamConfig(config).filter((stream) => isStreamActiveNow(stream));
  const byMatch = {};
  streams.forEach((stream) => {
    const key = String(stream.match_id);
    if (!byMatch[key]) byMatch[key] = 0;
    byMatch[key] += 1;
  });
  const activeViewers = await readActiveViewerSnapshot(env);
  const metrics = await readTodayMetrics(env);
  return jsonResponse(
    {
      generated_at: new Date().toISOString(),
      active_streams: {
        total: streams.length,
        by_match: byMatch,
        streams,
      },
      active_viewers: activeViewers,
      metrics,
    },
    200,
    0,
  );
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
    config = readStreamConfig(raw || env.MATCH_STREAMS_JSON);
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

function viewerFingerprint(request) {
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0] ||
    'unknown';
  const ua = request.headers.get('User-Agent') || '';
  return `${ip}:${ua}`;
}

function viewerKey(matchId, clientId) {
  return `viewer:${matchId}:${safeKeyPart(clientId)}`;
}

async function countActiveViewers(env = {}, matchId, now = Date.now()) {
  const snapshot = await readActiveViewerSnapshot(env, now, `viewer:${matchId}:`);
  return snapshot.by_match[String(matchId)] || 0;
}

async function readActiveViewerSnapshot(env = {}, now = Date.now(), prefix = 'viewer:') {
  const byMatchSets = new Map();
  const expiredKeys = [];
  const keys = await listKvKeys(env, prefix);
  await Promise.all(keys.map(async (key) => {
    const raw = await env.STREAM_CONFIG_KV?.get?.(key);
    if (!raw) return;
    let record;
    try {
      record = JSON.parse(raw);
    } catch {
      expiredKeys.push(key);
      return;
    }
    const expiresAt = Number(record.expires_at_ms) || 0;
    if (expiresAt && expiresAt <= now) {
      expiredKeys.push(key);
      return;
    }
    const matchId = String(record.match_id || key.split(':')[1] || '');
    if (!matchId) return;
    if (!byMatchSets.has(matchId)) byMatchSets.set(matchId, new Set());
    byMatchSets.get(matchId).add(String(record.client_id || key));
  }));
  await Promise.all(expiredKeys.map((key) => env.STREAM_CONFIG_KV?.delete?.(key)));

  const byMatch = {};
  let total = 0;
  byMatchSets.forEach((viewers, matchId) => {
    byMatch[matchId] = viewers.size;
    total += viewers.size;
  });
  return { total, by_match: byMatch };
}

async function listKvKeys(env = {}, prefix = '') {
  if (!env.STREAM_CONFIG_KV?.list) return [];
  const keys = [];
  let cursor;
  do {
    const page = await env.STREAM_CONFIG_KV.list({ prefix, cursor });
    keys.push(...(Array.isArray(page?.keys) ? page.keys.map((item) => item.name).filter(Boolean) : []));
    cursor = page?.cursor;
    if (page?.list_complete !== false) break;
  } while (cursor);
  return keys;
}

async function recordMetric(env = {}, key, value = 1) {
  if (!env.STREAM_CONFIG_KV?.get || !env.STREAM_CONFIG_KV?.put) return false;
  try {
    const metricsKey = todayMetricsKey();
    const current = await readTodayMetrics(env);
    if (typeof value === 'number') current[key] = Number(current[key] || 0) + value;
    else current[key] = value;
    await env.STREAM_CONFIG_KV.put(metricsKey, JSON.stringify(current), { expirationTtl: 3 * 24 * 60 * 60 });
    return true;
  } catch {
    return false;
  }
}

async function readTodayMetrics(env = {}) {
  const defaults = {
    api_calls: 0,
    cache_hits: 0,
    upstream_calls: 0,
    last_sportmonks_update: '',
  };
  if (!env.STREAM_CONFIG_KV?.get) return defaults;
  try {
    const raw = await env.STREAM_CONFIG_KV.get(todayMetricsKey());
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...defaults, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return defaults;
  }
}

function todayMetricsKey() {
  return `metrics:${new Date().toISOString().slice(0, 10)}`;
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
  if (GOOGLE_NEWS_FEEDS[newsLang]) {
    const response = await fetchFeedUrl(GOOGLE_NEWS_FEEDS[newsLang]);
    return {
      ...response,
      source: 'Google News Football',
      itemSource: 'Google News',
      url: GOOGLE_NEWS_FEEDS[newsLang],
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

async function fetchSportmonksNews(lang, env = {}, limit = 6) {
  const requested = Math.min(Math.max(limit * 2, 6), 50);
  const urls = [
    buildSportmonksNewsUrl('post', lang, env, false, requested),
    buildSportmonksNewsUrl('pre', lang, env, false, requested),
  ];
  const payloads = await Promise.all(urls.map((url, index) => fetchSportmonksNewsWithAlias(url, index === 0 ? 'post' : 'pre', lang, env, requested)));
  const okPayloads = payloads.filter((payload) => payload.ok);
  if (!okPayloads.length) return { ok: false, status: payloads[0]?.status || 502, news: [], feed_url: '' };
  const news = dedupeNews(okPayloads.flatMap((payload) => normalizeSportmonksNews(payload.body, payload.type))).slice(0, limit);
  return {
    ok: true,
    status: 200,
    news,
    feed_url: urls.map((url) => normalizeSportmonksSubrequestCacheUrl(url).toString()).join(','),
  };
}

async function fetchSportmonksNewsWithAlias(url, type, lang, env, limit) {
  const primary = await fetchSportmonksJson(url, env);
  if (primary.ok) return { ...primary, type };
  const alias = await fetchSportmonksJson(buildSportmonksNewsUrl(type, lang, env, true, limit), env);
  return { ...alias, type };
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

export function buildSportmonksApiUrl(siteUrl) {
  const statsMatch = siteUrl.pathname.match(/^\/api\/matches\/(\d+)\/stats$/)?.[1];
  const matchId = siteUrl.pathname.match(/^\/api\/matches\/(\d+)$/)?.[1];
  const status = siteUrl.searchParams.get('status') || '';
  const date = siteUrl.searchParams.get('date') || '';

  let apiUrl;
  if (statsMatch) {
    apiUrl = new URL(`${SPORTMONKS_API_BASE}/fixtures/${statsMatch}`);
    apiUrl.searchParams.set('include', SPORTMONKS_DETAIL_INCLUDES);
    applySportmonksLocale(apiUrl, siteUrl);
    return apiUrl;
  }

  if (matchId) {
    apiUrl = new URL(`${SPORTMONKS_API_BASE}/fixtures/${matchId}`);
    apiUrl.searchParams.set('include', SPORTMONKS_MATCH_INCLUDES);
    applySportmonksLocale(apiUrl, siteUrl);
    return apiUrl;
  }

  if (status === 'live' || status === 'half_time') {
    apiUrl = new URL(`${SPORTMONKS_API_BASE}/livescores/inplay`);
  } else {
    apiUrl = new URL(`${SPORTMONKS_API_BASE}/fixtures/date/${date || todayDate()}`);
  }
  apiUrl.searchParams.set('include', SPORTMONKS_MATCH_INCLUDES);
  applySportmonksLocale(apiUrl, siteUrl);
  return apiUrl;
}

function buildSportmonksMatchFactsUrl(matchId, siteUrl = null) {
  const url = new URL(`${SPORTMONKS_API_BASE}/match-facts/${matchId}`);
  url.searchParams.set('include', 'type');
  if (siteUrl) applySportmonksLocale(url, siteUrl);
  return url;
}

function buildSportmonksFixtureDetailUrl(matchId, siteUrl = null, include = SPORTMONKS_DETAIL_INCLUDES) {
  const url = new URL(`${SPORTMONKS_API_BASE}/fixtures/${matchId}`);
  url.searchParams.set('include', include);
  if (siteUrl) applySportmonksLocale(url, siteUrl);
  return url;
}

function buildSportmonksOddsUrl(matchId, siteUrl = null) {
  const url = new URL(`${SPORTMONKS_API_BASE}/odds/pre-match/fixtures/${matchId}`);
  url.searchParams.set('include', 'bookmaker;market');
  if (siteUrl) applySportmonksLocale(url, siteUrl);
  return url;
}

function buildSportmonksNewsUrl(type, lang, env = {}, alias = false, limit = 12) {
  const slug = type === 'post' ? (alias ? 'postmatch' : 'post-match') : (alias ? 'prematch' : 'pre-match');
  const url = new URL(`${SPORTMONKS_API_BASE}/news/${slug}`);
  url.searchParams.set('include', SPORTMONKS_NEWS_INCLUDES);
  url.searchParams.set('order', 'desc');
  url.searchParams.set('per_page', String(Math.min(Math.max(limit, 1), 50)));
  const locale = resolveSportmonksLocale({ searchParams: new URLSearchParams({ lang }) });
  if (locale) url.searchParams.set('locale', locale);
  const leagueIds = sportmonksConfiguredLeagueIds(env);
  if (leagueIds.length) url.searchParams.set('filters', `newsitemLeagues:${leagueIds.join(',')}`);
  return url;
}

function applySportmonksLocale(apiUrl, siteUrl) {
  const locale = resolveSportmonksLocale(siteUrl);
  if (locale) apiUrl.searchParams.set('locale', locale);
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

export function normalizeSportmonksFixture(item, env = {}, streamConfig = null) {
  const participants = Array.isArray(item?.participants) ? item.participants : [];
  const homeTeam = participants.find((team) => team?.meta?.location === 'home') || participants[0] || {};
  const awayTeam = participants.find((team) => team?.meta?.location === 'away') || participants[1] || {};
  const league = item?.league ?? {};
  const stage = item?.stage ?? {};
  const venue = item?.venue ?? {};
  const scores = extractSportmonksScore(item?.scores);

  return applyMatchOverride({
    id: item?.id,
    external_id: item?.id,
    league: {
      id: league.id,
      name: league.name || 'Football',
      country: league.country?.name || league.country || '',
    },
    stage: stage.name || item?.round?.name || league.name || 'Football',
    venue: venue.name || '',
    city: venue.city_name || venue.city || '',
    scheduled_at: normalizeSportmonksDate(item?.starting_at),
    status: normalizeSportmonksStatus(item?.state),
    home_score: scores.home,
    away_score: scores.away,
    minute: extractSportmonksMinute(item),
    home_team: normalizeSportmonksTeam(homeTeam),
    away_team: normalizeSportmonksTeam(awayTeam),
    streams: streamsForMatch(item?.id, env, streamConfig),
  }, env, streamConfig);
}

export function normalizeSportmonksMatchDetails(matchId, fixture = {}, facts = [], odds = [], detailFixtures = {}) {
  const statisticsFixture = detailFixtures.statistics || fixture;
  const eventsFixture = detailFixtures.events || fixture;
  const lineupsFixture = detailFixtures.lineups || fixture;
  const participantFixture = [fixture, statisticsFixture, eventsFixture, lineupsFixture].find((item) => Array.isArray(item?.participants) && item.participants.length) || {};
  const scoreFixture = [fixture, statisticsFixture, eventsFixture, lineupsFixture].find((item) => Array.isArray(item?.scores) && item.scores.length) || {};
  const participants = Array.isArray(participantFixture?.participants) ? participantFixture.participants : [];
  const homeTeam = participants.find((team) => team?.meta?.location === 'home') || participants[0] || {};
  const awayTeam = participants.find((team) => team?.meta?.location === 'away') || participants[1] || {};
  const teamSideById = sportmonksTeamSideById(participantFixture);
  const scoreFromEvents = extractSportmonksScoreFromEvents(eventsFixture?.events);
  const scores = scoreFromEvents || extractSportmonksScore(scoreFixture?.scores);

  const events = normalizeSportmonksEvents(matchId, eventsFixture?.events, teamSideById);
  const lineups = normalizeSportmonksLineups(matchId, lineupsFixture?.lineups, teamSideById);
  const teamStats = normalizeSportmonksTeamStatistics(statisticsFixture?.statistics, teamSideById, { homeTeam, awayTeam });

  return {
    match_id: matchId,
    home_score: scores.home,
    away_score: scores.away,
    events,
    lineups,
    h2h: emptyH2H(),
    home_form: [],
    away_form: [],
    team_stats: teamStats,
    facts: normalizeSportmonksFacts(facts),
    odds: normalizeSportmonksOdds(odds),
  };
}

function sportmonksTeamSideById(fixture = {}) {
  const participants = Array.isArray(fixture?.participants) ? fixture.participants : [];
  const homeTeam = participants.find((team) => team?.meta?.location === 'home') || participants[0] || {};
  const awayTeam = participants.find((team) => team?.meta?.location === 'away') || participants[1] || {};
  return new Map([
    [Number(homeTeam.id), 'home'],
    [Number(awayTeam.id), 'away'],
  ]);
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

async function applyDamiAutoStreams(matches = [], env = {}) {
  if (env.DAMI_AUTO_STREAMS === 'false') return matches;
  if (!Array.isArray(matches) || !matches.length) return matches;
  let damiStreams = [];
  try {
    damiStreams = await fetchDamiStreams();
  } catch {
    return matches;
  }
  if (!damiStreams.length) return matches;
  return matches.map((match) => {
    if (match?.status === 'finished') return match;
    const manualStreams = Array.isArray(match?.streams) ? match.streams : [];
    const autoStreams = damiStreamsForMatch(match, damiStreams, env);
    const mergedStreams = mergeStreamsByLanguageAndUrl(manualStreams, autoStreams);
    return mergedStreams.length ? { ...match, streams: mergedStreams } : match;
  });
}

async function fetchDamiStreams() {
  const response = await fetch(DAMI_STREAMS_API_URL, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'KingLive/1.0 (+https://kinglive.live)',
    },
  });
  if (!response.ok) return [];
  const payload = await response.json();
  const categories = Array.isArray(payload?.streams) ? payload.streams : [];
  return categories.flatMap((category) => Array.isArray(category?.streams) ? category.streams : []);
}

function damiStreamsForMatch(match = {}, damiStreams = [], env = {}) {
  const damiMatch = damiStreams.find((stream) => isDamiMatchForFixture(stream, match));
  if (!damiMatch) return [];
  const streams = [];
  const sources = Array.isArray(damiMatch.sources) ? damiMatch.sources : [];
  sources.forEach((source, index) => {
    const url = String(source?.embed || '').trim();
    const channel = damiChannelFromUrl(url);
    if (!channel) return;
    const language = damiLanguageForSource(source, channel, env);
    if (!language) return;
    streams.push({
      id: hashToPositiveInt(`${match.id}:dami:${language}:${channel}`),
      url,
      source_type: 'iframe',
      label: damiLanguageLabel(language),
      language_code: language,
      region: 'global',
      quality: '720p',
      priority: 90 - index,
      commentary_type: 'full',
      is_active: true,
      starts_at: null,
      ends_at: null,
    });
  });
  parseDamiExtraLanguageChannels(env.DAMI_EXTRA_LANGUAGE_CHANNELS).forEach((extra, index) => {
    const url = damiEmbedUrlForChannel(damiMatch, extra.channel);
    if (!url || streams.some((stream) => stream.url === url)) return;
    streams.push({
      id: hashToPositiveInt(`${match.id}:dami:${extra.language}:${extra.channel}`),
      url,
      source_type: 'iframe',
      label: damiLanguageLabel(extra.language),
      language_code: extra.language,
      region: 'global',
      quality: '720p',
      priority: 80 - index,
      commentary_type: 'full',
      is_active: true,
      starts_at: null,
      ends_at: null,
    });
  });
  if (!streams.length && damiMatch.iframe) {
    streams.push({
      id: hashToPositiveInt(`${match.id}:dami:iframe`),
      url: String(damiMatch.iframe),
      source_type: 'iframe',
      label: 'DAMI stream',
      language_code: 'en',
      region: 'global',
      quality: '720p',
      priority: 50,
      commentary_type: 'full',
      is_active: true,
      starts_at: null,
      ends_at: null,
    });
  }
  return streams;
}

function damiEmbedUrlForChannel(damiMatch = {}, channel = '') {
  if (!/^\d+$/.test(String(channel || ''))) return '';
  const base = String(damiMatch.embed || damiMatch.iframe || '').trim();
  if (!base) return '';
  try {
    const url = new URL(base);
    url.searchParams.set('ch', String(channel));
    return url.toString();
  } catch {
    return '';
  }
}

function isDamiMatchForFixture(damiStream = {}, match = {}) {
  const home = normalizeMatchToken(teamNameForDami(match.home_team));
  const away = normalizeMatchToken(teamNameForDami(match.away_team));
  const haystack = normalizeMatchToken([
    damiStream.name,
    damiStream.id,
    damiStream.teams?.home?.name,
    damiStream.teams?.away?.name,
  ].filter(Boolean).join(' '));
  return Boolean(home && away && haystack.includes(home) && haystack.includes(away));
}

function teamNameForDami(team = {}) {
  const code = String(team?.code || '').trim().toUpperCase();
  return DAMI_TEAM_CODE_ALIASES[code] || team?.name_en || team?.name || code || '';
}

function normalizeMatchToken(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\brepublic\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function damiChannelFromUrl(url = '') {
  try {
    const parsed = new URL(url);
    const channel = parsed.searchParams.get('ch') || parsed.searchParams.get('channel');
    return /^\d+$/.test(channel || '') ? channel : '';
  } catch {
    return '';
  }
}

function damiLanguageForSource(source = {}, channel = '', env = {}) {
  const configured = parseDamiLanguageChannels(env.DAMI_LANGUAGE_CHANNELS);
  if (configured[channel]) return configured[channel];
  const name = String(source.name || source.channelName || source.label || '').toLowerCase();
  if (/(arab|arabic|عرب|bein|ssc|alkass|الكاس)/i.test(name) || ['966', '967'].includes(channel)) return 'ar';
  if (/(spanish|espanol|español|tudn|azteca|univision|telemundo)/i.test(name) || ['935', '844'].includes(channel)) return 'es';
  if (/(english|uk|usa|fox|itv|tsn|rte)/i.test(name) || ['350', '54', '39', '111', '113', '114', '365'].includes(channel)) return 'en';
  return '';
}

function parseDamiLanguageChannels(raw = '') {
  return String(raw || '').split(',').reduce((map, item) => {
    const [language, channel] = item.split(':').map((part) => String(part || '').trim().toLowerCase());
    if (language && /^\d+$/.test(channel || '')) map[channel] = language;
    return map;
  }, {});
}

function parseDamiExtraLanguageChannels(raw = '') {
  return String(raw || '').split(',').reduce((items, item) => {
    const [language, channel] = item.split(':').map((part) => String(part || '').trim().toLowerCase());
    if (language && /^\d+$/.test(channel || '')) items.push({ language, channel });
    return items;
  }, []);
}

function damiLanguageLabel(language = '') {
  const labels = {
    ar: 'Arabic stream',
    en: 'English stream',
    es: 'Spanish stream',
    fr: 'French stream',
    mn: 'Mongolian stream',
  };
  return labels[language] || 'DAMI stream';
}

function mergeStreamsByLanguageAndUrl(manualStreams = [], autoStreams = []) {
  const seen = new Set();
  return [...manualStreams, ...autoStreams].filter((stream) => {
    const key = `${stream.language_code || ''}:${stream.url || ''}`;
    if (!stream?.url || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  const teamStats = teams.map((item) => ({
    team: {
      id: item.team?.id,
      name: item.team?.name || 'TBD',
      logo: item.team?.logo || '',
    },
    stats: normalizeTeamStats(item.statistics),
  }));
  return {
    match_id: matchId,
    events: [],
    lineups: [],
    h2h: emptyH2H(),
    home_form: [],
    away_form: [],
    team_stats: teamStats,
    teams: teamStats,
    facts: [],
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

function normalizeSportmonksNews(payload = {}, fallbackType = 'prematch') {
  return sportmonksDataList(payload)
    .map((item, index) => {
      const lines = sportmonksNewsLines(item);
      const fullText = lines.join('\n\n').trim();
      const summary = cleanSentence(item.summary || item.description || lines[0] || item.title || '');
      const type = String(item.type || fallbackType || '').trim();
      return {
        id: String(item.id || item.uuid || `${type || 'news'}-${item.fixture_id || index}`),
        title: cleanSentence(item.title || item.name || 'Football news'),
        summary,
        full_text: fullText || summary,
        has_full_text: Boolean(fullText),
        url: String(item.url || item.link || ''),
        published_at: item.published_at || item.updated_at || item.created_at || '',
        image_url: normalizeNewsImageUrl(sportmonksNewsImage(item)),
        source: 'Sportmonks',
        fixture_id: Number(item.fixture_id || item.fixture?.id) || null,
        league_id: Number(item.league_id || item.league?.id) || null,
        type,
      };
    })
    .filter((item) => item.title && item.title !== 'Football news');
}

function sportmonksNewsLines(item = {}) {
  const rawLines = Array.isArray(item.lines) ? item.lines : [];
  const lines = rawLines
    .map((line) => cleanSentence(line.text || line.line || line.value || line.content || line.title || ''))
    .filter(Boolean);
  if (lines.length) return lines;
  const body = item.body || item.content || item.article || item.preview || item.description || '';
  if (!body) return [];
  return htmlToStoryText(String(body)).split(/\n{2,}/).map(cleanSentence).filter(Boolean);
}

function sportmonksNewsImage(item = {}) {
  return (
    item.image_url ||
    item.image_path ||
    item.image ||
    item.league?.image_path ||
    item.fixture?.league?.image_path ||
    item.fixture?.participants?.find?.((participant) => participant?.image_path)?.image_path ||
    ''
  );
}

function dedupeNews(items = []) {
  const seen = new Set();
  const unique = [];
  items.forEach((item) => {
    const titleKey = `title:${String(item.title || '').toLowerCase().replace(/\s+/g, ' ').trim()}`;
    const fixtureTitleKey = `${titleKey}:${item.fixture_id || ''}`;
    const urlKey = item.url ? `url:${String(item.url).toLowerCase().trim()}` : '';
    const idKey = item.id ? `id:${item.id}` : '';
    if ((idKey && seen.has(idKey)) || (urlKey && seen.has(urlKey)) || (fixtureTitleKey && seen.has(fixtureTitleKey))) return;
    if (idKey) seen.add(idKey);
    if (urlKey) seen.add(urlKey);
    if (fixtureTitleKey) seen.add(fixtureTitleKey);
    unique.push(item);
  });
  return unique.sort((a, b) => {
    const dateDelta = Date.parse(b.published_at || '') - Date.parse(a.published_at || '');
    if (Number.isFinite(dateDelta) && dateDelta !== 0) return dateDelta;
    return Number(b.id) - Number(a.id);
  });
}

function cleanSentence(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
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

function normalizeSportmonksEvents(matchId, events = [], teamSideById = new Map()) {
  if (!Array.isArray(events)) return [];
  return events
    .map((event, index) => {
      const type = normalizeSportmonksEventType(event?.type?.code || event?.type?.name || event?.type);
      if (!type) return null;
      const participantId = Number(event.participant_id ?? event.team_id);
      const detailParts = [
        event.info,
        event.related_player_name ? `Assist: ${event.related_player_name}` : '',
        event.result ? `Score: ${event.result}` : '',
      ].filter(Boolean);
      return {
        id: Number(event.id) || hashToPositiveInt(`${matchId}:event:${index}`),
        match_id: Number(event.fixture_id) || matchId,
        minute: Number(event.minute) || 0,
        extra_minute: Number.isFinite(Number(event.extra_minute)) ? Number(event.extra_minute) : null,
        type,
        team: teamSideById.get(participantId) || 'home',
        player_name: event.player_name || event.player?.display_name || event.player?.name || '',
        detail: detailParts.join(' | '),
        sort_order: Number.isFinite(Number(event.sort_order)) ? Number(event.sort_order) : index,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
}

function normalizeSportmonksLineups(matchId, lineups = [], teamSideById = new Map()) {
  if (!Array.isArray(lineups)) return [];
  return lineups.map((lineup, index) => {
    const participantId = Number(lineup.participant_id ?? lineup.team_id);
    return {
      id: Number(lineup.id) || hashToPositiveInt(`${matchId}:lineup:${index}`),
      match_id: matchId,
      team: teamSideById.get(participantId) || 'home',
      player_name: lineup.player?.display_name || lineup.player?.name || lineup.player_name || '',
      image_url: lineup.player?.image_path || '',
      number: Number(lineup.jersey_number ?? lineup.number) || 0,
      position: normalizeSportmonksPosition(lineup),
      formation_position: Number(lineup.formation_position) || null,
      is_starter: lineup.type_id !== 12 && String(lineup.type?.developer_name || lineup.type?.name || '').toLowerCase() !== 'bench',
    };
  });
}

function normalizeSportmonksTeamStatistics(statistics = [], teamSideById = new Map(), teams = {}) {
  const bySide = {
    home: {
      team: sportmonksStatsTeam(teams.homeTeam),
      stats: emptyTeamStats(),
    },
    away: {
      team: sportmonksStatsTeam(teams.awayTeam),
      stats: emptyTeamStats(),
    },
  };
  if (!Array.isArray(statistics)) return Object.values(bySide);

  statistics.forEach((stat) => {
    const side = teamSideById.get(Number(stat.participant_id ?? stat.team_id));
    if (!side || !bySide[side]) return;
    const key = normalizeSportmonksStatKey(stat.type?.name || stat.type?.code || stat.type);
    if (!key) return;
    bySide[side].stats[key] = sportmonksStatValue(stat);
  });

  return [bySide.home, bySide.away];
}

function normalizeSportmonksFacts(facts = []) {
  return sportmonksDataList({ data: facts })
    .map((fact, index) => {
      const text = normalizeSportmonksFactText(fact);
      if (!text) return null;
      return {
        id: Number(fact.id) || hashToPositiveInt(`fact:${index}:${text}`),
        title: String(fact.type?.name || fact.type?.code || 'Fact').trim(),
        text,
      };
    })
    .filter(Boolean);
}

function normalizeSportmonksFactText(fact = {}) {
  const direct = String(fact.natural_language || fact.name || fact.value || fact.fact || fact.description || '').trim();
  if (direct) return direct;
  const type = String(fact.type?.developer_name || fact.type?.code || fact.type?.name || '').toLowerCase();
  const participant = String(fact.participant || '').trim();
  const scope = String(fact.scope || '').replace(/_/g, ' ');
  const data = fact.data && typeof fact.data === 'object' ? fact.data : {};

  if (type.includes('total_h2h_matches') || type.includes('total-h2h-matches')) {
    const count = Number(data.count) || 0;
    return `Head-to-head sample: ${count} match${count === 1 ? '' : 'es'}${scope ? ` (${scope})` : ''}`;
  }

  if (type.includes('historic_outcomes') || type.includes('historic-outcomes')) {
    const outcomes = Object.entries(data).map(([score, count]) => `${score} x${count}`).join(', ');
    return outcomes ? `Historic outcomes: ${outcomes}${scope ? ` (${scope})` : ''}` : '';
  }

  if (type.includes('goals_conceded') || type.includes('goals-conceded')) {
    const average = data.all?.average ?? data.average;
    const count = data.all?.count ?? data.count;
    if (average == null && count == null) return '';
    return `${participantLabel(participant)} goals conceded: ${average ?? count} avg${scope ? ` (${scope})` : ''}`;
  }

  if (type.includes('first_to_score') || type.includes('first-to-score')) {
    const streak = data.streak ?? data.matches ?? data.count;
    if (streak == null) return '';
    return `${participantLabel(participant)} first-to-score trend: ${streak} match${Number(streak) === 1 ? '' : 'es'}${scope ? ` (${scope})` : ''}`;
  }

  if (type.includes('win_streak') || type.includes('unbeaten_streak') || type.includes('draw_streak')) {
    const streak = data.streak ?? data.matches ?? data.count;
    if (streak == null) return '';
    return `${participantLabel(participant)} ${String(fact.type?.name || 'streak').replace(/^Match Facts?\s*/i, '')}: ${streak}${scope ? ` (${scope})` : ''}`;
  }

  const summary = Object.entries(data)
    .filter(([, value]) => value == null || typeof value !== 'object')
    .map(([key, value]) => `${String(key).replace(/_/g, ' ')} ${value}`)
    .join(', ');
  return summary ? `${participantLabel(participant)} ${summary}${scope ? ` (${scope})` : ''}` : '';
}

function participantLabel(participant = '') {
  if (participant === 'home') return 'Home';
  if (participant === 'away') return 'Away';
  if (participant === 'both') return 'Both teams';
  return 'Team';
}

function normalizeSportmonksOdds(odds = []) {
  const rows = sportmonksDataList({ data: odds }).filter((odd) => {
    const bookmaker = String(odd.bookmaker?.name || '').trim().toLowerCase();
    const market = String(odd.market?.developer_name || odd.market?.name || odd.market_description || '').trim().toLowerCase();
    return bookmaker === 'melbet' && ['fulltime_result', 'fulltime result', 'goal_line', 'goal line', 'asian_handicap', 'asian handicap'].includes(market);
  });

  if (!rows.length) return null;

  const fulltime = { home: null, draw: null, away: null };
  const goalLine = { over: null, under: null };
  const handicap = { home: null, away: null };
  let latestUpdatedAt = '';
  rows.forEach((odd) => {
    const market = String(odd.market?.developer_name || odd.market?.name || odd.market_description || '').trim().toLowerCase();
    const oddValue = normalizedOddValue(odd);
    if (!oddValue) return;
    if (market === 'fulltime_result' || market === 'fulltime result') {
      const key = normalizeFulltimeOutcome(odd);
      if (key && !fulltime[key]) fulltime[key] = oddValue;
    } else if (market === 'goal_line' || market === 'goal line') {
      const key = normalizeGoalLineOutcome(odd);
      if (key && !goalLine[key]) goalLine[key] = oddValue;
    } else if (market === 'asian_handicap' || market === 'asian handicap') {
      const key = normalizeHandicapOutcome(odd);
      if (key && !handicap[key]) handicap[key] = oddValue;
    }
    latestUpdatedAt = latestSportmonksTimestamp(latestUpdatedAt, odd.latest_bookmaker_update || odd.updated_at || odd.created_at || '');
  });

  const markets = [];
  if (fulltime.home && fulltime.draw && fulltime.away) {
    markets.push({ key: 'fulltime', label: 'Fulltime Result', outcomes: fulltime });
  }
  if (goalLine.over && goalLine.under) {
    markets.push({ key: 'total_goals', label: `Total ${goalLine.over.total || goalLine.under.total || ''}`.trim(), outcomes: goalLine });
  }
  if (handicap.home && handicap.away) {
    markets.push({ key: 'asian_handicap', label: 'Asian Handicap', outcomes: handicap });
  }
  if (!markets.length) return null;
  return {
    bookmaker: 'MelBet',
    market: markets[0].label,
    updated_at: latestUpdatedAt,
    outcomes: markets[0].outcomes,
    markets,
  };
}

function normalizedOddValue(odd = {}) {
  return {
    label: String(odd.label || odd.name || '').trim(),
    value: String(odd.value || odd.dp3 || '').trim(),
    probability: String(odd.probability || '').trim(),
    total: odd.total == null ? '' : String(odd.total).trim(),
    handicap: odd.handicap == null ? '' : String(odd.handicap).trim(),
  };
}

function normalizeFulltimeOutcome(odd = {}) {
  const value = String(odd.label || odd.name || '').trim().toLowerCase();
  if (value === 'home' || value === '1') return 'home';
  if (value === 'draw' || value === 'x') return 'draw';
  if (value === 'away' || value === '2') return 'away';
  return '';
}

function normalizeGoalLineOutcome(odd = {}) {
  const value = String(odd.label || odd.name || '').trim().toLowerCase();
  if (value === 'over') return 'over';
  if (value === 'under') return 'under';
  return '';
}

function normalizeHandicapOutcome(odd = {}) {
  return normalizeFulltimeOutcome(odd);
}

function latestSportmonksTimestamp(current = '', next = '') {
  if (!current) return String(next || '');
  if (!next) return current;
  return Date.parse(next) > Date.parse(current) ? String(next) : current;
}

function sportmonksDataList(payload = {}) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.data)) return payload.data.data;
  return [];
}

function normalizeSportmonksEventType(value = '') {
  const type = String(value).toLowerCase().replace(/[_\s-]+/g, '');
  if (type.includes('owngoal')) return 'own_goal';
  if (type.includes('goal')) return 'goal';
  if (type.includes('yellowred') || type.includes('redcard')) return 'red_card';
  if (type.includes('yellowcard')) return 'yellow_card';
  if (type.includes('substitution')) return 'substitution';
  return '';
}

function normalizeSportmonksStatKey(value = '') {
  const key = String(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (key === 'ballpossession' || key === 'possession') return 'possession';
  if (key === 'shotsongoal' || key === 'shotsontarget') return 'shots_on_goal';
  if (key === 'totalshots' || key === 'shots') return 'total_shots';
  if (key === 'cornerkicks' || key === 'corners') return 'corners';
  if (key === 'fouls') return 'fouls';
  if (key === 'yellowcards') return 'yellow_cards';
  if (key === 'redcards') return 'red_cards';
  return '';
}

function sportmonksStatValue(stat = {}) {
  const raw = stat.data?.value ?? stat.value ?? stat.data;
  if (typeof raw === 'number') return raw;
  const numeric = Number(String(raw || '').replace('%', ''));
  return Number.isFinite(numeric) ? numeric : raw ?? null;
}

function emptyTeamStats() {
  return {
    possession: null,
    shots_on_goal: null,
    total_shots: null,
    corners: null,
    fouls: null,
    yellow_cards: null,
    red_cards: null,
  };
}

function emptyH2H() {
  return {
    home_wins: 0,
    away_wins: 0,
    draws: 0,
    total: 0,
    home_goals: 0,
    away_goals: 0,
    meetings: [],
  };
}

function sportmonksStatsTeam(team = {}) {
  return {
    id: team.id,
    name: team.name || 'TBD',
    logo: team.image_path || '',
  };
}

function normalizeSportmonksPosition(lineup = {}) {
  const raw = lineup.position?.code || lineup.position?.name || lineup.position || '';
  const value = String(raw).toUpperCase();
  if (value.includes('GOAL') || value === '1') return 'GK';
  if (value.includes('DEF')) return 'DEF';
  if (value.includes('MID')) return 'MID';
  if (value.includes('ATT') || value.includes('FOR')) return 'FWD';
  return value || String(lineup.formation_position || '');
}

function normalizeSportmonksTeam(team = {}) {
  return {
    id: team.id,
    external_id: team.id,
    code: team.short_code || shortCode(team.name),
    name_en: team.name || 'TBD',
    name_ru: team.name || 'TBD',
    flag_url: team.image_path || '',
  };
}

function normalizeSportmonksDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.includes('T')) return raw;
  return `${raw.replace(' ', 'T')}Z`;
}

function extractSportmonksScore(scores = []) {
  const result = { home: 0, away: 0 };
  if (!Array.isArray(scores)) return result;
  const current = scores.filter((score) => String(score.description || score.type?.name || '').toLowerCase().includes('current'));
  const selected = current.length ? current : scores;
  selected.forEach((score) => {
    const side = score.score?.participant;
    const goals = Number(score.score?.goals);
    if ((side === 'home' || side === 'away') && Number.isFinite(goals)) {
      result[side] = goals;
    }
  });
  return result;
}

function extractSportmonksScoreFromEvents(events = []) {
  if (!Array.isArray(events)) return null;
  const scoredEvents = events
    .map((event, index) => {
      const match = String(event?.result || '').match(/(\d+)\s*[-:]\s*(\d+)/);
      if (!match) return null;
      return {
        home: Number(match[1]),
        away: Number(match[2]),
        sort_order: Number.isFinite(Number(event?.sort_order)) ? Number(event.sort_order) : index,
      };
    })
    .filter((score) => score && Number.isFinite(score.home) && Number.isFinite(score.away))
    .sort((left, right) => left.sort_order - right.sort_order);
  return scoredEvents.length ? scoredEvents.at(-1) : null;
}

function extractSportmonksMinute(item = {}) {
  const periods = Array.isArray(item.periods) ? item.periods : [];
  const active = periods.find((period) => period.ticking) || periods[periods.length - 1];
  const minute = Number(active?.minutes ?? active?.minute ?? item.minute);
  return Number.isFinite(minute) ? minute : undefined;
}

function normalizeSportmonksStatus(state = {}) {
  const raw = String(state.short_name || state.developer_name || state.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (['ht', 'halftime', 'break'].includes(raw)) return 'half_time';
  if (['ft', 'aet', 'pen', 'finished', 'ended', 'fulltime', 'afterextratime'].includes(raw)) return 'finished';
  if (['postponed', 'cancelled', 'canceled', 'abandoned', 'suspended'].includes(raw)) return 'postponed';
  if (['1st', '2nd', 'et', 'inplay', 'live', '1h', '2h'].includes(raw)) return 'live';
  return 'scheduled';
}

function filterSportmonksWorldCupMatches(matches = [], env = {}) {
  const configuredIds = sportmonksConfiguredLeagueIds(env);
  const filtered = matches.filter((match) => {
    const leagueId = Number(match?.league?.id);
    if (configuredIds.length && configuredIds.includes(leagueId)) return true;
    const name = String(match?.league?.name || '').toLowerCase();
    return name.includes('world cup');
  });
  return filtered.length ? filtered : matches;
}

function sportmonksConfiguredLeagueIds(env = {}) {
  return String(env.SPORTMONKS_LEAGUE_IDS || '')
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
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
  if (NEWS_SUPPORTED_LOCALES.has(lang)) return lang;
  return 'en';
}

function resolveSportmonksLocale(url) {
  const value = url?.searchParams?.get('locale') || url?.searchParams?.get('lang') || '';
  const locale = String(value).trim().toLowerCase();
  return SPORTMONKS_SUPPORTED_LOCALES.has(locale) ? locale : '';
}

export function resolveCacheTtl(url) {
  const status = url.searchParams.get('status') || '';
  if (url.pathname === '/api/streams/active') return 30;
  if (url.pathname === '/api/news') return secondsUntilNextUtcDay();
  if (status === 'live' || status === 'half_time') return 30;
  if (/^\/api\/matches\/\d+\/(events|lineups)$/.test(url.pathname) && isLiveStatsRequest(url)) return 30;
  if (/^\/api\/matches\/\d+\/(events|lineups|facts)$/.test(url.pathname)) return 1800;
  if (/^\/api\/matches\/\d+\/odds$/.test(url.pathname)) return 300;
  if (/^\/api\/matches\/\d+\/stats$/.test(url.pathname) && isLiveStatsRequest(url)) return 30;
  if (/^\/api\/matches\/\d+\/stats$/.test(url.pathname)) return 1800;
  if (/^\/api\/matches\/\d+\/prematch$/.test(url.pathname)) return secondsUntilNextUtcDay();
  if (/^\/api\/matches\/\d+$/.test(url.pathname) && isLiveStatsRequest(url)) return 30;
  if (/^\/api\/matches\/\d+$/.test(url.pathname)) return 1800;
  return secondsUntilNextUtcDay();
}

function isLiveStatsRequest(url) {
  const live = String(url.searchParams.get('live') || '').toLowerCase();
  return live === '1' || live === 'true';
}

function normalizeCacheUrl(url, provider = '') {
  const normalized = new URL(url);
  if (provider) normalized.searchParams.set('__provider', provider);
  normalized.searchParams.sort();
  return normalized;
}

function normalizeSportmonksSubrequestCacheUrl(apiUrl) {
  const normalized = new URL(apiUrl);
  normalized.searchParams.delete('api_token');
  normalized.searchParams.set('__sportmonks_subrequest', '1');
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
