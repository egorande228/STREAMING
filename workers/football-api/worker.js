const API_BASE = 'https://v3.football.api-sports.io';
const SPORTMONKS_API_BASE = 'https://api.sportmonks.com/v3/football';
const SPORTMONKS_MATCH_INCLUDES = 'participants;scores;events.type;statistics.type;periods;state;venue;stage;league';
const SPORTMONKS_DETAIL_INCLUDES = 'participants;scores;events.type;statistics.type;lineups.player:display_name,image_path;periods;state;venue;stage;league';
const SPORTMONKS_STATS_INCLUDES = 'participants;statistics.type';
const SPORTMONKS_EVENTS_INCLUDES = 'participants;events.type';
const SPORTMONKS_LINEUPS_INCLUDES = 'participants;lineups.player:display_name,image_path';
const SPORTMONKS_NEWS_INCLUDES = 'fixture;league;lines';
const SPORTMONKS_PREDICTIONS_INCLUDES = 'type';
const MELBET_BOOKMAKER_ID = 64;
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
const MATCH_OVERRIDES_KV_KEY = 'match_overrides_json';
const API_STREAM_OVERRIDES_KV_KEY = 'api_stream_overrides_json';
const RESTREAM_CONFIG_KV_KEY = 'restream_configs_json';
const CACHE_VERSION_KV_KEY = 'api_cache_version';
const API_CACHE_NAMESPACE = 'melbet64-predictions-v1';
const DAMI_STREAMS_KV_KEY = 'dami:streams:v1';
const DAMI_STREAMS_TTL_SECONDS = 60;
const DAMI_STREAMS_API_URL = 'https://dami-tv.pro/papi/api/streams';
const DAMI_STREAMS_FALLBACK_API_URL = 'https://damitv.b-cdn.net/papi/api/streams';
const ADMIN_STREAM_PAST_DAYS = 1;
const ADMIN_STREAM_LOOKAHEAD_DAYS = 14;
const RESTREAM_PUBLIC_BASE_URL = 'https://hls.livekinglive.win/live';
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
  async fetch(request, env, ctx) {
    try {
      return await routeRequest(request, env, ctx);
    } catch (error) {
      const url = new URL(request.url);
      const adminMessage = url.pathname.startsWith('/api/admin')
        ? String(error?.message || error || 'internal_error').slice(0, 300)
        : 'internal_error';
      return jsonResponse({ error: 'internal_error', message: adminMessage }, 500, 0);
    }
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
    return routeAdminRequest(request, env, ctx);
  }
  if (url.pathname === '/api/restreams/desired') {
    if (request.method !== 'GET') return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
    return routeRestreamDesiredRequest(request, env);
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
  const cacheVersion = await readCacheVersion(env);
  const cacheKey = new Request(normalizeCacheUrl(url, provider, cacheVersion).toString(), request);
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
  const matchOverrides = await readRuntimeMatchOverrides(env);
  const matches = applyMatchOverrides(fixtures.map((fixture) => normalizeFixture(fixture, env, streamConfig, matchOverrides)), env, streamConfig, matchOverrides);
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
    const [statisticsPayload, eventsPayload, lineupsPayload, factsPayload, oddsPayload, predictionsPayload] = await Promise.all([
      fetchCachedSportmonksJson(buildSportmonksFixtureDetailUrl(matchId, url, SPORTMONKS_STATS_INCLUDES), env, liveTtl, ctx),
      fetchCachedSportmonksJson(buildSportmonksFixtureDetailUrl(matchId, url, SPORTMONKS_EVENTS_INCLUDES), env, liveTtl, ctx),
      fetchCachedSportmonksJson(buildSportmonksFixtureDetailUrl(matchId, url, SPORTMONKS_LINEUPS_INCLUDES), env, 1800, ctx),
      fetchCachedSportmonksJson(buildSportmonksMatchFactsUrl(matchId, url), env, 1800, ctx),
      fetchCachedSportmonksJson(buildSportmonksOddsUrl(matchId, url), env, 300, ctx),
      fetchCachedSportmonksJson(buildSportmonksPredictionsUrl(matchId, url), env, 1800, ctx),
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
        predictions: predictionsPayload.ok ? sportmonksDataList(predictionsPayload.body) : [],
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
  const matchOverrides = await readRuntimeMatchOverrides(env);
  const data = fixturePayload.body?.data;
  const fixtures = Array.isArray(data) ? data : data ? [data] : [];
  const matches = await applyDamiAutoStreams(
    applyMatchOverrides(fixtures.map((fixture) => normalizeSportmonksFixture(fixture, env, streamConfig, matchOverrides)), env, streamConfig, matchOverrides),
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
  const cacheVersion = await readCacheVersion(env);
  const cacheKey = cache && ttl > 0 ? new Request(normalizeSportmonksSubrequestCacheUrl(apiUrl, cacheVersion).toString()) : null;
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

async function routeAdminRequest(request, env = {}, ctx = {}) {
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

  if (url.pathname === '/api/admin/refresh') {
    if (request.method === 'POST') return routeAdminRefresh(request, env, ctx);
    return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
  }

  if (url.pathname === '/api/admin/streams') {
    if (request.method === 'GET') return routeAdminStreamsList(env, ctx);
    if (request.method === 'POST') return routeAdminStreamsCreate(request, env);
    return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
  }

  if (url.pathname === '/api/admin/restreams') {
    if (request.method === 'GET') return routeAdminRestreamsList(env);
    if (request.method === 'POST') return routeAdminRestreamsUpsert(request, env);
    return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
  }

  if (url.pathname === '/api/admin/match-overrides') {
    if (request.method === 'GET') return routeAdminMatchOverridesList(env);
    if (request.method === 'POST') return routeAdminMatchOverridesUpsert(request, env);
    return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
  }

  const overrideMatchId = Number(url.pathname.match(/^\/api\/admin\/match-overrides\/(\d+)$/)?.[1]);
  if (overrideMatchId > 0) {
    if (request.method === 'DELETE') return routeAdminMatchOverridesDelete(env, overrideMatchId);
    return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
  }

  const restreamActionMatch = url.pathname.match(/^\/api\/admin\/restreams\/([^/]+)\/(start|stop|restart)$/);
  if (restreamActionMatch) {
    if (request.method === 'POST') return routeAdminRestreamsAction(env, restreamActionMatch[1], restreamActionMatch[2]);
    return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
  }

  const restreamId = url.pathname.match(/^\/api\/admin\/restreams\/([^/]+)$/)?.[1] || '';
  if (restreamId) {
    if (request.method === 'PUT') return routeAdminRestreamsUpsert(request, env, restreamId);
    if (request.method === 'DELETE') return routeAdminRestreamsDelete(env, restreamId);
    return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
  }

  const streamId = url.pathname.match(/^\/api\/admin\/streams\/([^/]+)$/)?.[1] || '';
  if (streamId) {
    if (request.method === 'PUT') return routeAdminStreamsUpdate(request, env, streamId);
    if (request.method === 'DELETE') return routeAdminStreamsDelete(env, streamId);
    return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
  }

  return jsonResponse({ error: 'not_found' }, 404, 0);
}

async function routeAdminRefresh(request, env = {}, ctx = {}) {
  const body = await readJsonBody(request);
  const scope = normalizeRefreshScope(body?.scope);
  if (!scope) return jsonResponse({ error: 'invalid_refresh_scope' }, 400, 0);

  const matchId = Number(body?.match_id);
  const date = normalizeRefreshDate(body?.date) || new Date().toISOString().slice(0, 10);
  const cacheVersion = await bumpCacheVersion(env);
  if (scope === 'all' || scope === 'dami') {
    await deleteKvKey(env, DAMI_STREAMS_KV_KEY);
  }

  const preview = await refreshPreview(scope, { matchId, date }, env, ctx);
  const metrics = await readTodayMetrics(env);
  return jsonResponse(
    {
      ok: true,
      scope,
      match_id: Number.isFinite(matchId) && matchId > 0 ? matchId : null,
      date,
      cache_version: cacheVersion,
      metrics: {
        upstream_calls: metrics.upstream_calls || 0,
        cache_hits: metrics.cache_hits || 0,
        dami_cache_hits: metrics.dami_cache_hits || 0,
        last_sportmonks_update: metrics.last_sportmonks_update || '',
        last_dami_update: metrics.last_dami_update || '',
      },
      preview,
    },
    200,
    0,
  );
}

function normalizeRefreshScope(value) {
  const scope = String(value || 'all').trim().toLowerCase();
  return ['all', 'matches', 'match', 'stats', 'dami'].includes(scope) ? scope : '';
}

function normalizeRefreshDate(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

async function refreshPreview(scope, options = {}, env = {}, ctx = {}) {
  const provider = env.SPORTMONKS_TOKEN ? 'sportmonks' : env.API_FOOTBALL_KEY ? 'api-football' : '';
  if (scope === 'dami') {
    const streams = await fetchDamiStreams(env, { force: true });
    return { provider: 'dami', total_streams: streams.length };
  }
  if (!provider) return { provider: 'not_configured' };

  let path = `/api/matches?date=${encodeURIComponent(options.date)}`;
  if ((scope === 'match' || scope === 'stats') && (!Number.isFinite(options.matchId) || options.matchId <= 0)) {
    return { provider, error: 'match_id_required' };
  }
  if (scope === 'match') path = `/api/matches/${options.matchId}?live=1`;
  if (scope === 'stats') path = `/api/matches/${options.matchId}/stats?live=1`;

  const url = new URL(path, 'https://kinglive.admin');
  const ttl = resolveCacheTtl(url);
  const response = provider === 'sportmonks'
    ? await routeSportmonksFootballRequest(url, env, ttl, ctx)
    : await routeApiFootballRequest(url, env, ttl);
  const payload = await response.clone().json().catch(() => null);
  return summarizeRefreshPayload(provider, response.status, payload);
}

function summarizeRefreshPayload(provider, status, payload) {
  const matches = Array.isArray(payload?.matches) ? payload.matches : payload?.id ? [payload] : [];
  const streams = matches.flatMap((match) => Array.isArray(match?.streams) ? match.streams : []);
  const damiMatchedMatches = matches.filter((match) => {
    const matchStreams = Array.isArray(match?.streams) ? match.streams : [];
    return matchStreams.some((stream) => isDamiStreamUrl(stream?.url));
  }).length;
  return {
    provider,
    status,
    total_matches: matches.length,
    total_streams: streams.length,
    dami_matched_matches: damiMatchedMatches,
    dami_unmatched_matches: Math.max(0, matches.length - damiMatchedMatches),
    match_ids: matches.map((match) => match.id).filter(Boolean).slice(0, 20),
    stats_events: Array.isArray(payload?.events) ? payload.events.length : undefined,
    stats_team_rows: Array.isArray(payload?.team_stats) ? payload.team_stats.length : undefined,
  };
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

async function routeAdminStreamsList(env, ctx = {}) {
  const config = await readRuntimeStreamConfig(env);
  const streams = flattenStreamConfig(config).map((stream) => ({
    ...stream,
    origin: 'manual',
    editable: true,
    is_live_now: isStreamActiveNow(stream),
  }));
  const autoStreams = await readAdminAutoStreams(env, ctx);
  const allStreams = [...streams, ...autoStreams];
  return jsonResponse({ streams: allStreams, total: allStreams.length, manual_total: streams.length, auto_total: autoStreams.length }, 200, 0);
}

async function routeAdminMatchOverridesList(env) {
  const overrides = await readRuntimeMatchOverrides(env);
  return jsonResponse({ overrides: Object.values(overrides), total: Object.keys(overrides).length }, 200, 0);
}

async function routeAdminMatchOverridesUpsert(request, env) {
  if (!env.STREAM_CONFIG_KV?.put) {
    return jsonResponse({ error: 'match_override_kv_not_configured' }, 503, 0);
  }
  const body = await readJsonBody(request);
  const override = normalizeAdminMatchOverridePayload(body);
  if (!override) return jsonResponse({ error: 'invalid_match_override_payload' }, 400, 0);
  const overrides = await readRuntimeMatchOverrides(env);
  overrides[String(override.match_id)] = override;
  await writeRuntimeMatchOverrides(env, overrides);
  const cacheVersion = await bumpCacheVersion(env);
  return jsonResponse({ ok: true, override, cache_version: cacheVersion }, 200, 0);
}

async function routeAdminMatchOverridesDelete(env, matchId) {
  if (!env.STREAM_CONFIG_KV?.put) {
    return jsonResponse({ error: 'match_override_kv_not_configured' }, 503, 0);
  }
  const overrides = await readRuntimeMatchOverrides(env);
  delete overrides[String(matchId)];
  await writeRuntimeMatchOverrides(env, overrides);
  const cacheVersion = await bumpCacheVersion(env);
  return jsonResponse({ ok: true, match_id: matchId, cache_version: cacheVersion }, 200, 0);
}

async function routeAdminRestreamsList(env = {}) {
  const restreams = Object.values(await readRuntimeRestreamConfig(env))
    .sort((left, right) => Number(left.match_id) - Number(right.match_id) || String(left.slug).localeCompare(String(right.slug)));
  return jsonResponse({ restreams, total: restreams.length }, 200, 0);
}

async function routeAdminRestreamsUpsert(request, env = {}, restreamId = '') {
  if (!env.STREAM_CONFIG_KV?.put) {
    return jsonResponse({ error: 'restream_kv_not_configured' }, 503, 0);
  }

  const body = await readJsonBody(request);
  const restream = normalizeAdminRestreamPayload(body, restreamId, env);
  if (!restream) return jsonResponse({ error: 'invalid_restream_payload' }, 400, 0);

  const configs = await readRuntimeRestreamConfig(env);
  configs[restream.id] = restream;
  await writeRuntimeRestreamConfig(env, configs);
  const stream = await upsertRestreamBackedStream(env, restream);
  const cacheVersion = await bumpCacheVersion(env);
  return jsonResponse({ ok: true, restream, stream, cache_version: cacheVersion }, 200, 0);
}

async function routeAdminRestreamsAction(env = {}, restreamId = '', action = '') {
  if (!env.STREAM_CONFIG_KV?.put) {
    return jsonResponse({ error: 'restream_kv_not_configured' }, 503, 0);
  }

  const id = normalizeRestreamId(restreamId);
  const configs = await readRuntimeRestreamConfig(env);
  const current = configs[id];
  if (!current) return jsonResponse({ error: 'restream_not_found' }, 404, 0);

  const desiredState = action === 'stop' ? 'stopped' : 'running';
  const next = {
    ...current,
    desired_state: desiredState,
    restart_requested_at: action === 'restart' ? new Date().toISOString() : current.restart_requested_at || null,
    updated_at: new Date().toISOString(),
  };
  configs[id] = next;
  await writeRuntimeRestreamConfig(env, configs);
  const stream = await upsertRestreamBackedStream(env, next);
  const cacheVersion = await bumpCacheVersion(env);
  return jsonResponse({ ok: true, action, restream: next, stream, cache_version: cacheVersion }, 200, 0);
}

async function routeAdminRestreamsDelete(env = {}, restreamId = '') {
  if (!env.STREAM_CONFIG_KV?.put) {
    return jsonResponse({ error: 'restream_kv_not_configured' }, 503, 0);
  }

  const id = normalizeRestreamId(restreamId);
  const configs = await readRuntimeRestreamConfig(env);
  const current = configs[id];
  if (!current) return jsonResponse({ error: 'restream_not_found' }, 404, 0);

  delete configs[id];
  await writeRuntimeRestreamConfig(env, configs);
  await deleteRestreamBackedStream(env, id);
  const cacheVersion = await bumpCacheVersion(env);
  return jsonResponse({ ok: true, id, cache_version: cacheVersion }, 200, 0);
}

async function routeRestreamDesiredRequest(request, env = {}) {
  if (!isAuthorizedRestreamSyncRequest(request, env)) {
    return jsonResponse({ error: 'unauthorized' }, 401, 0);
  }
  const restreams = Object.values(await readRuntimeRestreamConfig(env))
    .filter((restream) => restream.is_active !== false)
    .sort((left, right) => String(left.slug).localeCompare(String(right.slug)));
  return jsonResponse({ restreams, total: restreams.length, generated_at: new Date().toISOString() }, 200, 0);
}

async function readAdminAutoStreams(env = {}, ctx = {}) {
  if (!env.SPORTMONKS_TOKEN && !env.API_FOOTBALL_KEY) return [];
  const adminEnv = { ...env, ADMIN_DAMI_LIST: 'true' };
  const responses = await Promise.all(adminStreamDates(env).map(async (date) => {
    const url = new URL(`/api/matches?date=${date}`, 'https://kinglive.admin');
    const ttl = resolveCacheTtl(url);
    const response = env.SPORTMONKS_TOKEN
      ? await routeSportmonksFootballRequest(url, adminEnv, ttl, ctx)
      : await routeApiFootballRequest(url, adminEnv, ttl);
    if (!response.ok) return [];
    const payload = await response.json().catch(() => null);
    return Array.isArray(payload?.matches) ? payload.matches : [];
  }));
  const streams = responses.flat().flatMap((match) => {
    const streams = Array.isArray(match?.streams) ? match.streams : [];
    return streams
      .filter((stream) => isDamiStreamUrl(stream?.url))
      .map((stream, index) => ({
        ...stream,
        id: stream.api_stream_id || `dami-${match.id}-${stream.id || index}`,
        match_id: Number(match.id),
        origin: 'dami',
        editable: true,
        overridden: stream.api_overridden === true,
        is_live_now: isStreamActiveNow(stream),
      }));
  });
  return dedupeAdminStreams(streams);
}

function adminStreamDates(env = {}) {
  const pastDays = boundedInteger(env.ADMIN_STREAM_PAST_DAYS, ADMIN_STREAM_PAST_DAYS, 0, 7);
  const lookaheadDays = boundedInteger(env.ADMIN_STREAM_LOOKAHEAD_DAYS, ADMIN_STREAM_LOOKAHEAD_DAYS, 0, 31);
  const start = new Date(`${todayDate()}T00:00:00Z`);
  const dates = [];
  for (let offset = -pastDays; offset <= lookaheadDays; offset += 1) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + offset);
    dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
}

function boundedInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

function dedupeAdminStreams(streams = []) {
  const seen = new Set();
  const deduped = [];
  streams.forEach((stream) => {
    const key = String(stream.id || `${stream.match_id}:${stream.url}`);
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(stream);
  });
  return deduped;
}

function isDamiStreamUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.hostname === 'dami-tv.pro' || url.hostname.endsWith('.dami-tv.pro');
  } catch {
    return false;
  }
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
  const idText = String(streamId || '').trim();
  if (isApiStreamOverrideId(idText)) {
    const override = normalizeApiStreamOverridePayload(body, idText);
    if (!override) return jsonResponse({ error: 'invalid_api_stream_override_payload' }, 400, 0);
    const overrides = await readRuntimeApiStreamOverrides(env);
    overrides[idText] = override;
    await writeRuntimeApiStreamOverrides(env, overrides);
    const cacheVersion = await bumpCacheVersion(env);
    return jsonResponse({ ok: true, override, cache_version: cacheVersion }, 200, 0);
  }

  const numericStreamId = Number(streamId);
  if (!Number.isFinite(numericStreamId) || numericStreamId <= 0) {
    return jsonResponse({ error: 'stream_not_found' }, 404, 0);
  }
  const updated = normalizeAdminStreamPayload(body, numericStreamId);
  if (!updated) return jsonResponse({ error: 'invalid_stream_payload' }, 400, 0);

  const config = await readRuntimeStreamConfig(env);
  const streams = flattenStreamConfig(config);
  const index = streams.findIndex((item) => Number(item.id) === numericStreamId);
  if (index < 0) return jsonResponse({ error: 'stream_not_found' }, 404, 0);
  streams[index] = updated;
  await writeRuntimeStreamConfig(env, expandStreamConfig(streams));
  return jsonResponse({ ok: true }, 200, 0);
}

async function routeAdminStreamsDelete(env, streamId) {
  if (!env.STREAM_CONFIG_KV?.put) {
    return jsonResponse({ error: 'stream_kv_not_configured' }, 503, 0);
  }

  const idText = String(streamId || '').trim();
  if (isApiStreamOverrideId(idText)) {
    const overrides = await readRuntimeApiStreamOverrides(env);
    delete overrides[idText];
    await writeRuntimeApiStreamOverrides(env, overrides);
    const cacheVersion = await bumpCacheVersion(env);
    return jsonResponse({ ok: true, id: idText, cache_version: cacheVersion }, 200, 0);
  }

  const numericStreamId = Number(streamId);
  if (!Number.isFinite(numericStreamId) || numericStreamId <= 0) {
    return jsonResponse({ error: 'stream_not_found' }, 404, 0);
  }
  const config = await readRuntimeStreamConfig(env);
  const streams = flattenStreamConfig(config);
  const filtered = streams.filter((item) => Number(item.id) !== numericStreamId);
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

function isAuthorizedRestreamSyncRequest(request, env = {}) {
  const expected = String(env.RESTREAM_SYNC_TOKEN || '').trim();
  if (!expected) return false;
  const auth = request.headers.get('Authorization') || '';
  const headerToken = request.headers.get('X-Restream-Token') || request.headers.get('x-restream-token') || '';
  return auth === `Bearer ${expected}` || headerToken === expected;
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

async function readRuntimeMatchOverrides(env = {}) {
  if (!env.STREAM_CONFIG_KV?.get) return {};
  try {
    const raw = await env.STREAM_CONFIG_KV.get(MATCH_OVERRIDES_KV_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [key, normalizeAdminMatchOverridePayload(value)])
        .filter(([, value]) => value),
    );
  } catch {
    return {};
  }
}

async function writeRuntimeMatchOverrides(env = {}, overrides = {}) {
  if (!env.STREAM_CONFIG_KV?.put) return false;
  await env.STREAM_CONFIG_KV.put(MATCH_OVERRIDES_KV_KEY, JSON.stringify(overrides));
  return true;
}

async function readRuntimeApiStreamOverrides(env = {}) {
  if (!env.STREAM_CONFIG_KV?.get) return {};
  try {
    const raw = await env.STREAM_CONFIG_KV.get(API_STREAM_OVERRIDES_KV_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [key, normalizeApiStreamOverridePayload(value, key)])
        .filter(([, value]) => value),
    );
  } catch {
    return {};
  }
}

async function writeRuntimeApiStreamOverrides(env = {}, overrides = {}) {
  if (!env.STREAM_CONFIG_KV?.put) return false;
  await env.STREAM_CONFIG_KV.put(API_STREAM_OVERRIDES_KV_KEY, JSON.stringify(overrides));
  return true;
}

async function readRuntimeRestreamConfig(env = {}) {
  if (!env.STREAM_CONFIG_KV?.get) return {};
  try {
    const raw = await env.STREAM_CONFIG_KV.get(RESTREAM_CONFIG_KV_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [normalizeRestreamId(key), normalizeStoredRestream(value, key, env)])
        .filter(([key, value]) => key && value),
    );
  } catch {
    return {};
  }
}

async function writeRuntimeRestreamConfig(env = {}, configs = {}) {
  if (!env.STREAM_CONFIG_KV?.put) return false;
  await env.STREAM_CONFIG_KV.put(RESTREAM_CONFIG_KV_KEY, JSON.stringify(configs));
  return true;
}

async function upsertRestreamBackedStream(env = {}, restream = {}) {
  const config = await readRuntimeStreamConfig(env);
  const streams = flattenStreamConfig(config);
  const index = streams.findIndex((stream) => String(stream.restream_id || '') === restream.id);
  const stream = restreamToStream(restream, index >= 0 ? streams[index] : null);
  if (!stream) return null;
  if (index >= 0) streams[index] = stream;
  else streams.push(stream);
  await writeRuntimeStreamConfig(env, expandStreamConfig(streams));
  return stream;
}

async function deleteRestreamBackedStream(env = {}, restreamId = '') {
  const config = await readRuntimeStreamConfig(env);
  const streams = flattenStreamConfig(config);
  const filtered = streams.filter((stream) => String(stream.restream_id || '') !== restreamId);
  if (filtered.length === streams.length) return false;
  await writeRuntimeStreamConfig(env, expandStreamConfig(filtered));
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
      playback_mode: normalizePlaybackMode(current?.playback_mode || current?.playbackMode),
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
        playback_mode: normalizePlaybackMode(normalized.playback_mode || normalized.playbackMode),
        is_active: normalized.is_active !== false,
        starts_at: normalized.starts_at || normalized.startsAt || null,
        ends_at: normalized.ends_at || normalized.endsAt || null,
        restream_id: normalized.restream_id || normalized.restreamId || null,
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
      playback_mode: normalizePlaybackMode(stream.playback_mode || stream.playbackMode),
      quality: stream.quality || '720p',
      is_active: stream.is_active !== false,
      starts_at: stream.starts_at || null,
      ends_at: stream.ends_at || null,
      restream_id: stream.restream_id || stream.restreamId || null,
    });
  });
  return byMatch;
}

