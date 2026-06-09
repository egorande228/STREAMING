import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const appSource = readFileSync(new URL('./app.js', import.meta.url), 'utf8');

test('renders same-day matches beyond the first six API results', async () => {
  let gridHtml = '';
  const matchGrid = {
    get innerHTML() {
      return gridHtml;
    },
    set innerHTML(value) {
      gridHtml = value;
    },
    addEventListener() {},
  };
  const modalRoot = {
    className: '',
    hidden: true,
    innerHTML: '',
    addEventListener() {},
  };
  const adSlots = [];
  const today = new Date().toISOString().slice(0, 10);
  const fillerMatches = Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    scheduled_at: `${today}T12:0${index}:00+00:00`,
    status: 'scheduled',
    stage: 'Fixture',
    home_team: { name_en: `Home ${index + 1}` },
    away_team: { name_en: `Away ${index + 1}` },
  }));
  const featuredMatch = {
    id: 1540843,
    scheduled_at: `${today}T19:00:00+00:00`,
    status: 'scheduled',
    stage: 'Semi-finals',
    home_team: { name_en: 'Arsenal', flag_url: 'https://logo.test/ars.png' },
    away_team: { name_en: 'Atletico Madrid', flag_url: 'https://logo.test/atm.png' },
  };

  const context = {
    URL,
    URLSearchParams,
    Intl,
    Date,
    Set,
    window: {
      location: { href: 'https://kinglive.test/' },
      KINGLIVE_MAIN_CONFIG: {
        apiBase: '',
        playerBase: 'https://player.kinglive.test',
        defaultLocale: 'en',
        adSlots: {},
      },
    },
    document: {
      body: {
        appendChild() {},
      },
      createElement() {
        return modalRoot;
      },
      addEventListener() {},
      getElementById(id) {
        return id === 'match-grid' ? matchGrid : null;
      },
      querySelectorAll(selector) {
        if (selector === '[data-ad-slot]') return adSlots;
        return [];
      },
    },
    fetch(url) {
      if (String(url).endsWith('/stream.json') || String(url).endsWith('stream.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      }
      const matches = String(url).includes(`date=${today}`) ? [...fillerMatches, featuredMatch] : [];
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ matches }),
      });
    },
  };

  vm.runInNewContext(appSource, context);
  await new Promise((resolve) => setImmediate(resolve));

  assert.match(gridHtml, /Arsenal vs Atletico Madrid/);
});

test('falls back to upcoming schedule when today has no matches', async () => {
  let gridHtml = '';
  const matchGrid = {
    get innerHTML() {
      return gridHtml;
    },
    set innerHTML(value) {
      gridHtml = value;
    },
    addEventListener() {},
  };
  const modalRoot = {
    className: '',
    hidden: true,
    innerHTML: '',
    addEventListener() {},
  };
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowText = tomorrow.toISOString().slice(0, 10);
  const requests = [];

  const context = {
    URL,
    URLSearchParams,
    Intl,
    Date,
    Set,
    window: {
      location: { href: 'https://kinglive.test/' },
      KINGLIVE_MAIN_CONFIG: {
        apiBase: 'https://kinglive-football-api.test',
        playerBase: 'https://player.kinglive.test',
        sponsorUrl: 'https://refpa3665.com/L?tag=d_5517121m_66329c_worldcuplive',
        defaultLocale: 'en',
        adSlots: {},
      },
    },
    document: {
      body: {
        appendChild() {},
      },
      createElement() {
        return modalRoot;
      },
      addEventListener() {},
      getElementById(id) {
        return id === 'match-grid' ? matchGrid : null;
      },
      querySelectorAll(selector) {
        return selector === '[data-ad-slot]' ? [] : [];
      },
    },
    fetch(url) {
      const request = String(url);
      requests.push(request);
      if (request.endsWith('/stream.json') || request.endsWith('stream.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      }
      const matches = request.includes(`date=${tomorrowText}`)
        ? [
            {
              id: 19609127,
              scheduled_at: `${tomorrowText}T19:00:00+00:00`,
              status: 'scheduled',
              stage: 'Group Stage',
              league: { name: 'World Cup' },
              home_team: { name_en: 'Mexico' },
              away_team: { name_en: 'South Africa' },
            },
          ]
        : [];

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ matches }),
      });
    },
  };

  vm.runInNewContext(appSource, context);
  await new Promise((resolve) => setImmediate(resolve));

  assert.match(gridHtml, /Mexico vs South Africa/);
  assert.equal(requests.some((url) => url.includes(`/api/matches?date=${today}`)), true);
  assert.equal(requests.some((url) => url.includes(`/api/matches?date=${tomorrowText}`)), true);
});

