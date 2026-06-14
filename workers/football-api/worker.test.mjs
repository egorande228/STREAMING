import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker, {
  buildFootballApiUrl,
  buildSportmonksApiUrl,
  jsonResponse,
  isTopLeagueMatch,
  normalizeFixture,
  normalizeSportmonksFixture,
  normalizeRssNews,
  normalizeSportmonksMatchDetails,
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

test('serves DAMI embed proxy as a lightweight HTML wrapper', async () => {
  const disabled = await routeRequest(new Request('https://kinglive.test/api/embed-proxy/dami?ch=533'), {}, {});
  assert.equal(disabled.status, 503);

  const response = await routeRequest(
    new Request('https://kinglive.test/api/embed-proxy/dami?ch=533'),
    { DAMI_EMBED_PROXY_ENABLED: 'true' },
    {},
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/html/);
  const html = await response.text();
  assert.match(html, /https:\/\/dami-tv\.pro\/hls-player\/\?ch=533/);
  assert.match(html, /Object\.defineProperty\(window, 'open'/);
  assert.doesNotMatch(html, /papi\/tv\/resolve/);
});

test('maps site match queries to Sportmonks fixture and livescore endpoints', () => {
  assert.equal(
    buildSportmonksApiUrl(new URL('https://kinglive.test/api/matches?status=live')).toString(),
    'https://api.sportmonks.com/v3/football/livescores/inplay?include=participants%3Bscores%3Bevents.type%3Bstatistics.type%3Bperiods%3Bstate%3Bvenue%3Bstage%3Bleague',
  );
  assert.equal(
    buildSportmonksApiUrl(new URL('https://kinglive.test/api/matches?date=2026-06-11')).toString(),
    'https://api.sportmonks.com/v3/football/fixtures/date/2026-06-11?include=participants%3Bscores%3Bevents.type%3Bstatistics.type%3Bperiods%3Bstate%3Bvenue%3Bstage%3Bleague',
  );
  assert.equal(
    buildSportmonksApiUrl(new URL('https://kinglive.test/api/matches/42')).toString(),
    'https://api.sportmonks.com/v3/football/fixtures/42?include=participants%3Bscores%3Bevents.type%3Bstatistics.type%3Bperiods%3Bstate%3Bvenue%3Bstage%3Bleague',
  );
  assert.equal(
    buildSportmonksApiUrl(new URL('https://kinglive.test/api/matches/42/stats')).toString(),
    'https://api.sportmonks.com/v3/football/fixtures/42?include=participants%3Bscores%3Bevents.type%3Bstatistics.type%3Blineups.player%3Adisplay_name%2Cimage_path%3Bperiods%3Bstate%3Bvenue%3Bstage%3Bleague',
  );
});

test('maps site language to Sportmonks locale parameters', () => {
  assert.equal(
    buildSportmonksApiUrl(new URL('https://kinglive.test/api/matches?date=2026-06-11&lang=fr')).toString(),
    'https://api.sportmonks.com/v3/football/fixtures/date/2026-06-11?include=participants%3Bscores%3Bevents.type%3Bstatistics.type%3Bperiods%3Bstate%3Bvenue%3Bstage%3Bleague&locale=fr',
  );
  assert.equal(
    buildSportmonksApiUrl(new URL('https://kinglive.test/api/matches/42/stats?lang=ar')).toString(),
    'https://api.sportmonks.com/v3/football/fixtures/42?include=participants%3Bscores%3Bevents.type%3Bstatistics.type%3Blineups.player%3Adisplay_name%2Cimage_path%3Bperiods%3Bstate%3Bvenue%3Bstage%3Bleague&locale=ar',
  );
  assert.equal(
    buildSportmonksApiUrl(new URL('https://kinglive.test/api/matches?date=2026-06-11&lang=mn')).toString(),
    'https://api.sportmonks.com/v3/football/fixtures/date/2026-06-11?include=participants%3Bscores%3Bevents.type%3Bstatistics.type%3Bperiods%3Bstate%3Bvenue%3Bstage%3Bleague',
  );
});

test('returns split Sportmonks match detail endpoints with endpoint-specific cache TTLs', async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (request) => {
    const requestUrl = String(request.url || request);
    calls.push(requestUrl);
    const path = new URL(requestUrl).pathname;
    if (path === '/v3/football/fixtures/42') {
      return new Response(
        JSON.stringify({
          data: {
            id: 42,
            participants: [
              { id: 10, name: 'Brazil', meta: { location: 'home' } },
              { id: 20, name: 'Japan', meta: { location: 'away' } },
            ],
            events: [
              {
                id: 701,
                fixture_id: 42,
                participant_id: 10,
                minute: 18,
                type: { name: 'Goal' },
                player_name: 'Neymar',
                result: '1-0',
              },
            ],
            lineups: [
              {
                id: 801,
                participant_id: 10,
                jersey_number: 10,
                formation_position: 11,
                player: { display_name: 'Neymar', image_path: 'https://cdn.test/neymar.png' },
              },
            ],
            statistics: [
              { participant_id: 10, type: { name: 'Ball Possession' }, data: { value: 58 } },
              { participant_id: 20, type: { name: 'Ball Possession' }, data: { value: 42 } },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (path === '/v3/football/match-facts/42') {
      return new Response(
        JSON.stringify({ data: [{ id: 901, name: 'Brazil are unbeaten in 5', type: { name: 'Streak' } }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (path === '/v3/football/odds/pre-match/fixtures/42') {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 1001,
              bookmaker: { name: 'MelBet' },
              market: { developer_name: 'fulltime_result' },
              label: 'Home',
              value: '1.80',
            },
            {
              id: 1002,
              bookmaker: { name: 'MelBet' },
              market: { developer_name: 'fulltime_result' },
              label: 'Draw',
              value: '3.30',
            },
            {
              id: 1003,
              bookmaker: { name: 'MelBet' },
              market: { developer_name: 'fulltime_result' },
              label: 'Away',
              value: '4.20',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ data: [] }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const env = { SPORTMONKS_TOKEN: 'token' };
    const events = await routeRequest(new Request('https://kinglive.test/api/matches/42/events?live=1&lang=fr'), env, {});
    const lineups = await routeRequest(new Request('https://kinglive.test/api/matches/42/lineups?lang=fr'), env, {});
    const facts = await routeRequest(new Request('https://kinglive.test/api/matches/42/facts?lang=fr'), env, {});
    const odds = await routeRequest(new Request('https://kinglive.test/api/matches/42/odds?lang=fr'), env, {});

    assert.equal(events.headers.get('Cache-Control'), 'public, max-age=30');
    assert.equal(lineups.headers.get('Cache-Control'), 'public, max-age=1800');
    assert.equal(facts.headers.get('Cache-Control'), 'public, max-age=1800');
    assert.equal(odds.headers.get('Cache-Control'), 'public, max-age=300');
    assert.equal((await events.json()).events[0].player_name, 'Neymar');
    assert.equal((await lineups.json()).lineups[0].image_url, 'https://cdn.test/neymar.png');
    assert.equal((await facts.json()).facts[0].text, 'Brazil are unbeaten in 5');
    assert.equal((await odds.json()).odds.markets[0].outcomes.home.value, '1.80');
    assert.equal(calls.some((url) => url.includes('locale=fr')), true);
  } finally {
    globalThis.fetch = previousFetch;
  }
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

test('normalizes Sportmonks fixture into KingLive match JSON', () => {
  const match = normalizeSportmonksFixture({
    id: 42,
    name: 'Brazil vs Japan',
    starting_at: '2026-06-11 19:00:00',
    state: { short_name: '2nd' },
    venue: { name: 'MetLife Stadium', city_name: 'New York' },
    stage: { name: 'Group Stage' },
    league: { id: 732, name: 'FIFA World Cup', country: { name: 'World' } },
    participants: [
      { id: 1, name: 'Brazil', short_code: 'BRA', image_path: 'https://logo.test/bra.png', meta: { location: 'home' } },
      { id: 2, name: 'Japan', short_code: 'JPN', image_path: 'https://logo.test/jpn.png', meta: { location: 'away' } },
    ],
    scores: [
      { description: 'CURRENT', score: { goals: 2, participant: 'home' } },
      { description: 'CURRENT', score: { goals: 1, participant: 'away' } },
    ],
    periods: [{ type_id: 2, minutes: 64, ticking: true }],
  });

  assert.equal(match.id, 42);
  assert.equal(match.status, 'live');
  assert.equal(match.minute, 64);
  assert.equal(match.home_score, 2);
  assert.equal(match.away_score, 1);
  assert.equal(match.home_team.name_en, 'Brazil');
  assert.equal(match.away_team.code, 'JPN');
  assert.equal(match.stage, 'Group Stage');
  assert.deepEqual(match.league, { id: 732, name: 'FIFA World Cup', country: 'World' });
});

test('keeps future Sportmonks fixtures scheduled even when upstream state is live', () => {
  const futureKickoff = new Date(Date.now() + 30 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  const match = normalizeSportmonksFixture({
    id: 1540843,
    name: 'Korea Republic vs Czech Republic',
    starting_at: futureKickoff,
    state: { short_name: '1st' },
    league: { id: 732, name: 'FIFA World Cup', country: { name: 'World' } },
    participants: [
      { id: 1, name: 'Korea Republic', short_code: 'KOR', meta: { location: 'home' } },
      { id: 2, name: 'Czech Republic', short_code: 'CZE', meta: { location: 'away' } },
    ],
    scores: [],
    periods: [{ type_id: 1, minutes: 1, ticking: true }],
  });

  assert.equal(match.status, 'scheduled');
  assert.equal(match.minute, undefined);
});

test('keeps future override fixtures scheduled even when override status is live', () => {
  const futureKickoff = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const match = normalizeSportmonksFixture(
    {
      id: 1540843,
      name: 'Korea Republic vs Czech Republic',
      starting_at: futureKickoff.replace('T', ' ').slice(0, 19),
      state: { short_name: 'NS' },
      league: { id: 732, name: 'FIFA World Cup', country: { name: 'World' } },
      participants: [
        { id: 1, name: 'Korea Republic', short_code: 'KOR', meta: { location: 'home' } },
        { id: 2, name: 'Czech Republic', short_code: 'CZE', meta: { location: 'away' } },
      ],
      scores: [],
      periods: [],
    },
    {
      MATCH_OVERRIDE_ID: '1540843',
      MATCH_OVERRIDE_SCHEDULED_AT: futureKickoff,
      MATCH_OVERRIDE_STATUS: 'live',
      MATCH_OVERRIDE_MINUTE: '1',
    },
  );

  assert.equal(match.status, 'scheduled');
  assert.equal(match.minute, undefined);
});

test('normalizes Sportmonks match details with events, team statistics, lineups, and facts', () => {
  const details = normalizeSportmonksMatchDetails(
    42,
    {
      id: 42,
      participants: [
        { id: 1, name: 'Brazil', meta: { location: 'home' } },
        { id: 2, name: 'Japan', meta: { location: 'away' } },
      ],
      events: [
        {
          id: 10,
          fixture_id: 42,
          participant_id: 1,
          type: { code: 'goal', name: 'Goal' },
          player_name: 'Raphinha',
          related_player_name: 'Vinicius Jr',
          minute: 23,
          extra_minute: null,
          result: '1-0',
          info: 'Left foot shot',
          sort_order: 1,
        },
        {
          id: 11,
          fixture_id: 42,
          team_id: 2,
          type: { code: 'yellowcard', name: 'Yellow Card' },
          player_name: 'Japan Defender',
          minute: 31,
          sort_order: 2,
        },
      ],
      statistics: [
        { participant_id: 1, type: { name: 'Ball Possession' }, data: { value: 58 } },
        { participant_id: 2, type: { name: 'Ball Possession' }, data: { value: 42 } },
        { participant_id: 1, type: { name: 'Shots On Target' }, data: { value: 6 } },
        { participant_id: 2, type: { name: 'Shots On Target' }, data: { value: 3 } },
      ],
      lineups: [
        {
          id: 100,
          participant_id: 1,
          player_name: 'Alisson',
          jersey_number: 1,
          formation_position: 1,
          type_id: 11,
          player: { display_name: 'Alisson Becker', image_path: 'https://cdn.sportmonks.com/images/soccer/players/1/1.png' },
        },
      ],
    },
    [
      { id: 900, name: 'Brazil scored first in this fixture', type: { name: 'Milestone' } },
      {
        id: 901,
        participant: 'both',
        scope: 'all_matches',
        data: { count: 3 },
        type: { name: 'Total H2H Matches', developer_name: 'MATCH_FACT_TOTAL_H2H_MATCHES' },
      },
    ],
    [
      {
        bookmaker: { name: 'MelBet' },
        market: { developer_name: 'FULLTIME_RESULT', name: 'Fulltime Result' },
        label: 'Home',
        value: '1.39',
        probability: '71.94%',
        latest_bookmaker_update: '2026-06-09 10:15:10',
      },
      {
        bookmaker: { name: 'MelBet' },
        market: { developer_name: 'FULLTIME_RESULT', name: 'Fulltime Result' },
        label: 'Draw',
        value: '4.44',
        probability: '22.52%',
        latest_bookmaker_update: '2026-06-09 10:15:10',
      },
      {
        bookmaker: { name: 'MelBet' },
        market: { developer_name: 'FULLTIME_RESULT', name: 'Fulltime Result' },
        label: 'Away',
        value: '8.90',
        probability: '11.24%',
        latest_bookmaker_update: '2026-06-09 10:15:10',
      },
      {
        bookmaker: { name: 'MelBet' },
        market: { developer_name: 'GOAL_LINE', name: 'Goal Line' },
        label: 'Over',
        value: '2.15',
        total: '2.5',
        latest_bookmaker_update: '2026-06-09 10:15:10',
      },
      {
        bookmaker: { name: 'MelBet' },
        market: { developer_name: 'GOAL_LINE', name: 'Goal Line' },
        label: 'Under',
        value: '1.70',
        total: '2.5',
        latest_bookmaker_update: '2026-06-09 10:15:10',
      },
      {
        bookmaker: { name: 'MelBet' },
        market: { developer_name: 'ASIAN_HANDICAP', name: 'Asian Handicap' },
        label: 'Home',
        value: '2.21',
        handicap: '-1.5',
        latest_bookmaker_update: '2026-06-09 10:15:10',
      },
      {
        bookmaker: { name: 'MelBet' },
        market: { developer_name: 'ASIAN_HANDICAP', name: 'Asian Handicap' },
        label: 'Away',
        value: '1.59',
        handicap: '1.5',
        latest_bookmaker_update: '2026-06-09 10:15:10',
      },
      {
        bookmaker: { name: 'Dafabet' },
        market: { developer_name: 'FULLTIME_RESULT', name: 'Fulltime Result' },
        label: 'Home',
        value: '1.43',
      },
    ],
  );

  assert.equal(details.match_id, 42);
  assert.equal(details.home_score, 1);
  assert.equal(details.away_score, 0);
  assert.equal(details.events[0].type, 'goal');
  assert.equal(details.events[0].detail, 'Left foot shot | Assist: Vinicius Jr | Score: 1-0');
  assert.equal(details.events[1].team, 'away');
  assert.equal(details.team_stats[0].stats.possession, 58);
  assert.equal(details.team_stats[1].stats.shots_on_goal, 3);
  assert.equal(details.lineups[0].team, 'home');
  assert.equal(details.lineups[0].player_name, 'Alisson Becker');
  assert.equal(details.lineups[0].image_url, 'https://cdn.sportmonks.com/images/soccer/players/1/1.png');
  assert.equal(details.lineups[0].formation_position, 1);
  assert.equal(details.odds.bookmaker, 'MelBet');
  assert.equal(details.odds.market, 'Fulltime Result');
  assert.equal(details.odds.outcomes.home.value, '1.39');
  assert.equal(details.odds.outcomes.draw.value, '4.44');
  assert.equal(details.odds.outcomes.away.value, '8.90');
  assert.equal(details.odds.markets.length, 3);
  assert.equal(details.odds.markets[1].label, 'Total 2.5');
  assert.equal(details.odds.markets[1].outcomes.over.value, '2.15');
  assert.equal(details.odds.markets[1].outcomes.under.value, '1.70');
  assert.equal(details.odds.markets[2].label, 'Asian Handicap');
  assert.equal(details.odds.markets[2].outcomes.home.handicap, '-1.5');
  assert.equal(details.odds.markets[2].outcomes.away.value, '1.59');
  assert.deepEqual(details.facts, [
    { id: 900, title: 'Milestone', text: 'Brazil scored first in this fixture' },
    { id: 901, title: 'Total H2H Matches', text: 'Head-to-head sample: 3 matches (all matches)' },
  ]);
});

test('does not use non-MelBet fallback odds when Sportmonks returns no usable odds', () => {
  const details = normalizeSportmonksMatchDetails(19609154, {}, [], []);

  assert.equal(details.odds, null);
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
  assert.equal(resolveCacheTtl(new URL('https://kinglive.test/api/matches/42?live=1')), 30);
  assert.equal(resolveCacheTtl(new URL('https://kinglive.test/api/matches/42/stats?live=1')), 30);
  assert.equal(resolveCacheTtl(new URL('https://kinglive.test/api/matches/42/stats')), 1800);

  const newsTtl = resolveCacheTtl(new URL('https://kinglive.test/api/news'));
  assert.equal(newsTtl > 60, true);
  assert.equal(newsTtl <= 86400, true);

  const fixturesTtl = resolveCacheTtl(new URL('https://kinglive.test/api/matches?date=2026-06-11'));
  assert.equal(fixturesTtl > 60, true);
  assert.equal(fixturesTtl <= 86400, true);
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(resolveCacheTtl(new URL(`https://kinglive.test/api/matches?date=${today}`)), 30);

  assert.equal(resolveCacheTtl(new URL('https://kinglive.test/api/matches/42')), 1800);
});

test('admin refresh bumps cache version and forces a fresh Sportmonks request', async () => {
  const previousFetch = globalThis.fetch;
  const previousCaches = globalThis.caches;
  const cacheStore = new Map();
  const kvData = new Map();
  const today = new Date().toISOString().slice(0, 10);
  let sportmonksCalls = 0;

  globalThis.caches = {
    default: {
      async match(request) {
        const cached = cacheStore.get(request.url);
        return cached ? cached.clone() : undefined;
      },
      async put(request, response) {
        cacheStore.set(request.url, response.clone());
      },
    },
  };
  globalThis.fetch = async (request) => {
    const requestUrl = String(request.url || request);
    if (requestUrl.includes('api.sportmonks.com')) {
      sportmonksCalls += 1;
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 1540843,
              starting_at: `${today} 18:00:00`,
              state: { short_name: 'NS' },
              league: { id: 732, name: 'FIFA World Cup', country: { name: 'World' } },
              participants: [
                { id: 1, name: 'Brazil', short_code: 'BRA', meta: { location: 'home' } },
                { id: 2, name: 'Japan', short_code: 'JPN', meta: { location: 'away' } },
              ],
              scores: [],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (requestUrl.includes('/papi/api/streams')) {
      return new Response(JSON.stringify({ success: true, streams: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ data: [] }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  };

  const env = {
    SPORTMONKS_TOKEN: 'test-token',
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'secret',
    ADMIN_BEARER_TOKEN: 'admin-token',
    STREAM_CONFIG_KV: {
      async get(key) {
        return kvData.get(key) || null;
      },
      async put(key, value) {
        kvData.set(key, value);
      },
      async delete(key) {
        kvData.delete(key);
      },
      async list() {
        return { keys: [], list_complete: true };
      },
    },
  };

  try {
    const first = await routeRequest(new Request(`https://kinglive.test/api/matches?date=${today}`), env, {});
    const second = await routeRequest(new Request(`https://kinglive.test/api/matches?date=${today}`), env, {});
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(sportmonksCalls, 1);

    const refresh = await routeRequest(
      new Request('https://kinglive.test/api/admin/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-token' },
        body: JSON.stringify({ scope: 'matches', date: today }),
      }),
      env,
      {},
    );
    assert.equal(refresh.status, 200);
    const refreshBody = await refresh.json();
    assert.equal(refreshBody.ok, true);
    assert.equal(refreshBody.scope, 'matches');
    assert.equal(typeof refreshBody.cache_version, 'string');
    assert.equal(sportmonksCalls, 2);

    const afterRefresh = await routeRequest(new Request(`https://kinglive.test/api/matches?date=${today}`), env, {});
    assert.equal(afterRefresh.status, 200);
    assert.equal(sportmonksCalls, 3);
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.caches = previousCaches;
  }
});

test('tracks viewer heartbeats and returns admin monitoring snapshot from KV', async () => {
  const kvData = new Map();
  const expirations = new Map();
  const kv = {
    async get(key) {
      return kvData.get(key) || null;
    },
    async put(key, value, options = {}) {
      kvData.set(key, value);
      if (options.expirationTtl) expirations.set(key, options.expirationTtl);
    },
    async delete(key) {
      kvData.delete(key);
    },
    async list(options = {}) {
      const prefix = options.prefix || '';
      return {
        keys: Array.from(kvData.keys())
          .filter((name) => name.startsWith(prefix))
          .map((name) => ({ name })),
        list_complete: true,
      };
    },
  };
  const env = {
    ADMIN_BEARER_TOKEN: 'test-token',
    STREAM_CONFIG_KV: kv,
    MATCH_STREAMS_JSON: JSON.stringify({
      1540843: [
        { id: 1, url: 'https://stream.test/live.m3u8', source_type: 'hls', is_active: true },
        { id: 2, url: 'https://stream.test/embed', source_type: 'iframe', is_active: false },
      ],
    }),
  };

  const heartbeat = await routeRequest(
    new Request('https://kinglive.test/api/viewers/1540843/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.10' },
      body: JSON.stringify({ client_id: 'viewer-1', page: 'player' }),
    }),
    env,
    {},
  );
  assert.equal(heartbeat.status, 200);
  assert.equal((await heartbeat.json()).viewers, 1);
  assert.equal(expirations.get('viewer:1540843:viewer-1'), 75);

  kvData.set('viewer:1540843:expired', JSON.stringify({
    match_id: 1540843,
    client_id: 'expired',
    updated_at_ms: Date.now() - 120_000,
    expires_at_ms: Date.now() - 45_000,
  }));

  const monitoring = await routeRequest(
    new Request('https://kinglive.test/api/admin/monitoring', {
      headers: { Authorization: 'Bearer test-token' },
    }),
    env,
    {},
  );
  assert.equal(monitoring.status, 200);
  const body = await monitoring.json();
  assert.equal(body.active_streams.total, 1);
  assert.equal(body.active_viewers.total, 1);
  assert.equal(body.active_viewers.by_match['1540843'], 1);
  assert.equal(body.metrics.api_calls >= 1, true);
  assert.equal(typeof body.metrics.cache_hits, 'number');
  assert.equal(typeof body.metrics.upstream_calls, 'number');
  assert.equal(kvData.has('viewer:1540843:expired'), false);
});

test('caches Sportmonks live match detail subrequests separately from stats responses', async () => {
  const previousFetch = globalThis.fetch;
  const previousCaches = globalThis.caches;
  const calls = [];
  const cacheStore = new Map();
  globalThis.caches = {
    default: {
      async match(request) {
        const cached = cacheStore.get(request.url);
        return cached ? cached.clone() : undefined;
      },
      async put(request, response) {
        cacheStore.set(request.url, response.clone());
      },
    },
  };
  globalThis.fetch = async (url) => {
    const requestUrl = String(url);
    calls.push(requestUrl);
    if (requestUrl.includes('/fixtures/42')) {
      return new Response(JSON.stringify({
        data: {
          id: 42,
          participants: [
            { id: 1, name: 'Brazil', meta: { location: 'home' } },
            { id: 2, name: 'Japan', meta: { location: 'away' } },
          ],
          events: [
            { id: 10, participant_id: 1, type: { code: 'goal', name: 'Goal' }, player_name: 'Raphinha', minute: 23 },
          ],
          statistics: [],
          lineups: [],
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (requestUrl.includes('/match-facts/42')) {
      return new Response(JSON.stringify({
        data: [{ id: 901, name: 'Brazil have scored in 4 straight matches', type: { name: 'Streak' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (requestUrl.includes('/odds/pre-match/fixtures/42')) {
      return new Response(JSON.stringify({
        data: [
          { bookmaker: { name: 'MelBet' }, market: { developer_name: 'FULLTIME_RESULT' }, label: 'Home', value: '1.40' },
          { bookmaker: { name: 'MelBet' }, market: { developer_name: 'FULLTIME_RESULT' }, label: 'Draw', value: '4.00' },
          { bookmaker: { name: 'MelBet' }, market: { developer_name: 'FULLTIME_RESULT' }, label: 'Away', value: '8.00' },
        ],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const first = await routeRequest(
      new Request('https://kinglive.test/api/matches/42/stats?live=1&v=a&lang=en'),
      { SPORTMONKS_TOKEN: 'sportmonks-test-token' },
      {},
    );
    const second = await routeRequest(
      new Request('https://kinglive.test/api/matches/42/stats?live=1&v=b&lang=en'),
      { SPORTMONKS_TOKEN: 'sportmonks-test-token' },
      {},
    );

    assert.equal(first.headers.get('Cache-Control'), 'public, max-age=30');
    assert.equal(second.headers.get('Cache-Control'), 'public, max-age=30');
    assert.equal(calls.filter((url) => new URL(url).pathname === '/v3/football/fixtures/42').length, 3);
    assert.equal(calls.filter((url) => new URL(url).pathname === '/v3/football/match-facts/42').length, 1);
    assert.equal(calls.filter((url) => new URL(url).pathname === '/v3/football/odds/pre-match/fixtures/42').length, 1);
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.caches = previousCaches;
  }
});

test('returns empty match list when API key is not configured', async () => {
  const response = await routeRequest(new Request('https://kinglive.test/api/matches'), {}, {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { matches: [], total: 0, source: 'not_configured' });
});

test('serves public API when metrics KV is unavailable', async () => {
  const response = await routeRequest(
    new Request('https://kinglive.test/api/matches'),
    {
      STREAM_CONFIG_KV: {
        get() {
          throw new Error('kv unavailable');
        },
        put() {
          throw new Error('kv unavailable');
        },
      },
    },
    {},
  );

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

test('returns deduped Sportmonks football news before RSS fallback', async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (request) => {
    const requestUrl = String(request.url || request);
    calls.push(requestUrl);
    if (requestUrl.includes('/v3/football/news/pre-match')) {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 501,
              fixture_id: 42,
              league_id: 732,
              title: 'Preview: Brazil vs Japan',
              type: 'prematch',
              updated_at: '2026-06-10T10:00:00Z',
              lines: [
                { text: 'Brazil enter the fixture with a strong attacking run.' },
                { line: 'Japan need a compact defensive shape.' },
              ],
              fixture: {
                name: 'Brazil vs Japan',
                participants: [
                  { name: 'Brazil', image_path: 'https://cdn.test/brazil.png' },
                  { name: 'Japan', image_path: 'https://cdn.test/japan.png' },
                ],
              },
              league: { name: 'FIFA World Cup', image_path: 'https://cdn.test/world-cup.png' },
            },
            {
              id: 502,
              fixture_id: 42,
              league_id: 732,
              title: 'Preview: Brazil vs Japan',
              type: 'prematch',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (requestUrl.includes('/v3/football/news/post-match')) {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 601,
              fixture_id: 41,
              league_id: 732,
              title: 'Report: France edge Spain',
              type: 'postmatch',
              body: 'France moved through after a late winner.',
              image_path: 'https://cdn.test/report.png',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response('unexpected rss call', { status: 500 });
  };

  try {
    const response = await routeRequest(
      new Request('https://kinglive.test/api/news?limit=6&lang=fr'),
      { SPORTMONKS_TOKEN: 'token', SPORTMONKS_LEAGUE_IDS: '732' },
      {},
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.source, 'Sportmonks Football News');
    assert.equal(body.lang, 'fr');
    assert.equal(body.news.length, 2);
    assert.equal(body.news[0].title, 'Report: France edge Spain');
    assert.equal(body.news[1].summary, 'Brazil enter the fixture with a strong attacking run.');
    assert.equal(body.news[1].full_text, 'Brazil enter the fixture with a strong attacking run.\n\nJapan need a compact defensive shape.');
    assert.equal(body.news[1].image_url, 'https://cdn.test/world-cup.png');
    assert.equal(body.news[1].source, 'Sportmonks');
    assert.equal(body.news[1].fixture_id, 42);
    assert.equal(calls.every((url) => url.includes('locale=fr')), true);
    assert.equal(calls.every((url) => url.includes('filters=newsitemLeagues%3A732') || url.includes('filters=newsitemLeagues:732')), true);
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

test('falls back to localized Google News RSS when Sportmonks news is empty', async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (request) => {
    const requestUrl = String(request.url || request);
    calls.push(requestUrl);
    if (requestUrl.includes('/v3/football/news/')) {
      return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(
      `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title><![CDATA[Mercato: le football français bouge]]></title>
          <description><![CDATA[Un résumé depuis Google News.]]></description>
          <link>https://news.google.com/articles/google-football-fr</link>
          <guid isPermaLink="false">google-football-fr-guid</guid>
          <pubDate>Wed, 10 Jun 2026 12:20:00 GMT</pubDate>
        </item>
      </channel></rss>`,
      { status: 200, headers: { 'Content-Type': 'application/rss+xml' } },
    );
  };

  try {
    const response = await routeRequest(
      new Request('https://kinglive.test/api/news?limit=1&lang=fr'),
      { SPORTMONKS_TOKEN: 'token' },
      {},
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.source, 'Google News Football');
    assert.equal(body.feed_url, 'https://news.google.com/rss/search?q=football&hl=fr&gl=FR&ceid=FR:fr');
    assert.equal(body.news.length, 1);
    assert.equal(body.news[0].source, 'Google News');
    assert.equal(body.news[0].title, 'Mercato: le football français bouge');
    assert.equal(calls.some((url) => url.includes('news.google.com/rss/search')), true);
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

test('attaches every DAMI source to the matching Sportmonks fixture', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (request) => {
    const requestUrl = String(request.url || request);
    if (requestUrl.includes('api.sportmonks.com')) {
      return new Response(
        JSON.stringify({
          data: {
            id: 1540843,
            name: 'Korea Republic vs Czech Republic',
            starting_at: '2026-06-12 18:00:00',
            state: { short_name: '1st' },
            league: { id: 732, name: 'FIFA World Cup', country: { name: 'World' } },
            participants: [
              { id: 1, name: 'Korea Republic', short_code: 'KOR', meta: { location: 'home' } },
              { id: 2, name: 'Czech Republic', short_code: 'CZE', meta: { location: 'away' } },
            ],
            scores: [],
            periods: [{ type_id: 1, minutes: 24, ticking: true }],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (requestUrl.includes('/papi/api/streams')) {
      return new Response(
        JSON.stringify({
          success: true,
          streams: [
            {
              category: 'football',
              streams: [
                {
                  id: 'wc/2026-06-12/kor-cze',
                  name: 'Korea Republic vs. Czech Republic',
                  teams: {
                    home: { name: 'Korea Republic' },
                    away: { name: 'Czech Republic' },
                  },
                  sources: [
                    { source: 'tv', id: 's1', embed: 'https://dami-tv.pro/embed/?id=wc/2026-06-12/kor-cze&ch=101' },
                    { source: 'tv', id: 's2', embed: 'https://dami-tv.pro/embed/?id=wc/2026-06-12/kor-cze&ch=102' },
                    { source: 'alt', id: 's3', embed: 'https://dami-tv.pro/embed/?id=wc/2026-06-12/kor-cze&ch=103' },
                  ],
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ data: [] }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const response = await routeRequest(
      new Request('https://kinglive.test/api/matches/1540843?lang=en&region=global'),
      { SPORTMONKS_TOKEN: 'test-token' },
      {},
    );

    assert.equal(response.status, 200);
    const match = await response.json();
    assert.equal(match.streams.length, 2);
    assert.deepEqual(
      match.streams.map((stream) => stream.url),
      [
        'https://dami-tv.pro/embed/?id=wc/2026-06-12/kor-cze&ch=102',
        'https://dami-tv.pro/embed/?id=wc/2026-06-12/kor-cze&ch=103',
      ],
    );
    assert.deepEqual(
      match.streams.map((stream) => stream.label),
      ['S2', 'S3'],
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('caches DAMI streams in KV for multiple match responses', async () => {
  const previousFetch = globalThis.fetch;
  const kvData = new Map();
  let damiCalls = 0;
  let sportmonksCalls = 0;

  globalThis.fetch = async (request) => {
    const requestUrl = String(request.url || request);
    if (requestUrl.includes('api.sportmonks.com')) {
      sportmonksCalls += 1;
      return new Response(
        JSON.stringify({
          data: {
            id: 1540843,
            name: 'Korea Republic vs Czech Republic',
            starting_at: '2026-06-12 18:00:00',
            state: { short_name: '1st' },
            league: { id: 732, name: 'FIFA World Cup', country: { name: 'World' } },
            participants: [
              { id: 1, name: 'Korea Republic', short_code: 'KOR', meta: { location: 'home' } },
              { id: 2, name: 'Czech Republic', short_code: 'CZE', meta: { location: 'away' } },
            ],
            scores: [],
            periods: [{ type_id: 1, minutes: 24, ticking: true }],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (requestUrl.includes('/papi/api/streams')) {
      damiCalls += 1;
      return new Response(
        JSON.stringify({
          success: true,
          streams: [
            {
              category: 'football',
              streams: [
                {
                  id: 'wc/2026-06-12/kor-cze',
                  name: 'Korea Republic vs. Czech Republic',
                  starts_at: 1781287200,
                  ends_at: 1781298000,
                  teams: {
                    home: { name: 'Korea Republic' },
                    away: { name: 'Czech Republic' },
                  },
                  sources: [
                    { source: 'tv', id: 's1', embed: 'https://dami-tv.pro/embed/?id=wc/2026-06-12/kor-cze&ch=101' },
                  ],
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ data: [] }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  };

  const env = {
    SPORTMONKS_TOKEN: 'test-token',
    STREAM_CONFIG_KV: {
      async get(key) {
        return kvData.get(key) || null;
      },
      async put(key, value) {
        kvData.set(key, value);
      },
      async delete(key) {
        kvData.delete(key);
      },
    },
  };

  try {
    const first = await routeRequest(new Request('https://kinglive.test/api/matches/1540843?live=1&v=one'), env, {});
    const second = await routeRequest(new Request('https://kinglive.test/api/matches/1540843?live=1&v=two'), env, {});
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(sportmonksCalls, 2);
    assert.equal(damiCalls, 1);
    assert.equal(kvData.has('dami:streams:v1'), true);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('keeps DAMI sources isolated when two fixtures run at the same time', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (request) => {
    const requestUrl = String(request.url || request);
    if (requestUrl.includes('api.sportmonks.com')) {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 1540843,
              name: 'Korea Republic vs Czech Republic',
              starting_at: '2026-06-12 18:00:00',
              state: { short_name: '1st' },
              league: { id: 732, name: 'FIFA World Cup', country: { name: 'World' } },
              participants: [
                { id: 1, name: 'Korea Republic', short_code: 'KOR', meta: { location: 'home' } },
                { id: 2, name: 'Czech Republic', short_code: 'CZE', meta: { location: 'away' } },
              ],
              scores: [],
              periods: [{ type_id: 1, minutes: 24, ticking: true }],
            },
            {
              id: 1540844,
              name: 'Ghana vs Uruguay',
              starting_at: '2026-06-12 18:00:00',
              state: { short_name: '1st' },
              league: { id: 732, name: 'FIFA World Cup', country: { name: 'World' } },
              participants: [
                { id: 3, name: 'Ghana', short_code: 'GHA', meta: { location: 'home' } },
                { id: 4, name: 'Uruguay', short_code: 'URU', meta: { location: 'away' } },
              ],
              scores: [],
              periods: [{ type_id: 1, minutes: 22, ticking: true }],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (requestUrl.includes('/papi/api/streams')) {
      return new Response(
        JSON.stringify({
          success: true,
          streams: [
            {
              category: 'football',
              streams: [
                {
                  id: 'wc/2026-06-12/kor-cze',
                  name: 'Korea Republic vs. Czech Republic',
                  starts_at: 1781287200,
                  ends_at: 1781298000,
                  teams: { home: { name: 'Korea Republic' }, away: { name: 'Czech Republic' } },
                  sources: [{ source: 'tv', id: 'kor', embed: 'https://dami-tv.pro/embed/?id=wc/2026-06-12/kor-cze&ch=101' }],
                },
                {
                  id: 'wc/2026-06-12/gha-uru',
                  name: 'Ghana vs. Uruguay',
                  starts_at: 1781287200,
                  ends_at: 1781298000,
                  teams: { home: { name: 'Ghana' }, away: { name: 'Uruguay' } },
                  sources: [{ source: 'tv', id: 'gha', embed: 'https://dami-tv.pro/embed/?id=wc/2026-06-12/gha-uru&ch=202' }],
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ data: [] }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const response = await routeRequest(
      new Request('https://kinglive.test/api/matches?date=2026-06-12&live=1'),
      { SPORTMONKS_TOKEN: 'test-token' },
      {},
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    const korea = body.matches.find((match) => match.id === 1540843);
    const ghana = body.matches.find((match) => match.id === 1540844);
    assert.deepEqual(korea.streams.map((stream) => stream.url), ['https://dami-tv.pro/embed/?id=wc/2026-06-12/kor-cze&ch=101']);
    assert.deepEqual(ghana.streams.map((stream) => stream.url), ['https://dami-tv.pro/embed/?id=wc/2026-06-12/gha-uru&ch=202']);
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
      events: [],
      lineups: [],
      h2h: {
        home_wins: 0,
        away_wins: 0,
        draws: 0,
        total: 0,
        home_goals: 0,
        away_goals: 0,
        meetings: [],
      },
      home_form: [],
      away_form: [],
      team_stats: [
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
      facts: [],
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

test('converts IPTV donor streams into private restream definitions', async () => {
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
    ADMIN_BEARER_TOKEN: 'test-token',
    RESTREAM_SYNC_TOKEN: 'sync-token',
    RESTREAM_PUBLIC_BASE_URL: 'https://hls.livekinglive.win/live',
    STREAM_CONFIG_KV: kv,
  };

  const donorUrl = 'http://as01.plinkspile.cc/22572/index.m3u8?token=secret-token';
  const create = await routeRequest(
    new Request('https://kinglive.test/api/admin/streams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        match_id: 42,
        url: donorUrl,
        source_type: 'videojs',
        label: 'ESPN 2',
        language_code: 'en',
      }),
    }),
    env,
    {},
  );
  assert.equal(create.status, 200);

  const publicStreams = await routeRequest(new Request('https://kinglive.test/api/streams/active'), env, {});
  assert.equal(publicStreams.status, 200);
  const publicBody = await publicStreams.json();
  assert.equal(publicBody.streams['42'][0].url, 'https://hls.livekinglive.win/live/42-en-espn-2/index.m3u8');
  assert.equal(JSON.stringify(publicBody).includes('secret-token'), false);

  const unauthorized = await routeRequest(new Request('https://kinglive.test/api/restreams'), env, {});
  assert.equal(unauthorized.status, 401);

  const restreams = await routeRequest(
    new Request('https://kinglive.test/api/restreams', {
      headers: { Authorization: 'Bearer sync-token' },
    }),
    env,
    {},
  );
  assert.equal(restreams.status, 200);
  const restreamBody = await restreams.json();
  assert.equal(restreamBody.total, 1);
  assert.equal(restreamBody.restreams[0].slug, '42-en-espn-2');
  assert.equal(restreamBody.restreams[0].donor_url, donorUrl);
  assert.equal(restreamBody.restreams[0].output_url, 'https://hls.livekinglive.win/live/42-en-espn-2/index.m3u8');
});

test('converts hls.gd IPTV donor streams into private restream definitions', async () => {
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
    ADMIN_BEARER_TOKEN: 'test-token',
    RESTREAM_SYNC_TOKEN: 'sync-token',
    RESTREAM_PUBLIC_BASE_URL: 'https://hls.livekinglive.win/live',
    STREAM_CONFIG_KV: kv,
  };

  const donorUrl = 'https://8.hls.gd/ch1197/index.m3u8?token=secret-token';
  const create = await routeRequest(
    new Request('https://kinglive.test/api/admin/streams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        match_id: 19609156,
        url: donorUrl,
        source_type: 'videojs',
        label: 'English',
        language_code: 'en',
      }),
    }),
    env,
    {},
  );
  assert.equal(create.status, 200);

  const publicStreams = await routeRequest(new Request('https://kinglive.test/api/streams/active'), env, {});
  assert.equal(publicStreams.status, 200);
  const publicBody = await publicStreams.json();
  assert.equal(publicBody.streams['19609156'][0].url, 'https://hls.livekinglive.win/live/19609156-en-english/index.m3u8');
  assert.equal(JSON.stringify(publicBody).includes('secret-token'), false);

  const restreams = await routeRequest(
    new Request('https://kinglive.test/api/restreams', {
      headers: { Authorization: 'Bearer sync-token' },
    }),
    env,
    {},
  );
  assert.equal(restreams.status, 200);
  const restreamBody = await restreams.json();
  assert.equal(restreamBody.total, 1);
  assert.equal(restreamBody.restreams[0].slug, '19609156-en-english');
  assert.equal(restreamBody.restreams[0].donor_url, donorUrl);
  assert.equal(restreamBody.restreams[0].output_url, 'https://hls.livekinglive.win/live/19609156-en-english/index.m3u8');
});

test('preserves IPTV restream metadata when editing another stream', async () => {
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
    ADMIN_BEARER_TOKEN: 'test-token',
    RESTREAM_SYNC_TOKEN: 'sync-token',
    RESTREAM_PUBLIC_BASE_URL: 'https://hls.livekinglive.win/live',
    STREAM_CONFIG_KV: kv,
  };

  const createStream = async (label, donorUrl) => {
    const response = await routeRequest(
      new Request('https://kinglive.test/api/admin/streams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          match_id: 42,
          url: donorUrl,
          source_type: 'videojs',
          label,
          language_code: 'en',
        }),
      }),
      env,
      {},
    );
    assert.equal(response.status, 200);
    return response.json();
  };

  const first = await createStream('TESTT', 'http://as01.plinkspile.cc/22572/index.m3u8?token=secret-token');
  await createStream('TESTRU', 'http://as01.plinkspile.cc/128/index.m3u8?token=secret-token');

  const editWithPublicUrl = await routeRequest(
    new Request(`https://kinglive.test/api/admin/streams/${first.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        match_id: 42,
        url: 'https://hls.livekinglive.win/live/42-en-testt/index.m3u8',
        source_type: 'videojs',
        label: 'TESTT',
        language_code: 'en',
        is_active: true,
      }),
    }),
    env,
    {},
  );
  assert.equal(editWithPublicUrl.status, 200);

  const restreams = await routeRequest(
    new Request('https://kinglive.test/api/restreams', {
      headers: { Authorization: 'Bearer sync-token' },
    }),
    env,
    {},
  );
  assert.equal(restreams.status, 200);
  const body = await restreams.json();
  assert.equal(body.total, 2);
  assert.deepEqual(
    body.restreams.map((restream) => restream.slug).sort(),
    ['42-en-testru', '42-en-testt'],
  );
});

test('worker returns CORS JSON when admin KV writes fail', async () => {
  const env = {
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'secret',
    ADMIN_BEARER_TOKEN: 'test-token',
    STREAM_CONFIG_KV: {
      async get() {
        return null;
      },
      async put() {
        throw new Error('KV write limit reached');
      },
    },
  };

  const response = await worker.fetch(
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

  assert.equal(response.status, 500);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
  const body = await response.json();
  assert.equal(body.error, 'internal_error');
  assert.match(body.message, /KV write limit reached/);
});

test('admin match status overrides are stored in KV and applied to match responses', async () => {
  const previousFetch = globalThis.fetch;
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
    SPORTMONKS_TOKEN: 'sportmonks-token',
    STREAM_CONFIG_KV: kv,
  };
  globalThis.fetch = async (request) => {
    const requestUrl = String(request.url || request);
    if (requestUrl.includes('api.sportmonks.com')) {
      return new Response(
        JSON.stringify({
          data: {
            id: 42,
            name: 'Canada vs Bosnia and Herzegovina',
            starting_at: '2026-06-12 19:00:00',
            state: { short_name: 'NS' },
            league: { id: 732, name: 'World Cup', country: { name: 'World' } },
            participants: [
              { id: 1, name: 'Canada', short_code: 'CAN', meta: { location: 'home' } },
              { id: 2, name: 'Bosnia and Herzegovina', short_code: 'BIH', meta: { location: 'away' } },
            ],
            scores: [],
            periods: [],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (requestUrl.includes('/papi/api/streams')) {
      return new Response(JSON.stringify({ success: true, streams: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ data: [] }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const save = await routeRequest(
      new Request('https://kinglive.test/api/admin/match-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
        body: JSON.stringify({ match_id: 42, status: 'finished', home_score: 2, away_score: 1 }),
      }),
      env,
      {},
    );
    assert.equal(save.status, 200);

    const list = await routeRequest(
      new Request('https://kinglive.test/api/admin/match-overrides', {
        headers: { Authorization: 'Bearer test-token' },
      }),
      env,
      {},
    );
    assert.equal(list.status, 200);
    const listBody = await list.json();
    assert.equal(listBody.overrides[0].status, 'finished');

    const matchResponse = await routeRequest(new Request('https://kinglive.test/api/matches/42'), env, {});
    assert.equal(matchResponse.status, 200);
    const match = await matchResponse.json();
    assert.equal(match.status, 'finished');
    assert.equal(match.home_score, 2);
    assert.equal(match.away_score, 1);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('admin streams list includes DAMI auto streams as read-only rows', async () => {
  const previousFetch = globalThis.fetch;
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
    SPORTMONKS_TOKEN: 'sportmonks-token',
    STREAM_CONFIG_KV: kv,
  };
  globalThis.fetch = async (request) => {
    const requestUrl = String(request.url || request);
    if (requestUrl.includes('api.sportmonks.com')) {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 42,
              name: 'Canada vs Bosnia and Herzegovina',
              starting_at: '2026-06-12 19:00:00',
              state: { short_name: 'NS' },
              league: { id: 732, name: 'World Cup', country: { name: 'World' } },
              participants: [
                { id: 1, name: 'Canada', short_code: 'CAN', meta: { location: 'home' } },
                { id: 2, name: 'Bosnia and Herzegovina', short_code: 'BIH', meta: { location: 'away' } },
              ],
              scores: [],
              periods: [],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (requestUrl.includes('/papi/api/streams')) {
      return new Response(
        JSON.stringify({
          success: true,
          streams: [
            {
              category: 'football',
              streams: [
                {
                  id: 'canada-vs-bosnia-herzegovina-2461104',
                  name: 'Canada vs Bosnia and Herzegovina',
                  teams: {
                    home: { name: 'Canada' },
                    away: { name: 'Bosnia and Herzegovina' },
                  },
                  sources: [{ source: 'tv', id: 's1', embed: 'https://dami-tv.pro/embed/?id=canada-vs-bosnia-herzegovina-2461104&ch=533' }],
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ data: [] }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const list = await routeRequest(
      new Request('https://kinglive.test/api/admin/streams', {
        headers: { Authorization: 'Bearer test-token' },
      }),
      env,
      {},
    );
    assert.equal(list.status, 200);
    const body = await list.json();
    assert.equal(body.auto_total, 0);
    assert.equal(body.streams.length, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
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