function normalizeAdminStreamPayload(payload, streamId) {
  const matchId = Number(payload?.match_id);
  const url = String(payload?.url || '').trim();
  if (!Number.isFinite(matchId) || matchId <= 0 || !url) return null;

  const sourceType = ['hls', 'iframe', 'videojs'].includes(payload?.source_type)
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
    playback_mode: normalizePlaybackMode(payload?.playback_mode || payload?.playbackMode),
    is_active: payload?.is_active !== false,
    starts_at: normalizeOptionalDateTime(payload?.starts_at),
    ends_at: normalizeOptionalDateTime(payload?.ends_at),
  };
}

function normalizeAdminRestreamPayload(payload, restreamId = '', env = {}) {
  const matchId = Number(payload?.match_id);
  const donorUrl = String(payload?.donor_url || payload?.input_url || '').trim();
  const slug = normalizeRestreamSlug(payload?.slug || payload?.id || restreamId || payload?.label);
  if (!Number.isFinite(matchId) || matchId <= 0 || !slug || !isValidRestreamUrl(donorUrl)) return null;

  const now = new Date().toISOString();
  const id = normalizeRestreamId(restreamId || slug);
  const outputUrl = buildRestreamOutputUrl(slug, env);
  const desiredState = normalizeRestreamDesiredState(payload?.desired_state);
  return {
    id,
    slug,
    match_id: matchId,
    label: String(payload?.label || slugToLabel(slug)).trim().slice(0, 120),
    donor_url: donorUrl,
    output_url: outputUrl,
    source_type: 'videojs',
    quality: String(payload?.quality || '720p').trim().slice(0, 40),
    language_code: String(payload?.language_code || 'en').trim().slice(0, 16),
    region: String(payload?.region || 'global').trim().slice(0, 40),
    priority: Number.isFinite(Number(payload?.priority)) ? Number(payload.priority) : 100,
    commentary_type: String(payload?.commentary_type || 'full').trim().slice(0, 40),
    playback_mode: normalizePlaybackMode(payload?.playback_mode || payload?.playbackMode),
    is_active: payload?.is_active !== false,
    desired_state: desiredState,
    starts_at: normalizeOptionalDateTime(payload?.starts_at),
    ends_at: normalizeOptionalDateTime(payload?.ends_at),
    updated_at: now,
    created_at: normalizeOptionalDateTime(payload?.created_at) || now,
    restart_requested_at: normalizeOptionalDateTime(payload?.restart_requested_at),
  };
}