test('sends site locale with match API requests', async () => {
  let gridHtml = '';
  let modalHtml = '';
  const listeners = new Map();
  const matchGrid = {
    get innerHTML() {
      return gridHtml;
    },
    set innerHTML(value) {
      gridHtml = value;
    },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
  };
  const modalRoot = {
    className: '',
    hidden: true,
    get innerHTML() {
      return modalHtml;
    },
    set innerHTML(value) {
      modalHtml = value;
    },
    addEventListener(type, handler) {
      listeners.set(`modal:${type}`, handler);
    },
  };
  const today = new Date().toISOString().slice(0, 10);
  const requests = [];

  const context = {
    URL,
    URLSearchParams,
    Intl,
    Date,
    Set,
    window: {
      location: { href: 'https://kinglive.test/?lang=fr' },
      KINGLIVE_MAIN_CONFIG: {
        apiBase: 'https://kinglive-football-api.test',
        playerBase: 'https://player.kinglive.test',
        defaultLocale: 'en',
        adSlots: {},
      },
    },
    document: {
      body: {
        appendChild() {},
      },
      createElement() {
        return modalRoot;
      },
      addEventListener() {},
      getElementById(id) {
        if (id === 'match-grid') return matchGrid;
        return null;
      },
      querySelectorAll() {
        return [];
      },
    },
    fetch(url) {
      const request = String(url);
      requests.push(request);
      if (request.endsWith('/stream.json') || request.endsWith('stream.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      }
      if (request.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ team_stats: [] }),
        });
      }
      if (request.includes('/prematch')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ sample_size: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            matches: [
              {
                id: 1540843,
                scheduled_at: `${today}T19:00:00+00:00`,
                status: 'scheduled',
                stage: 'Group Stage',
                home_team: { id: 1, name_en: 'France' },
                away_team: { id: 2, name_en: 'Canada' },
                streams: [],
              },
            ],
          }),
      });
    },
  };

  vm.runInNewContext(appSource, context);
  await new Promise((resolve) => setImmediate(resolve));

  listeners.get('click')({
    target: {
      closest(selector) {
        return selector === '[data-match-id]' ? { dataset: { matchId: '1540843' } } : null;
      },
    },
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(requests.some((url) => url.includes(`/api/matches?date=${today}`) && url.includes('lang=fr')), true);
  assert.equal(requests.some((url) => url === 'https://kinglive-football-api.test/api/matches/1540843/stats?v=sportmonks-facts-v2&lang=fr'), true);
  assert.equal(
    requests.some((url) => url === 'https://kinglive-football-api.test/api/matches/1540843/prematch?home=1&away=2&lang=fr'),
    true,
  );
});

