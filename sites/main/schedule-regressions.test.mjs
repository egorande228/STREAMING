import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const apiVersion = source.match(/const apiVersion = '([^']+)'/)[1];
const now = new Date('2026-09-16T12:00:00Z');
class TestDate extends Date {
  constructor(...args) { super(...(args.length ? args : [now])); }
  static now() { return now.getTime(); }
}
const day = '2026-09-16';
const match = (id = 1, date = day) => ({
  id, scheduled_at: `${date}T18:00:00Z`, status: 'scheduled',
  home_team: { name_en: 'Manchester City FC' }, away_team: { name_en: 'Real Madrid CF' },
  league: { name: 'UEFA Champions League' }, stage: 'Champions League', streams: [],
});
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
function element() {
  const handlers = {}, attrs = new Map(), classes = new Set();
  return {
    innerHTML: '', hidden: true, dataset: {}, style: {},
    addEventListener: (type, fn) => { handlers[type] = fn; },
    fire: (type, event = {}) => handlers[type]?.(event),
    setAttribute: (name, value) => attrs.set(name, String(value)),
    getAttribute: name => attrs.get(name), removeAttribute: name => attrs.delete(name),
    querySelector: () => null, querySelectorAll: () => [],
    classList: { toggle: (name, on) => on ? classes.add(name) : classes.delete(name), contains: name => classes.has(name) },
  };
}
function boot({ schedule = () => ({ matches: [] }), cached = [], locale = 'en', nav = false } = {}) {
  const grid = element(), modal = element(), storage = new Map(), windowEvents = {};
  const scheduleLink = element(), newsLink = element();
  scheduleLink.setAttribute('href', '#schedule'); newsLink.setAttribute('href', '#news');
  const positions = { schedule: 80, news: 600 };
  const root = { lang: '', dir: '', scrollHeight: 1300 };
  for (const [date, matches, age = 60_000] of cached) storage.set(
    `kinglive.daily.v2.no-cyrillic:matches:${locale}:${date}:${apiVersion}:${day}`,
    JSON.stringify({ day, data: { matches }, fetched_at: now.getTime() - age }),
  );
  const context = {
    URL, URLSearchParams, Intl, Date: TestDate, Set, console,
    window: {
      location: { href: `https://kinglive.test/?lang=${locale}`, search: `?lang=${locale}`, hash: '' },
      KINGLIVE_MAIN_CONFIG: { apiBase: '', defaultLocale: locale, adSlots: {} },
      localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), key: i => [...storage.keys()][i], get length() { return storage.size; }, removeItem: key => storage.delete(key) },
      addEventListener: (type, fn) => { windowEvents[type] = fn; },
      requestAnimationFrame: fn => fn(), scrollY: 0, innerHeight: 900,
    },
    document: {
      documentElement: root, body: { appendChild() {} }, createElement: () => modal,
      addEventListener() {}, getElementById: id => id === 'match-grid' ? grid : null,
      querySelector: selector => nav && ['#schedule', '#news'].includes(selector)
        ? { getBoundingClientRect: () => ({ top: positions[selector.slice(1)] }) } : null,
      querySelectorAll: selector => nav && selector === '.nav a[href]' ? [scheduleLink, newsLink] : [],
    },
    fetch: async url => {
      const parsed = new URL(url, 'https://kinglive.test');
      const data = parsed.pathname === '/api/matches' ? await schedule(parsed.searchParams.get('date')) : {};
      return { ok: true, json: async () => data };
    },
  };
  const teamFile = new URL('./team-names.js', import.meta.url);
  if (existsSync(teamFile)) vm.runInNewContext(readFileSync(teamFile, 'utf8'), context);
  // Expose real functions only inside this test's VM; production has no testing API.
  vm.runInNewContext(source.replace('  setupLocaleButton();', `
    globalThis.app = { loadMatchDay, openMatchDetails, teamName, formatDateParts, matchCardStageName, renderLineups };
    setupLocaleButton();`), context);
  return { grid, modal, storage, context, app: context.app, positions, scheduleLink, newsLink, windowEvents };
}

test('fast stream availability cannot replace a pending schedule with No matches', async () => {
  const pending = deferred();
  const view = boot({ schedule: async date => { await pending.promise; return { matches: date === day ? [match()] : [] }; } });
  await tick();
  assert.match(view.grid.innerHTML, /skeleton-card/);
  assert.doesNotMatch(view.grid.innerHTML, /No matches/);
  pending.resolve(); await tick();
  assert.match(view.grid.innerHTML, /data-match-id="1"/);
});

test('cache for another day does not imply the selected day is empty', async () => {
  const pending = deferred();
  const view = boot({ cached: [['2026-09-17', [match(2, '2026-09-17')]]], schedule: () => pending.promise });
  await tick();
  assert.match(view.grid.innerHTML, /skeleton-card/);
  assert.doesNotMatch(view.grid.innerHTML, /No matches/);
});

test('a failed schedule is an error with retry, not a confirmed empty day', async () => {
  const view = boot({ schedule: () => { throw Error('upstream unavailable'); } });
  await tick();
  assert.doesNotMatch(view.grid.innerHTML, /No matches/);
  assert.match(view.grid.innerHTML, /Schedule temporarily unavailable/);
  assert.match(view.grid.innerHTML, /data-retry-matches/);
});

test('a malformed successful API response cannot confirm an empty day', async () => {
  const view = boot({ schedule: () => ({ error: 'schedule_provider_unavailable' }) });
  await tick();
  assert.match(view.grid.innerHTML, /data-retry-matches/);
});