function normalizeStoredRestream(value = {}, key = '', env = {}) {
  const payload = { ...value, id: value?.id || key, slug: value?.slug || key };
  return normalizeAdminRestreamPayload(payload, payload.id || key, env);
}

function restreamToStream(restream = {}, current = null) {
  const matchId = Number(restream.match_id);
  if (!Number.isFinite(matchId) || matchId <= 0 || !restream.output_url) return null;
  return {
    id: Number(current?.id) > 0 ? Number(current.id) : hashToPositiveInt(`restream:${restream.id}`),
    match_id: matchId,
    label: restream.label || slugToLabel(restream.slug),
    source_type: 'videojs',
    quality: restream.quality || '720p',
    language_code: restream.language_code || 'en',
    url: restream.output_url,
    priority: Number.isFinite(Number(restream.priority)) ? Number(restream.priority) : 100,
    region: restream.region || 'global',
    commentary_type: restream.commentary_type || 'full',
    playback_mode: normalizePlaybackMode(restream.playback_mode),
    is_active: restream.is_active !== false && restream.desired_state !== 'stopped',
    starts_at: restream.starts_at || null,
    ends_at: restream.ends_at || null,
    restream_id: restream.id,
  };
}

function normalizeRestreamId(value = '') {
  return normalizeRestreamSlug(value);
}