test('renders finished match score in the match list', async () => {
  let gridHtml = '';
  const matchGrid = {
    get innerHTML() {
      return gridHtml;
    },
    set innerHTML(value) {
      gridHtml = value;
    },
    addEventListener() {},
  };
  const modalRoot = {
    className: '',
    hidden: true,
    innerHTML: '',
    addEventListener() {},
  };
  const today = new Date().toISOString().slice(0, 10);

  const context = {
    URL,
    URLSearchParams,
    Intl,
    Date,
    Set,
    window: {
      location: { href: 'https://kinglive.test/' },
      KINGLIVE_MAIN_CONFIG: {
        apiBase: '',
        defaultLocale: 'en',
        adSlots: {},
      },
    },
    document: {
      body: {
        appendChild() {},
      },
      createElement() {
        return modalRoot;
      },
      addEventListener() {},
      getElementById(id) {
        return id === 'match-grid' ? matchGrid : null;
      },
      querySelectorAll() {
        return [];
      },
    },
    fetch(url) {
      if (String(url).endsWith('/stream.json') || String(url).endsWith('stream.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            matches: [
              {
                id: 42,
                scheduled_at: `${today}T19:00:00+00:00`,
                status: 'finished',
                home_score: 2,
                away_score: 1,
                stage: 'Final',
                home_team: { name_en: 'Chelsea' },
                away_team: { name_en: 'Tottenham' },
              },
            ],
          }),
      });
    },
  };

  vm.runInNewContext(appSource, context);
  await new Promise((resolve) => setImmediate(resolve));

  assert.match(gridHtml, /match-score/);
  assert.match(gridHtml, /2 : 1/);
});

test('renders football news from the backend news endpoint', async () => {
  let newsHtml = '';
  const newsGrid = {
    get innerHTML() {
      return newsHtml;
    },
    set innerHTML(value) {
      newsHtml = value;
    },
    addEventListener() {},
  };
  const modalRoot = {
    className: '',
    hidden: true,
    innerHTML: '',
    addEventListener() {},
  };

  const context = {
    URL,
    URLSearchParams,
    Intl,
    Date,
    Set,
    window: {
      location: { href: 'https://kinglive.test/' },
      KINGLIVE_MAIN_CONFIG: {
        apiBase: 'https://kinglive-football-api.test',
        playerBase: 'https://player.kinglive.test',
        newsApiUrl: 'https://kinglive-football-api.test/api/news?limit=1',
        defaultLocale: 'en',
        adSlots: {},
      },
    },
    document: {
      body: {
        appendChild() {},
      },
      createElement() {
        return modalRoot;
      },
      addEventListener() {},
      getElementById(id) {
        if (id === 'news-grid') return newsGrid;
        return null;
      },
      querySelectorAll() {
        return [];
      },
    },
    fetch(url) {
      assert.equal(String(url), 'https://kinglive-football-api.test/api/news?limit=1&lang=en');
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            news: [
              {
                title: 'BBC football headline',
                summary: 'BBC football summary',
                url: 'https://www.bbc.com/sport/football/articles/test',
                published_at: 'Thu, 14 May 2026 09:33:49 GMT',
                image_url: 'https://ichef.bbci.co.uk/test.jpg',
                source: 'BBC Sport',
              },
            ],
          }),
      });
    },
  };

  vm.runInNewContext(appSource, context);
  await new Promise((resolve) => setImmediate(resolve));

  assert.match(newsHtml, /BBC football headline/);
  assert.match(newsHtml, /BBC football summary/);
  assert.match(
    newsHtml,
    /news\.html\?url=https%3A%2F%2Fwww\.bbc\.com%2Fsport%2Ffootball%2Farticles%2Ftest/,
  );
});

