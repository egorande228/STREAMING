import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildFootballApiUrl,
  jsonResponse,
  isTopLeagueMatch,
  normalizeFixture,
  normalizeRssNews,
  sortMatches,
  resolveCacheTtl,
  routeRequest,
} from './worker.js';

test('maps site match queries to API-FOOTBALL fixture endpoints', () => {
  assert.equal(
    buildFootballApiUrl(new URL('https://kinglive.test/api/matches?status=live')).toString(),
    'https://v3.football.api-sports.io/fixtures?live=all',
  );
  assert.equal(
    buildFootballApiUrl(new URL('https://kinglive.test/api/matches?status=scheduled')).toString(),
    `https://v3.football.api-sports.io/fixtures?date=${new Date().toISOString().slice(0, 10)}`,
  );
  assert.equal(
    buildFootballApiUrl(new URL('https://kinglive.test/api/matches?date=2026-06-11')).toString(),
    'https://v3.football.api-sports.io/fixtures?date=2026-06-11',
  );
  assert.equal(
    buildFootballApiUrl(new URL('https://kinglive.test/api/matches/42')).toString(),
    'https://v3.football.api-sports.io/fixtures?id=42',
  );
  assert.equal(
    buildFootballApiUrl(new URL('https://kinglive.test/api/matches/42/stats')).toString(),
    'https://v3.football.api-sports.io/fixtures/statistics?fixture=42',
  );
  assert.equal(
    buildFootballApiUrl(new URL('https://kinglive.test/api/matches/42/prematch?home=538&away=539')).toString(),
    'https://v3.football.api-sports.io/fixtures/headtohead?h2h=538-539',
  );
});

test('normalizes API-FOOTBALL fixture into KingLive match JSON', () => {
  const match = normalizeFixture({
    fixture: {
      id: 42,
      date: '2026-06-11T19:00:00+00:00',
      status: { short: '2H', elapsed: 64 },
      venue: { name: 'MetLife Stadium', city: 'New York' },
    },
    league: { name: 'World Cup', round: 'Group Stage - 1' },
    teams: {
      home: { id: 1, name: 'Brazil', code: 'BRA', logo: 'https://logo.test/bra.png' },
      away: { id: 2, name: 'Japan', code: 'JPN', logo: 'https://logo.test/jpn.png' },
    },
    goals: { home: 2, away: 1 },
  });

  assert.equal(match.id, 42);
  assert.equal(match.status, 'live');
  assert.equal(match.minute, 64);
  assert.equal(match.home_score, 2);
  assert.equal(match.away_score, 1);
  assert.equal(match.home_team.name_en, 'Brazil');
  assert.equal(match.away_team.code, 'JPN');
  assert.equal(match.stage, 'Group Stage - 1');
  assert.deepEqual(match.league, { id: undefined, name: 'World Cup', country: '' });
});

test('identifies only top league matches as displayable', () => {
  assert.equal(isTopLeagueMatch({ league: { id: 39, name: 'Premier League' } }), true);
  assert.equal(isTopLeagueMatch({ league: { id: 2, name: 'UEFA Champions League' } }), true);
  assert.equal(isTopLeagueMatch({ league: { id: 15, name: 'FIFA Club World Cup' } }), true);
  assert.equal(isTopLeagueMatch({ league: { id: 390, name: 'Premier League' } }), false);
  assert.equal(isTopLeagueMatch({ league: { id: 292, name: 'K League 1' } }), false);
  assert.equal(isTopLeagueMatch({ league: { id: 567, name: 'Ligi kuu Bara' } }), false);
});

test('sorts top league matches by live state, league priority, then kickoff', () => {
  const matches = [
    {
      id: 2,
      status: 'scheduled',
      scheduled_at: '2026-05-12T20:00:00+00:00',
      league: { id: 39, name: 'Premier League' },
    },
    {
      id: 3,
      status: 'live',
      scheduled_at: '2026-05-12T10:00:00+00:00',
      league: { id: 292, name: 'K League 1' },
    },
    {
      id: 4,
      status: 'live',
      scheduled_at: '2026-05-12T10:30:00+00:00',
      league: { id: 2, name: 'UEFA Champions League' },
    },
    {
      id: 5,
      status: 'finished',
      scheduled_at: '2026-05-12T00:00:00+00:00',
      league: { id: 39, name: 'Premier League' },
    },
  ];

  assert.deepEqual(
    sortMatches(matches.filter(isTopLeagueMatch)).map((match) => match.id),
    [4, 2, 5],
  );
});