function normalizeRestreamSlug(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function normalizeRestreamDesiredState(value = '') {
  const state = String(value || 'running').trim().toLowerCase();
  return ['running', 'stopped'].includes(state) ? state : 'running';
}

function isValidRestreamUrl(value = '') {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function buildRestreamOutputUrl(slug = '', env = {}) {
  const base = String(env.RESTREAM_PUBLIC_BASE_URL || RESTREAM_PUBLIC_BASE_URL).replace(/\/+$/, '');
  return `${base}/${normalizeRestreamSlug(slug)}/index.m3u8`;
}

function slugToLabel(slug = '') {
  return String(slug || 'IPTV restream')
    .split('-')
    .filter(Boolean)
    .map((part) => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : '')
    .join(' ');
}

function normalizeAdminMatchOverridePayload(payload) {
  const matchId = Number(payload?.match_id);
  if (!Number.isFinite(matchId) || matchId <= 0) return null;
  const status = String(payload?.status || '').trim().toLowerCase();
  if (!['scheduled', 'live', 'half_time', 'finished', 'postponed'].includes(status)) return null;
  const hasMinute = payload?.minute !== null && payload?.minute !== undefined && payload?.minute !== '';
  const hasHomeScore = payload?.home_score !== null && payload?.home_score !== undefined && payload?.home_score !== '';
  const hasAwayScore = payload?.away_score !== null && payload?.away_score !== undefined && payload?.away_score !== '';
  const minute = Number(payload?.minute);
  const homeScore = Number(payload?.home_score);
  const awayScore = Number(payload?.away_score);
  return {
    match_id: matchId,
    status,
    minute: hasMinute && Number.isFinite(minute) && minute >= 0 ? Math.floor(minute) : null,
    home_score: hasHomeScore && Number.isFinite(homeScore) && homeScore >= 0 ? Math.floor(homeScore) : null,
    away_score: hasAwayScore && Number.isFinite(awayScore) && awayScore >= 0 ? Math.floor(awayScore) : null,
    scheduled_at: normalizeOptionalDateTime(payload?.scheduled_at),
    note: String(payload?.note || '').trim().slice(0, 200),
    updated_at: new Date().toISOString(),
  };
}

function isApiStreamOverrideId(value = '') {
  return /^dami-\d+-\d+$/.test(String(value || '').trim());
}

function normalizeApiStreamOverridePayload(payload, overrideId) {
  const id = String(overrideId || payload?.id || '').trim();
  if (!isApiStreamOverrideId(id)) return null;
  const matchId = Number(payload?.match_id || id.split('-')[1]);
  const url = String(payload?.url || '').trim();
  if (!Number.isFinite(matchId) || matchId <= 0 || !url) return null;
  const sourceType = payload?.source_type === 'hls' || payload?.source_type === 'videojs' || payload?.source_type === 'iframe'
    ? payload.source_type
    : inferStreamType(url);
  return {
    id,
    match_id: matchId,
    label: String(payload?.label || 'API stream').trim(),
    source_type: sourceType,
    quality: String(payload?.quality || '720p').trim(),
    language_code: String(payload?.language_code || 'und').trim(),
    url,
    priority: Number.isFinite(Number(payload?.priority)) ? Number(payload.priority) : 80,
    region: String(payload?.region || 'global').trim(),
    commentary_type: String(payload?.commentary_type || 'full').trim(),
    playback_mode: normalizePlaybackMode(payload?.playback_mode || payload?.playbackMode),
    is_active: payload?.is_active !== false,
    starts_at: normalizeOptionalDateTime(payload?.starts_at),
    ends_at: normalizeOptionalDateTime(payload?.ends_at),
    updated_at: payload?.updated_at || new Date().toISOString(),
  };
}

function normalizePlaybackMode(value) {
  const mode = String(value || 'auto').trim().toLowerCase();
  return ['auto', 'iframe', 'iframe_popups'].includes(mode) ? mode : 'auto';
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
    dami_cache_hits: 0,
    last_sportmonks_update: '',
    last_dami_update: '',
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

async function readCacheVersion(env = {}) {
  if (!env.STREAM_CONFIG_KV?.get) return '0';
  try {
    return String((await env.STREAM_CONFIG_KV.get(CACHE_VERSION_KV_KEY)) || '0');
  } catch {
    return '0';
  }
}

async function bumpCacheVersion(env = {}) {
  const version = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (!env.STREAM_CONFIG_KV?.put) return version;
  try {
    await env.STREAM_CONFIG_KV.put(CACHE_VERSION_KV_KEY, version);
  } catch {}
  return version;
}

async function deleteKvKey(env = {}, key) {
  if (!env.STREAM_CONFIG_KV?.delete) return false;
  try {
    await env.STREAM_CONFIG_KV.delete(key);
    return true;
  } catch {
    return false;
  }
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
  const url = new URL(`${SPORTMONKS_API_BASE}/odds/pre-match/fixtures/${matchId}/bookmakers/${MELBET_BOOKMAKER_ID}`);
  url.searchParams.set('include', 'bookmaker;market');
  if (siteUrl) applySportmonksLocale(url, siteUrl);
  return url;
}

function buildSportmonksPredictionsUrl(matchId, siteUrl = null) {
  const url = new URL(`${SPORTMONKS_API_BASE}/predictions/probabilities/fixtures/${matchId}`);
  url.searchParams.set('include', SPORTMONKS_PREDICTIONS_INCLUDES);
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

export function normalizeFixture(item, env = {}, streamConfig = null, matchOverrides = {}) {
  const fixture = item.fixture ?? {};
  const league = item.league ?? {};
  const teams = item.teams ?? {};
  const goals = item.goals ?? {};
  const status = fixture.status ?? {};
  const normalizedStatus = keepScheduledBeforeKickoff(normalizeStatus(status.short), fixture.date);

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
    status: normalizedStatus,
    home_score: goals.home ?? 0,
    away_score: goals.away ?? 0,
    minute: isMatchInProgress(normalizedStatus) && typeof status.elapsed === 'number' ? status.elapsed : undefined,
    home_team: normalizeTeam(teams.home),
    away_team: normalizeTeam(teams.away),
    streams: streamsForMatch(fixture.id, env, streamConfig),
  }, env, streamConfig, matchOverrides);
}

export function normalizeSportmonksFixture(item, env = {}, streamConfig = null, matchOverrides = {}) {
  const participants = Array.isArray(item?.participants) ? item.participants : [];
  const homeTeam = participants.find((team) => team?.meta?.location === 'home') || participants[0] || {};
  const awayTeam = participants.find((team) => team?.meta?.location === 'away') || participants[1] || {};
  const league = item?.league ?? {};
  const stage = item?.stage ?? {};
  const venue = item?.venue ?? {};
  const scores = extractSportmonksScore(item?.scores);
  const scheduledAt = normalizeSportmonksDate(item?.starting_at);
  const normalizedStatus = keepScheduledBeforeKickoff(normalizeSportmonksStatus(item?.state), scheduledAt);

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
    scheduled_at: scheduledAt,
    status: normalizedStatus,
    home_score: scores.home,
    away_score: scores.away,
    minute: isMatchInProgress(normalizedStatus) ? extractSportmonksMinute(item) : undefined,
    home_team: normalizeSportmonksTeam(homeTeam),
    away_team: normalizeSportmonksTeam(awayTeam),
    streams: streamsForMatch(item?.id, env, streamConfig),
  }, env, streamConfig, matchOverrides);
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
    predictions: normalizeSportmonksPredictions(detailFixtures.predictions),
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

function applyMatchOverrides(matches = [], env = {}, streamConfig = null, matchOverrides = {}) {
  const override = createOverrideMatch(env, streamConfig, matchOverrides);
  if (!override) return matches;

  const next = [];
  let replaced = false;
  matches.forEach((match) => {
    if (String(match?.id) === String(override.id)) {
      next.push(applyMatchOverride(match, env, streamConfig, matchOverrides));
      replaced = true;
      return;
    }
    next.push(match);
  });
  if (!replaced) next.unshift(override);
  return next;
}

function applyMatchOverride(match = {}, env = {}, streamConfig = null, matchOverrides = {}) {
  const override = createOverrideMatch(env, streamConfig, matchOverrides);
  const storedOverride = matchOverrides?.[String(match?.id)] || null;
  if ((!override || String(match?.id) !== String(override.id)) && !storedOverride) return match;
  const envOverrideApplies = override && String(match?.id) === String(override.id);
  const scheduledAt = storedOverride?.scheduled_at || (envOverrideApplies ? env.MATCH_OVERRIDE_SCHEDULED_AT : '') || match.scheduled_at || override?.scheduled_at;
  const status = keepScheduledBeforeKickoff(storedOverride?.status || (envOverrideApplies ? env.MATCH_OVERRIDE_STATUS : '') || match.status, scheduledAt);
  return {
    ...match,
    stage: env.MATCH_OVERRIDE_STAGE || match.stage,
    venue: env.MATCH_OVERRIDE_VENUE || match.venue,
    city: env.MATCH_OVERRIDE_CITY || match.city,
    scheduled_at: scheduledAt,
    status,
    home_score: storedOverride?.home_score != null && Number.isFinite(Number(storedOverride.home_score)) ? Number(storedOverride.home_score) : match.home_score,
    away_score: storedOverride?.away_score != null && Number.isFinite(Number(storedOverride.away_score)) ? Number(storedOverride.away_score) : match.away_score,
    minute: isMatchInProgress(status) && storedOverride?.minute != null && Number.isFinite(Number(storedOverride.minute))
      ? Number(storedOverride.minute)
      : isMatchInProgress(status) && envOverrideApplies && Number.isFinite(Number(env.MATCH_OVERRIDE_MINUTE))
        ? Number(env.MATCH_OVERRIDE_MINUTE)
        : isMatchInProgress(status)
          ? match.minute
          : undefined,
    home_team: envOverrideApplies ? override.home_team : match.home_team,
    away_team: envOverrideApplies ? override.away_team : match.away_team,
    streams: envOverrideApplies ? streamsForMatch(override.id, env, streamConfig) : match.streams,
  };
}

function createOverrideMatch(env = {}, streamConfig = null) {
  const matchId = Number(env.MATCH_OVERRIDE_ID || env.STREAM_OVERRIDE_MATCH_ID);
  if (!Number.isFinite(matchId) || matchId <= 0) return null;
  const home = env.MATCH_OVERRIDE_HOME || 'VALENCIA';
  const away = env.MATCH_OVERRIDE_AWAY || 'BARCELONA';
  const scheduledAt = env.MATCH_OVERRIDE_SCHEDULED_AT || new Date().toISOString();
  const status = keepScheduledBeforeKickoff(env.MATCH_OVERRIDE_STATUS || 'scheduled', scheduledAt);
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
    scheduled_at: scheduledAt,
    status,
    home_score: Number.isFinite(Number(env.MATCH_OVERRIDE_HOME_SCORE)) ? Number(env.MATCH_OVERRIDE_HOME_SCORE) : 0,
    away_score: Number.isFinite(Number(env.MATCH_OVERRIDE_AWAY_SCORE)) ? Number(env.MATCH_OVERRIDE_AWAY_SCORE) : 0,
    minute: isMatchInProgress(status) && Number.isFinite(Number(env.MATCH_OVERRIDE_MINUTE)) ? Number(env.MATCH_OVERRIDE_MINUTE) : undefined,
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
  let apiStreamOverrides = {};
  try {
    damiStreams = await fetchDamiStreams(env);
    apiStreamOverrides = await readRuntimeApiStreamOverrides(env);
  } catch {
    return matches;
  }
  if (!damiStreams.length) return matches;
  return matches.map((match) => {
    if (match?.status === 'finished') return match;
    const manualStreams = Array.isArray(match?.streams) ? match.streams : [];
    const autoStreams = damiStreamsForMatch(match, damiStreams, env, apiStreamOverrides);
    const mergedStreams = mergeStreamsByLanguageAndUrl(manualStreams, autoStreams);
    return mergedStreams.length ? { ...match, streams: mergedStreams } : match;
  });
}

async function fetchDamiStreams(env = {}, options = {}) {
  if (!options.force) {
    const cached = await readCachedDamiStreams(env);
    if (cached) {
      await recordMetric(env, 'dami_cache_hits');
      return cached;
    }
  }

  const configuredUrl = String(env.DAMI_STREAMS_API_URL || '').trim();
  const urls = [configuredUrl, DAMI_STREAMS_API_URL, DAMI_STREAMS_FALLBACK_API_URL].filter(Boolean);
  const uniqueUrls = [...new Set(urls)];
  for (const url of uniqueUrls) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'KingLive/1.0 (+https://kinglive.live)',
        },
      });
      if (!response.ok) continue;
      const payload = await response.json();
      const categories = Array.isArray(payload?.streams) ? payload.streams : [];
      const streams = categories.flatMap((category) => Array.isArray(category?.streams) ? category.streams : []);
      await writeCachedDamiStreams(env, streams);
      await recordMetric(env, 'last_dami_update', new Date().toISOString());
      return streams;
    } catch {}
  }
  return [];
}