test('news carousel buttons move the horizontal news rail', async () => {
  const listeners = new Map();
  const newsGrid = {
    clientWidth: 900,
    scrollWidth: 1600,
    scrollLeft: 0,
    innerHTML: '',
    addEventListener() {},
    scrollTo(options) {
      this.scrollLeft = options.left;
    },
  };
  const nextButton = {
    dataset: { newsScroll: '1' },
    addEventListener(type, handler) {
      listeners.set('next', handler);
    },
    setAttribute() {},
  };
  const prevButton = {
    dataset: { newsScroll: '-1' },
    addEventListener(type, handler) {
      listeners.set('prev', handler);
    },
    setAttribute() {},
  };
  const modalRoot = {
    className: '',
    hidden: true,
    innerHTML: '',
    addEventListener() {},
  };

  const context = {
    URL,
    URLSearchParams,
    Intl,
    Date,
    Set,
    window: {
      location: { href: 'https://kinglive.test/' },
      KINGLIVE_MAIN_CONFIG: {
        apiBase: '',
        defaultLocale: 'en',
        adSlots: {},
      },
      requestAnimationFrame: (handler) => handler(),
    },
    document: {
      documentElement: { dir: 'ltr' },
      body: {
        appendChild() {},
      },
      createElement() {
        return modalRoot;
      },
      addEventListener() {},
      getElementById(id) {
        if (id === 'news-grid') return newsGrid;
        return null;
      },
      querySelector(selector) {
        if (selector === '[data-news-scroll="-1"]') return prevButton;
        if (selector === '[data-news-scroll="1"]') return nextButton;
        return null;
      },
      querySelectorAll(selector) {
        if (selector === '[data-news-scroll]') return [prevButton, nextButton];
        return [];
      },
    },
    fetch() {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ news: [] }),
      });
    },
  };

  vm.runInNewContext(appSource, context);
  listeners.get('next')();
  assert.equal(newsGrid.scrollLeft, 700);
  listeners.get('prev')();
  assert.equal(newsGrid.scrollLeft, 0);
});