test('uses short TTL for live data and day-level TTL for non-live feeds', () => {
  assert.equal(resolveCacheTtl(new URL('https://kinglive.test/api/matches?status=live')), 30);
  assert.equal(resolveCacheTtl(new URL('https://kinglive.test/api/matches?status=half_time')), 30);
  assert.equal(resolveCacheTtl(new URL('https://kinglive.test/api/matches/42/stats')), 1800);

  const newsTtl = resolveCacheTtl(new URL('https://kinglive.test/api/news'));
  assert.equal(newsTtl > 60, true);
  assert.equal(newsTtl <= 86400, true);

  const fixturesTtl = resolveCacheTtl(new URL('https://kinglive.test/api/matches?date=2026-06-11'));
  assert.equal(fixturesTtl > 60, true);
  assert.equal(fixturesTtl <= 86400, true);

  assert.equal(resolveCacheTtl(new URL('https://kinglive.test/api/matches/42')), 1800);
});

test('returns empty match list when API key is not configured', async () => {
  const response = await routeRequest(new Request('https://kinglive.test/api/matches'), {}, {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { matches: [], total: 0, source: 'not_configured' });
});

test('returns upstream API errors instead of masking them as empty matches', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        errors: { plan: 'Free plans do not have access to the Next parameter.' },
        response: [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  try {
    const response = await routeRequest(
      new Request('https://kinglive.test/api/matches?status=scheduled'),
      { API_FOOTBALL_KEY: 'test-key' },
      {},
    );

    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      error: 'football_api_error',
      details: { plan: 'Free plans do not have access to the Next parameter.' },
    });
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('normalizes BBC football RSS into compact news JSON', () => {
  const news = normalizeRssNews(
    `<?xml version="1.0"?>
    <rss><channel>
      <item>
        <title><![CDATA[Assist of the season?]]></title>
        <description><![CDATA[Phil Foden keeps title hopes alive.]]></description>
        <link>https://www.bbc.com/sport/football/articles/test?at_medium=RSS&amp;at_campaign=rss</link>
        <guid isPermaLink="false">https://www.bbc.com/sport/football/articles/test#0</guid>
        <pubDate>Wed, 13 May 2026 22:44:04 GMT</pubDate>
        <media:thumbnail width="240" height="135" url="https://ichef.bbci.co.uk/test.jpg"/>
      </item>
    </channel></rss>`,
  );

  assert.deepEqual(news, [
    {
      id: 'https://www.bbc.com/sport/football/articles/test#0',
      title: 'Assist of the season?',
      summary: 'Phil Foden keeps title hopes alive.',
      full_text: 'Phil Foden keeps title hopes alive.',
      has_full_text: false,
      url: 'https://www.bbc.com/sport/football/articles/test?at_medium=RSS&at_campaign=rss',
      published_at: 'Wed, 13 May 2026 22:44:04 GMT',
      image_url: 'https://ichef.bbci.co.uk/test.jpg',
      source: 'BBC Sport',
    },
  ]);
});

test('extracts full text when content:encoded is present in RSS item', () => {
  const news = normalizeRssNews(
    `<?xml version="1.0"?>
    <rss><channel>
      <item>
        <title><![CDATA[Matchday report]]></title>
        <description><![CDATA[Short preview.]]></description>
        <content:encoded><![CDATA[
          <p>Paragraph one from full article.</p>
          <p>Paragraph two with <strong>details</strong>.</p>
        ]]></content:encoded>
        <link>https://www.bbc.com/sport/football/articles/full</link>
        <guid isPermaLink="false">full-guid</guid>
      </item>
    </channel></rss>`,
  );

  assert.equal(news[0].summary, 'Short preview.');
  assert.equal(news[0].has_full_text, true);
  assert.equal(news[0].full_text, 'Paragraph one from full article.\n\nParagraph two with details.');
});

test('upgrades BBC thumbnail URLs to a larger image size', () => {
  const news = normalizeRssNews(
    `<?xml version="1.0"?>
    <rss><channel>
      <item>
        <title><![CDATA[Big image test]]></title>
        <description><![CDATA[Test summary.]]></description>
        <link>https://www.bbc.com/sport/football/articles/image-test</link>
        <guid isPermaLink="false">image-test-guid</guid>
        <media:thumbnail width="240" height="135" url="https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/test.jpg"/>
      </item>
    </channel></rss>`,
  );

  assert.equal(news[0].image_url, 'https://ichef.bbci.co.uk/ace/standard/1024/cpsprodpb/test.jpg');
});

test('returns BBC football RSS news without requiring API-FOOTBALL key', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title><![CDATA[Football headline]]></title>
          <description><![CDATA[Football summary.]]></description>
          <link>https://www.bbc.com/sport/football/articles/news</link>
          <guid isPermaLink="false">news-guid</guid>
          <pubDate>Thu, 14 May 2026 09:33:49 GMT</pubDate>
        </item>
      </channel></rss>`,
      { status: 200, headers: { 'Content-Type': 'application/rss+xml' } },
    );

  try {
    const response = await routeRequest(new Request('https://kinglive.test/api/news?limit=1'), {}, {});
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      source: 'BBC Sport Football',
      feed_url: 'https://feeds.bbci.co.uk/sport/football/rss.xml',
      lang: 'en',
      news: [
        {
          id: 'news-guid',
          title: 'Football headline',
          summary: 'Football summary.',
          full_text: 'Football summary.',
          has_full_text: false,
          url: 'https://www.bbc.com/sport/football/articles/news',
          published_at: 'Thu, 14 May 2026 09:33:49 GMT',
          image_url: '',
          source: 'BBC Sport',
        },
      ],
    });
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('returns Arabic football RSS news when lang=ar is requested', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title><![CDATA[ترامب يعلن اتفاقات تجارية]]></title>
          <description><![CDATA[ملخص سياسي غير رياضي.]]></description>
          <link>https://www.bbc.com/arabic/articles/politics-test</link>
          <guid isPermaLink="false">news-guid-ar-politics</guid>
          <pubDate>Fri, 15 May 2026 12:10:00 GMT</pubDate>
        </item>
        <item>
          <title><![CDATA[خبر كرة قدم]]></title>
          <description><![CDATA[ملخص الخبر.]]></description>
          <content:encoded><![CDATA[
            <p>هذا نص الخبر الكامل.</p>
            <p>فقرة ثانية للتفاصيل.</p>
          ]]></content:encoded>
          <link>https://news.google.com/articles/test-ar</link>
          <guid isPermaLink="false">news-guid-ar</guid>
          <pubDate>Fri, 15 May 2026 12:00:00 GMT</pubDate>
        </item>
      </channel></rss>`,
      { status: 200, headers: { 'Content-Type': 'application/rss+xml' } },
    );

  try {
    const response = await routeRequest(new Request('https://kinglive.test/api/news?limit=1&lang=ar'), {}, {});
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      source: 'BBC Arabic',
      feed_url: 'https://feeds.bbci.co.uk/arabic/rss.xml',
      lang: 'ar',
      news: [
        {
          id: 'news-guid-ar',
          title: 'خبر كرة قدم',
          summary: 'ملخص الخبر.',
          full_text: 'هذا نص الخبر الكامل.\n\nفقرة ثانية للتفاصيل.',
          has_full_text: true,
          url: 'https://news.google.com/articles/test-ar',
          published_at: 'Fri, 15 May 2026 12:00:00 GMT',
          image_url: '',
          source: 'BBC Arabic',
        },
      ],
    });
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('falls back to Google Arabic football feed when BBC Arabic filter has no football items', async () => {
  const previousFetch = globalThis.fetch;
  let call = 0;
  globalThis.fetch = async () => {
    call += 1;
    if (call === 1) {
      return new Response(
        `<?xml version="1.0"?>
        <rss><channel>
          <item>
            <title><![CDATA[خبر سياسي عام]]></title>
            <description><![CDATA[ملخص سياسي عام بلا رياضة.]]></description>
            <link>https://www.bbc.com/arabic/articles/politics-only</link>
            <guid isPermaLink="false">politics-only-guid</guid>
            <pubDate>Fri, 15 May 2026 12:10:00 GMT</pubDate>
          </item>
        </channel></rss>`,
        { status: 200, headers: { 'Content-Type': 'application/rss+xml' } },
      );
    }

    return new Response(
      `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title><![CDATA[كرة القدم: خبر عاجل]]></title>
          <description><![CDATA[ملخص كروي من Google News.]]></description>
          <link>https://news.google.com/articles/google-football-ar</link>
          <guid isPermaLink="false">google-football-guid</guid>
          <pubDate>Fri, 15 May 2026 12:20:00 GMT</pubDate>
        </item>
      </channel></rss>`,
      { status: 200, headers: { 'Content-Type': 'application/rss+xml' } },
    );
  };

  try {
    const response = await routeRequest(new Request('https://kinglive.test/api/news?limit=1&lang=ar'), {}, {});
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.source, 'Google News Arabic Football');
    assert.equal(
      body.feed_url,
      'https://news.google.com/rss/search?q=%D9%83%D8%B1%D8%A9+%D8%A7%D9%84%D9%82%D8%AF%D9%85&hl=ar&gl=AE&ceid=AE:ar',
    );
    assert.equal(body.lang, 'ar');
    assert.equal(body.news.length, 1);
    assert.equal(body.news[0].title, 'كرة القدم: خبر عاجل');
    assert.equal(call, 2);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('falls back to direct BBC RSS when full-text proxy is unavailable', async () => {
  const previousFetch = globalThis.fetch;
  let call = 0;
  globalThis.fetch = async () => {
    call += 1;
    if (call === 1) return new Response('proxy unavailable', { status: 503 });
    return new Response(
      `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title><![CDATA[Fallback headline]]></title>
          <description><![CDATA[Fallback summary.]]></description>
          <link>https://www.bbc.com/sport/football/articles/fallback</link>
          <guid isPermaLink="false">fallback-guid</guid>
          <pubDate>Fri, 15 May 2026 10:20:00 GMT</pubDate>
        </item>
      </channel></rss>`,
      { status: 200, headers: { 'Content-Type': 'application/rss+xml' } },
    );
  };

  try {
    const response = await routeRequest(new Request('https://kinglive.test/api/news?limit=1'), {}, {});
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.news[0].title, 'Fallback headline');
    assert.equal(body.news[0].has_full_text, false);
    assert.equal(call, 2);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('attaches active configured streams to match responses', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        response: [
          {
            fixture: {
              id: 1540843,
              date: '2026-06-11T19:00:00+00:00',
              status: { short: 'NS' },
            },
            league: { id: 39, name: 'Premier League', country: 'England' },
            teams: {
              home: { id: 1, name: 'Arsenal' },
              away: { id: 2, name: 'Atletico Madrid' },
            },
            goals: {},
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  try {
    const response = await routeRequest(
      new Request('https://kinglive.test/api/matches/1540843?lang=en&region=global'),
      {
        API_FOOTBALL_KEY: 'test-key',
        MATCH_STREAMS_JSON: JSON.stringify({
          1540843: 'https://stream.test/live.m3u8',
        }),
      },
      {},
    );

    assert.equal(response.status, 200);
    const match = await response.json();
    assert.equal(match.streams.length, 1);
    assert.equal(match.streams[0].url, 'https://stream.test/live.m3u8');
    assert.equal(match.streams[0].source_type, 'hls');
    assert.equal(match.streams[0].is_active, true);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('does not attach stream before starts_at and exposes it in /api/streams/active after start', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        response: [
          {
            fixture: {
              id: 1540843,
              date: '2026-06-11T19:00:00+00:00',
              status: { short: 'NS' },
            },
            league: { id: 39, name: 'Premier League', country: 'England' },
            teams: {
              home: { id: 1, name: 'Arsenal' },
              away: { id: 2, name: 'Atletico Madrid' },
            },
            goals: {},
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  const now = Date.now();
  const startsAtFuture = new Date(now + 60_000).toISOString();
  const startsAtPast = new Date(now - 60_000).toISOString();
  const endsAtFuture = new Date(now + 5 * 60_000).toISOString();

  try {
    const env = {
      API_FOOTBALL_KEY: 'test-key',
      MATCH_STREAMS_JSON: JSON.stringify({
        1540843: {
          url: 'https://stream.test/live.m3u8',
          starts_at: startsAtFuture,
          ends_at: endsAtFuture,
          is_active: true,
        },
      }),
    };

    const notStarted = await routeRequest(new Request('https://kinglive.test/api/matches/1540843'), env, {});
    assert.equal(notStarted.status, 200);
    const notStartedMatch = await notStarted.json();
    assert.equal(Array.isArray(notStartedMatch.streams), true);
    assert.equal(notStartedMatch.streams.length, 0);

    const activeEnv = {
      ...env,
      MATCH_STREAMS_JSON: JSON.stringify({
        1540843: {
          url: 'https://stream.test/live.m3u8',
          starts_at: startsAtPast,
          ends_at: endsAtFuture,
          is_active: true,
        },
      }),
    };

    const activePublic = await routeRequest(new Request('https://kinglive.test/api/streams/active'), activeEnv, {});
    assert.equal(activePublic.status, 200);
    const payload = await activePublic.json();
    assert.deepEqual(payload.match_ids, ['1540843']);
    assert.equal(payload.total_matches, 1);
    assert.equal(payload.total_streams, 1);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('ignores any stream-like data from the football API payload', () => {
  const match = normalizeFixture(
    {
      fixture: {
        id: 1540843,
        date: '2026-06-11T19:00:00+00:00',
        status: { short: 'NS' },
      },
      teams: {
        home: { id: 1, name: 'Arsenal' },
        away: { id: 2, name: 'Atletico Madrid' },
      },
      goals: {},
      streams: [{ url: 'https://external.test/live.m3u8' }],
    },
    {},
  );

  assert.deepEqual(match.streams, []);
});

test('normalizes fixture statistics into compact match stats JSON', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        response: [
          {
            team: { id: 1, name: 'Arsenal', logo: 'https://logo.test/ars.png' },
            statistics: [
              { type: 'Ball Possession', value: '61%' },
              { type: 'Shots on Goal', value: 5 },
              { type: 'Total Shots', value: 12 },
              { type: 'Corner Kicks', value: 4 },
            ],
          },
          {
            team: { id: 2, name: 'Atletico Madrid', logo: 'https://logo.test/atm.png' },
            statistics: [
              { type: 'Ball Possession', value: '39%' },
              { type: 'Shots on Goal', value: 3 },
              { type: 'Total Shots', value: 8 },
              { type: 'Corner Kicks', value: 2 },
            ],
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  try {
    const response = await routeRequest(
      new Request('https://kinglive.test/api/matches/1540843/stats'),
      { API_FOOTBALL_KEY: 'test-key' },
      {},
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      match_id: 1540843,
      teams: [
        {
          team: { id: 1, name: 'Arsenal', logo: 'https://logo.test/ars.png' },
          stats: {
            possession: '61%',
            shots_on_goal: 5,
            total_shots: 12,
            corners: 4,
            fouls: null,
            yellow_cards: null,
            red_cards: null,
          },
        },
        {
          team: { id: 2, name: 'Atletico Madrid', logo: 'https://logo.test/atm.png' },
          stats: {
            possession: '39%',
            shots_on_goal: 3,
            total_shots: 8,
            corners: 2,
            fouls: null,
            yellow_cards: null,
            red_cards: null,
          },
        },
      ],
    });
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('normalizes prematch head-to-head history into compact stats', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        response: [
          {
            fixture: { status: { short: 'FT' } },
            teams: {
              home: { id: 538, name: 'Celta Vigo', winner: true },
              away: { id: 539, name: 'Levante', winner: false },
            },
            goals: { home: 2, away: 0 },
          },
          {
            fixture: { status: { short: 'FT' } },
            teams: {
              home: { id: 539, name: 'Levante', winner: null },
              away: { id: 538, name: 'Celta Vigo', winner: null },
            },
            goals: { home: 1, away: 1 },
          },
          {
            fixture: { status: { short: 'NS' } },
            teams: {
              home: { id: 538, name: 'Celta Vigo', winner: null },
              away: { id: 539, name: 'Levante', winner: null },
            },
            goals: { home: null, away: null },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  try {
    const response = await routeRequest(
      new Request('https://kinglive.test/api/matches/1391171/prematch?home=538&away=539'),
      { API_FOOTBALL_KEY: 'test-key' },
      {},
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      match_id: 1391171,
      sample_size: 2,
      home: { team_id: 538, wins: 1, goals: 3 },
      away: { team_id: 539, wins: 0, goals: 1 },
      draws: 1,
      label: 'Head-to-head last 2 matches',
    });
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('adds CORS headers to JSON responses', () => {
  const response = jsonResponse({ ok: true }, 200, 60);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(response.headers.get('Access-Control-Allow-Headers'), 'Content-Type, Authorization');
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=60');
});

test('authenticates admin login and performs stream CRUD in KV', async () => {
  const kvData = new Map();
  const kv = {
    async get(key) {
      return kvData.get(key) || null;
    },
    async put(key, value) {
      kvData.set(key, value);
    },
  };
  const env = {
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'secret',
    ADMIN_BEARER_TOKEN: 'test-token',
    STREAM_CONFIG_KV: kv,
  };

  const login = await routeRequest(
    new Request('https://kinglive.test/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'secret' }),
    }),
    env,
    {},
  );
  assert.equal(login.status, 200);
  assert.deepEqual(await login.json(), { token: 'test-token' });

  const unauthorized = await routeRequest(new Request('https://kinglive.test/api/admin/streams'), env, {});
  assert.equal(unauthorized.status, 401);

  const create = await routeRequest(
    new Request('https://kinglive.test/api/admin/streams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        match_id: 42,
        url: 'https://stream.test/live.m3u8',
        source_type: 'hls',
        label: 'Main stream',
      }),
    }),
    env,
    {},
  );
  assert.equal(create.status, 200);
  const created = await create.json();
  assert.equal(typeof created.id, 'number');

  const list = await routeRequest(
    new Request('https://kinglive.test/api/admin/streams', {
      headers: { Authorization: 'Bearer test-token' },
    }),
    env,
    {},
  );
  assert.equal(list.status, 200);
  const listBody = await list.json();
  assert.equal(listBody.total, 1);
  assert.equal(listBody.streams[0].match_id, 42);

  const update = await routeRequest(
    new Request(`https://kinglive.test/api/admin/streams/${created.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        match_id: 42,
        url: 'https://stream.test/embed',
        source_type: 'iframe',
        label: 'Updated',
        is_active: true,
      }),
    }),
    env,
    {},
  );
  assert.equal(update.status, 200);

  const remove = await routeRequest(
    new Request(`https://kinglive.test/api/admin/streams/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer test-token' },
    }),
    env,
    {},
  );
  assert.equal(remove.status, 200);
});

test('stores match chat messages in KV and rate limits posts', async () => {
  const kvData = new Map();
  const kv = {
    async get(key) {
      return kvData.get(key) || null;
    },
    async put(key, value) {
      kvData.set(key, value);
    },
  };
  const env = { STREAM_CONFIG_KV: kv };

  const create = await routeRequest(
    new Request('https://kinglive.test/api/chat/1540843', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '203.0.113.10',
      },
      body: JSON.stringify({
        author: 'Alex',
        message: 'Hello from the match chat',
        client_id: 'client-1',
      }),
    }),
    env,
    {},
  );
  assert.equal(create.status, 200);
  const created = await create.json();
  assert.equal(created.message.match_id, 1540843);
  assert.equal(created.message.author, 'Alex');
  assert.equal(created.message.message, 'Hello from the match chat');

  const list = await routeRequest(new Request('https://kinglive.test/api/chat/1540843'), env, {});
  assert.equal(list.status, 200);
  const listBody = await list.json();
  assert.equal(listBody.messages.length, 1);
  assert.equal(listBody.messages[0].message, 'Hello from the match chat');

  const limited = await routeRequest(
    new Request('https://kinglive.test/api/chat/1540843', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '203.0.113.10',
      },
      body: JSON.stringify({
        author: 'Alex',
        message: 'Second message too fast',
        client_id: 'client-1',
      }),
    }),
    env,
    {},
  );
  assert.equal(limited.status, 429);
  assert.deepEqual(await limited.json(), { error: 'rate_limited', retry_after: 5 });
});

test('blocks admin login when access enforcement is enabled and CF access identity is missing', async () => {
  const response = await routeRequest(
    new Request('https://kinglive.test/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'secret' }),
    }),
    {
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: 'secret',
      ADMIN_BEARER_TOKEN: 'test-token',
      ADMIN_REQUIRE_ACCESS: 'true',
      ADMIN_ACCESS_EMAILS: 'admin@example.com',
    },
    {},
  );
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'unauthorized' });
});