test('confirmed empty schedules still show the selected day’s empty message', async () => {
  const view = boot();
  await tick();
  assert.match(view.grid.innerHTML, /No matches today/);
  assert.doesNotMatch(view.grid.innerHTML, /data-retry-matches|skeleton-card/);
});

test('the retry action recovers an unavailable schedule', async () => {
  let unavailable = true;
  const view = boot({ schedule: date => {
    if (unavailable) throw Error('upstream unavailable');
    return { matches: date === day ? [match()] : [] };
  } });
  await tick();
  unavailable = false;
  view.grid.fire('click', { target: { closest: selector => selector === '[data-retry-matches]' ? {} : null } });
  await tick();
  assert.match(view.grid.innerHTML, /data-match-id="1"/);
  assert.doesNotMatch(view.grid.innerHTML, /data-retry-matches/);
});

test('one unavailable adjacent UTC day does not discard today’s successful matches', async () => {
  const view = boot({ schedule: date => {
    if (date === '2026-09-15') throw Error('upstream unavailable');
    return { matches: date === day ? [match()] : [] };
  } });
  await tick();
  assert.match(view.grid.innerHTML, /data-match-id="1"/);
});

test('old initial load cannot overwrite a newer day selection', async () => {
  const pending = deferred(); let first = true;
  const view = boot({ schedule: async date => {
    if (date === '2026-09-15' && first) { first = false; await pending.promise; throw Error('late failure'); }
    return { matches: date === '2026-09-17' ? [match(2, date)] : [] };
  } });
  await view.app.loadMatchDay(1);
  assert.match(view.grid.innerHTML, /data-match-id="2"/);
  pending.resolve(); await tick();
  assert.match(view.grid.innerHTML, /data-match-id="2"/);
});

test('a refreshed fixture replaces its older cached score', async () => {
  let score = 1;
  const view = boot({ schedule: date => ({ matches: date === day ? [{ ...match(), status: 'finished', home_score: score, away_score: 0 }] : [] }) });
  await tick();
  assert.match(view.grid.innerHTML, /dir="ltr">1 : 0/);
  score = 3;
  await view.app.loadMatchDay(0, { force: true });
  assert.match(view.grid.innerHTML, /dir="ltr">3 : 0/);
});

test('stale schedule fallback does not renew the original cache observation time', async () => {
  const originalTime = now.getTime() - 120_000;
  const view = boot({ cached: [[day, [match()], 120_000]], schedule: date => ({ matches: date === day ? [match()] : [], schedule_stale: true }) });
  await tick();
  const entry = JSON.parse([...view.storage.entries()].find(([key]) => key.includes(`matches:en:${day}:`))[1]);
  assert.equal(entry.fetched_at, originalTime);
});

test('Arabic names and western 24-hour time render in cards and match details', async () => {
  const view = boot({ locale: 'ar', schedule: date => ({ matches: date === day ? [match()] : [] }) });
  await tick();
  assert.match(view.grid.innerHTML, /مانشستر سيتي/);
  assert.match(view.grid.innerHTML, /ريال مدريد/);
  assert.match(view.grid.innerHTML, /dir="ltr">\+3<\/bdi>/);
  const date = view.app.formatDateParts('2026-09-16T18:05:00Z');
  assert.match(date.dateTime, /21:05/);
  assert.doesNotMatch(date.dateTime + date.timeZone, /[٠-٩۰-۹]/);
  assert.equal(date.timeZone, 'غرينتش+3');
  await view.app.openMatchDetails(1);
  assert.match(view.modal.innerHTML, /مانشستر سيتي/);
  assert.match(view.modal.innerHTML, /ريال مدريد/);
  assert.equal((view.modal.innerHTML.match(/UEFA Champions League/g) || []).length, 1);
});

test('league aliases are suppressed while a distinct matchday is preserved', () => {
  const { app } = boot();
  for (const [league, stage, want] of [
    ['La Liga', 'LaLiga', ''],
    ['La Liga', '2026-27 LALIGA', ''],
    ['UEFA Champions League', 'Champions League', ''],
    ['UEFA Champions League', 'UEFA Champions League - League phase', 'League phase'],
    ['La Liga', 'LaLiga EA SPORTS — Matchday 5', 'Matchday 5'],
    ['La Liga', 'Matchday 5', 'Matchday 5'],
    ['Premier League', '2026-27 English Premier League', ''],
    ['World Cup', 'Group Stage', 'Group Stage'],
  ]) assert.equal(app.matchCardStageName({ league: { name: league }, stage }), want);
});

test('Arabic lineup headings use the same club translations as the scoreboard', () => {
  const { app } = boot({ locale: 'ar' });
  const html = app.renderLineups({
    team_stats: [{ team: { name: 'Man City' } }, { team: { name: 'Real Madrid CF' } }],
    lineups: [{ team: 'home', player_name: 'Player A', number: 1 }, { team: 'away', player_name: 'Player B', number: 1 }],
  });
  assert.match(html, /مانشستر سيتي/);
  assert.match(html, /ريال مدريد/);
  assert.doesNotMatch(html, /Man City|Real Madrid/);
});

test('News stays selected during anchor scrolling and at the bottom of a short page', () => {
  const view = boot({ nav: true });
  view.newsLink.fire('click');
  view.windowEvents.scroll();
  assert.equal(view.newsLink.classList.contains('active'), true);
  view.context.window.scrollY = 400; view.positions.news = 220;
  view.windowEvents.scroll();
  assert.equal(view.newsLink.classList.contains('active'), true);
  view.windowEvents.wheel?.();
  view.context.window.scrollY = 0; view.positions.news = 600;
  view.windowEvents.scroll();
  assert.equal(view.scheduleLink.classList.contains('active'), true);
});