async function readCachedDamiStreams(env = {}) {
  if (!env.STREAM_CONFIG_KV?.get) return null;
  try {
    const raw = await env.STREAM_CONFIG_KV.get(DAMI_STREAMS_KV_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    const fetchedAt = Date.parse(payload?.fetched_at || '');
    if (!Number.isFinite(fetchedAt) || Date.now() - fetchedAt > DAMI_STREAMS_TTL_SECONDS * 1000) return null;
    return Array.isArray(payload?.streams) ? payload.streams : null;
  } catch {
    return null;
  }
}

async function writeCachedDamiStreams(env = {}, streams = []) {
  if (!env.STREAM_CONFIG_KV?.put) return false;
  try {
    await env.STREAM_CONFIG_KV.put(
      DAMI_STREAMS_KV_KEY,
      JSON.stringify({ fetched_at: new Date().toISOString(), streams: Array.isArray(streams) ? streams : [] }),
      { expirationTtl: DAMI_STREAMS_TTL_SECONDS },
    );
    return true;
  } catch {
    return false;
  }
}

function damiStreamsForMatch(match = {}, damiStreams = [], env = {}, apiStreamOverrides = {}) {
  const damiMatch = damiStreams.find((stream) => isDamiMatchForFixture(stream, match));
  if (!damiMatch) return [];
  const streams = [];
  const sources = Array.isArray(damiMatch.sources) ? damiMatch.sources : [];
  const window = damiStreamWindow(damiMatch);
  sources.forEach((source, index) => {
    if (isBlockedDamiSource(source)) return;
    const url = String(source?.embed || '').trim();
    if (!url) return;
    const channel = damiChannelFromUrl(url);
    const language = damiLanguageForSource(source, channel, env) || 'und';
    streams.push(applyApiStreamOverride({
      id: hashToPositiveInt(`${match.id}:dami:${index}:${url}`),
      url,
      source_type: 'iframe',
      label: damiSourceLabel(source, index, language),
      language_code: language,
      region: 'global',
      quality: '720p',
      priority: 90 - index,
      commentary_type: 'full',
      playback_mode: 'auto',
      is_active: true,
      starts_at: window.starts_at,
      ends_at: window.ends_at,
    }, match.id, apiStreamOverrides));
  });
  parseDamiExtraLanguageChannels(env.DAMI_EXTRA_LANGUAGE_CHANNELS).forEach((extra, index) => {
    const url = damiEmbedUrlForChannel(damiMatch, extra.channel);
    if (!url || streams.some((stream) => stream.url === url)) return;
    streams.push(applyApiStreamOverride({
      id: hashToPositiveInt(`${match.id}:dami:${extra.language}:${extra.channel}`),
      url,
      source_type: 'iframe',
      label: damiLanguageLabel(extra.language),
      language_code: extra.language,
      region: 'global',
      quality: '720p',
      priority: 80 - index,
      commentary_type: 'full',
      playback_mode: 'auto',
      is_active: true,
      starts_at: window.starts_at,
      ends_at: window.ends_at,
    }, match.id, apiStreamOverrides));
  });
  if (!streams.length && damiMatch.iframe) {
    streams.push(applyApiStreamOverride({
      id: hashToPositiveInt(`${match.id}:dami:iframe`),
      url: String(damiMatch.iframe),
      source_type: 'iframe',
      label: 'DAMI stream',
      language_code: 'en',
      region: 'global',
      quality: '720p',
      priority: 50,
      commentary_type: 'full',
      playback_mode: 'auto',
      is_active: true,
      starts_at: window.starts_at,
      ends_at: window.ends_at,
    }, match.id, apiStreamOverrides));
  }
  return streams.filter((stream) => env.ADMIN_DAMI_LIST === 'true' || stream?.is_active !== false);
}

function applyApiStreamOverride(stream = {}, matchId, apiStreamOverrides = {}) {
  const apiStreamId = `dami-${matchId}-${stream.id}`;
  const override = apiStreamOverrides[apiStreamId];
  if (!override) return { ...stream, api_stream_id: apiStreamId, api_overridden: false };
  return {
    ...stream,
    ...override,
    id: stream.id,
    match_id: undefined,
    api_stream_id: apiStreamId,
    api_overridden: true,
    is_active: override.is_active !== false,
    starts_at: override.starts_at || stream.starts_at || null,
    ends_at: override.ends_at || stream.ends_at || null,
  };
}

function isBlockedDamiSource(source = {}) {
  return String(source.id || '').trim().toLowerCase() === 's1';
}

function damiStreamWindow(damiMatch = {}) {
  return {
    starts_at: unixSecondsToIso(damiMatch.starts_at),
    ends_at: unixSecondsToIso(damiMatch.ends_at),
  };
}

function unixSecondsToIso(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

function damiSourceLabel(source = {}, index = 0, language = '') {
  const sourceId = String(source.id || '').trim();
  if (sourceId) return sourceId.toUpperCase();
  const sourceName = String(source.source || source.name || source.channelName || source.label || '').trim();
  if (sourceName) return sourceName.toUpperCase();
  if (language && language !== 'und') return damiLanguageLabel(language);
  return `S${index + 1}`;
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
  if (!isDamiTimeCompatible(damiStream, match)) return false;
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

function isDamiTimeCompatible(damiStream = {}, match = {}) {
  const kickoff = Date.parse(match?.scheduled_at || '');
  const startsAt = Number(damiStream.starts_at) * 1000;
  const endsAt = Number(damiStream.ends_at) * 1000;
  if (!Number.isFinite(kickoff)) return true;
  if (!Number.isFinite(startsAt) || startsAt <= 0 || !Number.isFinite(endsAt) || endsAt <= 0) return true;
  const toleranceMs = 2 * 60 * 60 * 1000;
  return kickoff >= startsAt - toleranceMs && kickoff <= endsAt + toleranceMs;
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
      playback_mode: 'auto',
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
    playback_mode: normalizePlaybackMode(stream.playback_mode || stream.playbackMode),
    is_active: stream.is_active !== false && stream.isActive !== false,
    title: stream.title || '',
    starts_at: normalizeOptionalDateTime(stream.starts_at || stream.startsAt),
    ends_at: normalizeOptionalDateTime(stream.ends_at || stream.endsAt),
    restream_id: stream.restream_id || stream.restreamId || null,
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
    const bookmakerId = Number(odd.bookmaker_id ?? odd.bookmaker?.id);
    const bookmaker = String(odd.bookmaker?.name || '').trim().toLowerCase();
    return (bookmakerId === MELBET_BOOKMAKER_ID || bookmaker === 'melbet') && normalizeSportmonksOddsMarketKey(odd);
  });

  if (!rows.length) return null;

  const fulltime = { home: null, draw: null, away: null };
  const goalLine = { over: null, under: null };
  const handicap = { home: null, away: null };
  let latestUpdatedAt = '';
  rows.forEach((odd) => {
    const market = normalizeSportmonksOddsMarketKey(odd);
    const oddValue = normalizedOddValue(odd);
    if (!oddValue) return;
    if (market === 'fulltime') {
      const key = normalizeFulltimeOutcome(odd);
      if (key && !fulltime[key]) fulltime[key] = oddValue;
    } else if (market === 'goal_line') {
      const key = normalizeGoalLineOutcome(odd);
      if (key && !goalLine[key]) goalLine[key] = oddValue;
    } else if (market === 'asian_handicap') {
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

function normalizeSportmonksOddsMarketKey(odd = {}) {
  const value = String(odd.market?.developer_name || odd.market?.name || odd.market_description || '').trim().toLowerCase();
  if (['fulltime_result', 'fulltime result', 'full time result', 'match winner', 'winner'].includes(value)) return 'fulltime';
  if (['goal_line', 'goal line', 'total goals', 'over/under', 'over under'].includes(value)) return 'goal_line';
  if (['asian_handicap', 'asian handicap', 'handicap'].includes(value)) return 'asian_handicap';
  return '';
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

function normalizeSportmonksPredictions(predictions = []) {
  return sportmonksDataList({ data: predictions })
    .map((prediction, index) => {
      const outcomes = normalizePredictionOutcomes(prediction.predictions);
      if (!outcomes.length) return null;
      const label = cleanPredictionLabel(prediction.type?.name || prediction.type?.developer_name || prediction.type?.code || `Prediction ${index + 1}`);
      return {
        id: Number(prediction.id) || hashToPositiveInt(`prediction:${index}:${label}`),
        key: normalizePredictionKey(prediction.type?.developer_name || prediction.type?.code || label),
        label,
        outcomes,
      };
    })
    .filter(Boolean)
    .slice(0, 6);
}

function normalizePredictionOutcomes(value = {}) {
  if (!value || typeof value !== 'object') return [];
  const entries = [];
  Object.entries(value).forEach(([key, item]) => {
    if (item && typeof item === 'object') {
      Object.entries(item).forEach(([nestedKey, nestedValue]) => {
        if (isScalarPredictionValue(nestedValue)) entries.push([`${key}_${nestedKey}`, nestedValue]);
      });
      return;
    }
    if (isScalarPredictionValue(item)) entries.push([key, item]);
  });
  return entries
    .map(([key, item]) => ({
      key: normalizePredictionKey(key),
      label: cleanPredictionLabel(key),
      value: formatPredictionValue(item),
    }))
    .filter((item) => item.value)
    .slice(0, 8);
}

function isScalarPredictionValue(value) {
  return value != null && ['string', 'number', 'boolean'].includes(typeof value);
}

function formatPredictionValue(value) {
  const text = String(value).trim();
  if (!text) return '';
  if (text.endsWith('%')) return text;
  const number = Number(text);
  if (!Number.isFinite(number)) return text;
  return `${Number.isInteger(number) ? number : number.toFixed(1).replace(/\.0$/, '')}%`;
}

function normalizePredictionKey(value = '') {
  return String(value || 'prediction').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'prediction';
}

function cleanPredictionLabel(value = '') {
  const text = String(value || '').replace(/[_-]+/g, ' ').trim();
  if (!text) return 'Prediction';
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function keepScheduledBeforeKickoff(status, scheduledAt) {
  if (!isMatchInProgress(status)) return status;
  const kickoff = Date.parse(scheduledAt || '');
  if (!Number.isFinite(kickoff)) return status;
  return Date.now() < kickoff ? 'scheduled' : status;
}

function isMatchInProgress(status) {
  return status === 'live' || status === 'half_time';
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
  if (url.pathname === '/api/matches' && url.searchParams.get('date') === new Date().toISOString().slice(0, 10)) return 30;
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

function normalizeCacheUrl(url, provider = '', cacheVersion = '') {
  const normalized = new URL(url);
  if (provider) normalized.searchParams.set('__provider', provider);
  normalized.searchParams.set('__cache_namespace', API_CACHE_NAMESPACE);
  if (cacheVersion) normalized.searchParams.set('__cache_version', cacheVersion);
  normalized.searchParams.sort();
  return normalized;
}

function normalizeSportmonksSubrequestCacheUrl(apiUrl, cacheVersion = '') {
  const normalized = new URL(apiUrl);
  normalized.searchParams.delete('api_token');
  normalized.searchParams.set('__sportmonks_subrequest', '1');
  normalized.searchParams.set('__cache_namespace', API_CACHE_NAMESPACE);
  if (cacheVersion) normalized.searchParams.set('__cache_version', cacheVersion);
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