test('opens match details with stats and only shows player button when stream exists', async () => {
  let gridHtml = '';
  let modalHtml = '';
  const bodyChildren = [];
  const listeners = new Map();
  const matchGrid = {
    get innerHTML() {
      return gridHtml;
    },
    set innerHTML(value) {
      gridHtml = value;
    },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
  };
  const modalRoot = {
    className: '',
    hidden: true,
    get innerHTML() {
      return modalHtml;
    },
    set innerHTML(value) {
      modalHtml = value;
    },
    addEventListener(type, handler) {
      listeners.set(`modal:${type}`, handler);
    },
  };
  const today = new Date().toISOString().slice(0, 10);
  const requests = [];

  const context = {
    URL,
    URLSearchParams,
    Intl,
    Date,
    Set,
    window: {
      location: { href: 'https://kinglive.test/' },
      KINGLIVE_MAIN_CONFIG: {
        apiBase: 'https://kinglive-football-api.test',
        playerBase: 'https://player.kinglive.test',
        defaultLocale: 'en',
        adSlots: {},
      },
    },
    document: {
      body: {
        appendChild(element) {
          bodyChildren.push(element);
        },
      },
      createElement() {
        return modalRoot;
      },
      addEventListener(type, handler) {
        listeners.set(`document:${type}`, handler);
      },
      getElementById(id) {
        if (id === 'match-grid') return matchGrid;
        return null;
      },
      querySelectorAll(selector) {
        if (selector === '[data-ad-slot]') return [];
        return [];
      },
    },
    fetch(url) {
      requests.push(String(url));
      if (String(url).endsWith('/stream.json') || String(url).endsWith('stream.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ match_id: 1540843, is_active: true }),
        });
      }
      if (String(url).includes('/stats')) {
        if (String(url).includes('/1540844/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ teams: [] }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              events: [
                {
                  id: 10,
                  minute: 23,
                  type: 'goal',
                  team: 'home',
                  player_name: 'Saka',
                  detail: 'Assist: Odegaard',
                },
                {
                  id: 11,
                  minute: 40,
                  extra_minute: 2,
                  type: 'yellow_card',
                  team: 'away',
                  player_name: 'Koke',
                  detail: '',
                },
              ],
              facts: [
                { id: 1, title: 'Match fact', text: 'Arsenal scored first' },
              ],
              odds: {
                bookmaker: 'MelBet',
                market: 'Fulltime Result',
                updated_at: '2026-06-09 10:15:10',
                outcomes: {
                  home: { label: 'home', value: '1.72' },
                  draw: { label: 'draw', value: '3.40' },
                  away: { label: 'away', value: '4.90' },
                },
                markets: [
                  {
                    key: 'fulltime',
                    label: 'Fulltime Result',
                    outcomes: {
                      home: { label: 'home', value: '1.72' },
                      draw: { label: 'draw', value: '3.40' },
                      away: { label: 'away', value: '4.90' },
                    },
                  },
                  {
                    key: 'total_goals',
                    label: 'Total 2.5',
                    outcomes: {
                      over: { label: 'Over', value: '2.15', total: '2.5' },
                      under: { label: 'Under', value: '1.70', total: '2.5' },
                    },
                  },
                  {
                    key: 'asian_handicap',
                    label: 'Asian Handicap',
                    outcomes: {
                      home: { label: 'Home', value: '2.21', handicap: '-1.5' },
                      away: { label: 'Away', value: '1.59', handicap: '1.5' },
                    },
                  },
                ],
              },
              team_stats: [
                { team: { name: 'Arsenal' }, stats: { possession: 61, shots_on_goal: 5, total_shots: 11, corners: 6 } },
                { team: { name: 'Atletico Madrid' }, stats: { possession: 39, shots_on_goal: 3, total_shots: 7, corners: 2 } },
              ],
              lineups: [
                { id: 1, team: 'home', player_name: 'David Raya', number: 22, position: '1', is_starter: true, image_url: 'https://cdn.test/raya.png' },
                { id: 2, team: 'home', player_name: 'Bukayo Saka', number: 7, position: '11', is_starter: true },
                { id: 3, team: 'away', player_name: 'Jan Oblak', number: 13, position: '1', is_starter: true },
                { id: 4, team: 'away', player_name: 'Koke', number: 6, position: '8', is_starter: true },
                { id: 5, team: 'home', player_name: 'Gabriel Jesus', number: 9, position: '', is_starter: false },
              ],
              teams: [
                { team: { name: 'Arsenal' }, stats: { possession: '61%', shots_on_goal: 5 } },
                { team: { name: 'Atletico Madrid' }, stats: { possession: '39%', shots_on_goal: 3 } },
              ],
            }),
        });
      }
      if (String(url).includes('/prematch')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              label: 'Head-to-head last 2 matches',
              sample_size: 2,
              home: { wins: 1, goals: 3 },
              away: { wins: 0, goals: 1 },
              draws: 1,
            }),
        });
      }

      const matches = String(url).includes(`date=${today}`)
        ? [
            {
              id: 1540843,
              scheduled_at: `${today}T19:00:00+00:00`,
              status: 'live',
              stage: 'Semi-finals',
              home_team: { name_en: 'Arsenal', flag_url: 'https://logo.test/ars.png' },
              away_team: { name_en: 'Atletico Madrid', flag_url: 'https://logo.test/atm.png' },
              streams: [{ url: 'https://stream.test/live.m3u8', is_active: true }],
            },
            {
              id: 1540844,
              scheduled_at: `${today}T21:00:00+00:00`,
              status: 'scheduled',
              stage: 'Semi-finals',
              home_team: { id: 1, name_en: 'Brazil' },
              away_team: { id: 2, name_en: 'Japan' },
              streams: [],
            },
          ]
        : [];

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ matches }),
      });
    },
  };

  vm.runInNewContext(appSource, context);
  await new Promise((resolve) => setImmediate(resolve));

  assert.match(gridHtml, /Open player/);
  assert.match(gridHtml, /match=1540843/);
  assert.doesNotMatch(gridHtml, /match=1540844/);
  assert.doesNotMatch(gridHtml, /No stream yet/);
  assert.equal(bodyChildren.length, 1);

  listeners.get('click')({
    target: {
      closest(selector) {
        return selector === '[data-match-id]' ? { dataset: { matchId: '1540843' } } : null;
      },
    },
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.match(gridHtml, /Arsenal vs Atletico Madrid/);
  assert.equal(modalRoot.hidden, false);
  assert.match(modalHtml, /Match details/);
  assert.match(modalHtml, /Possession 61% - 39%/);
  assert.match(modalHtml, /MelBet odds/);
  assert.match(modalHtml, /Fulltime Result/);
  assert.match(modalHtml, /https:\/\/refpa3665\.com\/L\?tag=d_5517121m_66329c_worldcuplive/);
  assert.equal((modalHtml.match(/class="melbet-odd"/g) || []).length, 7);
  assert.doesNotMatch(modalHtml.match(/<div class="melbet-odds-head">[\s\S]*?<\/div>/)?.[0] || '', /<a /);
  assert.match(modalHtml, /1\.72/);
  assert.match(modalHtml, /3\.40/);
  assert.match(modalHtml, /4\.90/);
  assert.match(modalHtml, /Total 2\.5/);
  assert.match(modalHtml, /Over 2\.5/);
  assert.match(modalHtml, /Under 2\.5/);
  assert.match(modalHtml, /2\.15/);
  assert.match(modalHtml, /1\.70/);
  assert.match(modalHtml, /Asian Handicap/);
  assert.match(modalHtml, /Arsenal -1\.5/);
  assert.match(modalHtml, /Atletico Madrid 1\.5/);
  assert.match(modalHtml, /Match events/);
  assert.match(modalHtml, /23&#039;/);
  assert.match(modalHtml, /Saka/);
  assert.match(modalHtml, /40\+2&#039;/);
  assert.match(modalHtml, /Team statistics/);
  assert.match(modalHtml, /Shots on goal 5 - 3/);
  assert.match(modalHtml, /Starting lineups/);
  assert.match(modalHtml, /<details class="detail-panel lineup-collapse">/);
  assert.doesNotMatch(modalHtml, /<details class="detail-panel lineup-collapse" open>/);
  assert.match(modalHtml, /David Raya/);
  assert.match(modalHtml, /formation-pitch/);
  assert.match(modalHtml, /formation-photo/);
  assert.match(modalHtml, /formation-slot-1/);
  assert.match(modalHtml, /title="David Raya"/);
  assert.match(modalHtml, /<span>David Raya<\/span>/);
  assert.match(modalHtml, /https:\/\/cdn\.test\/raya\.png/);
  assert.match(modalHtml, /title="Bukayo Saka"/);
  assert.match(modalHtml, /<span>Bukayo Saka<\/span>/);
  assert.doesNotMatch(modalHtml, /22 · 1/);
  assert.match(modalHtml, /Jan Oblak/);
  assert.doesNotMatch(modalHtml, /Gabriel Jesus/);
  assert.match(modalHtml, /Match facts/);
  assert.match(modalHtml, /<details class="detail-panel lineup-collapse fact-collapse">/);
  assert.doesNotMatch(modalHtml, /<details class="detail-panel lineup-collapse fact-collapse" open>/);
  assert.match(modalHtml, /Arsenal scored first/);
  assert.doesNotMatch(modalHtml, /data-refresh-match/);
  assert.doesNotMatch(modalHtml, /Refresh details/);
  assert.match(modalHtml, /Open player/);
  assert.match(modalHtml, /match=1540843/);
  assert.match(modalHtml, /https:\/\/logo\.test\/ars\.png/);
  assert.equal(requests.some((url) => url === 'https://kinglive-football-api.test/api/matches/1540843/stats?v=sportmonks-facts-v2&lang=en'), true);

  listeners.get('click')({
    target: {
      closest(selector) {
        return selector === '[data-match-id]' ? { dataset: { matchId: '1540844' } } : null;
      },
    },
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.match(modalHtml, /Match details/);
  assert.match(modalHtml, /Head-to-head last 2 matches/);
  assert.match(modalHtml, /Wins 1 - 0/);
  assert.match(modalHtml, /Draws 1/);
  assert.doesNotMatch(modalHtml, /Watch stream/);
  assert.doesNotMatch(modalHtml, /No stream yet/);

  listeners.get('modal:click')({
    target: {
      closest(selector) {
        return selector === '[data-modal-close]' ? {} : null;
      },
    },
  });
  assert.equal(modalRoot.hidden, true);
});
