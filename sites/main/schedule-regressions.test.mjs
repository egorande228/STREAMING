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
    globalThis.app = { loadMatchDay, openMatchDetails, closeMatchDetails, refreshOpenLiveMatch, teamName, formatDateParts, matchCardStageName, renderLineups };
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

test('match popup opens immediately with known score and localized loading feedback', async () => {
  for (const [locale, message, initialScore, updatedScore] of [
    ['en', 'Loading match details', '2 : 1', '3 : 1'],
    ['ar', 'جارٍ تحميل تفاصيل المباراة', '1 : 2', '1 : 3'],
  ]) {
    const fixture = { ...match(), status: 'live', home_score: 2, away_score: 1 };
    const view = boot({ locale, schedule: date => ({ matches: date === day ? [fixture] : [] }) });
    await tick();
    const pending = deferred();
    view.storage.clear();
    view.context.fetch = async () => ({ ok: true, json: () => pending.promise });
    const opening = view.app.openMatchDetails(1);
    assert.equal(view.modal.hidden, false, 'the popup must be visible before any API response');
    assert.ok(view.modal.innerHTML.includes(initialScore));
    assert.ok(view.modal.innerHTML.includes(message));
    assert.match(view.modal.innerHTML, /role="status"/);
    pending.resolve({ status: 'live', home_score: 3, away_score: 1, team_stats: [], events: [], lineups: [], facts: [] });
    await opening;
    assert.ok(view.modal.innerHTML.includes(updatedScore));
    assert.doesNotMatch(view.modal.innerHTML, /detail-loading/);
  }
});

test('popup stays visible while scheduled-match statistics and prematch information load', async () => {
  const fixture = { ...match(), home_team: { id: 1, name_en: 'Arsenal' }, away_team: { id: 2, name_en: 'Chelsea' } };
  const view = boot({ schedule: date => ({ matches: date === day ? [fixture] : [] }) });
  await tick();
  view.storage.clear();
  const stats = deferred(), prematch = deferred();
  view.context.fetch = async url => ({ ok: true, json: () => String(url).includes('/prematch') ? prematch.promise : stats.promise });
  const opening = view.app.openMatchDetails(1);
  assert.equal(view.modal.hidden, false);
  stats.resolve({ team_stats: [], events: [], lineups: [], facts: [] });
  await tick();
  assert.equal(view.modal.hidden, false);
  assert.match(view.modal.innerHTML, /detail-loading/);
  prematch.resolve({});
  await opening;
  assert.doesNotMatch(view.modal.innerHTML, /detail-loading/);
  assert.match(view.modal.innerHTML, /Arsenal/);
});

test('a detail payload needed before statistics cannot delay the initial popup', async () => {
  const fixture = { ...match(), streams: [{ url: 'https://stream.test/demo.m3u8', is_active: false }] };
  const view = boot({ schedule: date => ({ matches: date === day ? [fixture] : [] }) });
  await tick();
  const detail = deferred();
  view.context.fetch = async url => ({ ok: true, json: () => /\/api\/matches\/1\?/.test(String(url)) ? detail.promise : Promise.resolve({}) });
  const opening = view.app.openMatchDetails(1);
  assert.equal(view.modal.hidden, false);
  detail.resolve({ ...fixture, venue: 'Updated stadium' });
  await opening;
  assert.match(view.modal.innerHTML, /Updated stadium/);
});

test('closing a pending popup prevents late statistics from reopening it or restarting live refresh', async () => {
  const fixture = { ...match(), status: 'live' };
  const view = boot({ schedule: date => ({ matches: date === day ? [fixture] : [] }) });
  await tick();
  view.storage.clear();
  const timers = [];
  view.context.setInterval = (_callback, delay) => { timers.push(delay); return timers.length; };
  view.context.clearInterval = () => {};
  const pending = deferred();
  view.context.fetch = async () => ({ ok: true, json: () => pending.promise });
  const opening = view.app.openMatchDetails(1);
  view.app.closeMatchDetails();
  pending.resolve({ status: 'live', home_score: 4, away_score: 2 });
  await opening;
  assert.equal(view.modal.hidden, true);
  assert.equal(view.modal.innerHTML, '');
  assert.equal(timers.length, 0);
});

test('late response for another match cannot overwrite the newly selected popup', async () => {
  const fixtures = [match(), { ...match(2), home_team: { name_en: 'Arsenal' }, away_team: { name_en: 'Chelsea' } }];
  const view = boot({ schedule: date => ({ matches: date === day ? fixtures : [] }) });
  await tick();
  const old = deferred();
  view.context.fetch = async url => ({ ok: true, json: () => String(url).includes('/1/stats') ? old.promise : Promise.resolve({ venue: 'New stadium' }) });
  const first = view.app.openMatchDetails(1);
  await view.app.openMatchDetails(2);
  old.resolve({ venue: 'Old stadium' });
  await first;
  assert.match(view.modal.innerHTML, /Arsenal/);
  assert.match(view.modal.innerHTML, /New stadium/);
  assert.doesNotMatch(view.modal.innerHTML, /Old stadium|Manchester City/);
});

test('closing and reopening the same match rejects the earlier in-flight response', async () => {
  const view = boot({ schedule: date => ({ matches: date === day ? [match()] : [] }) });
  await tick();
  const old = deferred(); let calls = 0;
  view.context.fetch = async () => ({ ok: true, json: () => ++calls === 1 ? old.promise : Promise.resolve({ venue: 'New stadium' }) });
  const first = view.app.openMatchDetails(1);
  view.app.closeMatchDetails();
  await view.app.openMatchDetails(1);
  old.resolve({ venue: 'Old stadium' });
  await first;
  assert.match(view.modal.innerHTML, /New stadium/);
  assert.doesNotMatch(view.modal.innerHTML, /Old stadium/);
  view.app.closeMatchDetails();
  await view.app.openMatchDetails(1);
  assert.match(view.modal.innerHTML, /New stadium/, 'a late response must not poison the next opening from cache');
  assert.doesNotMatch(view.modal.innerHTML, /Old stadium/);
});

test('late prematch responses cannot replace the newer cached information on reopening', async () => {
  const fixture = { ...match(), home_team: { id: 1, name_en: 'Arsenal' }, away_team: { id: 2, name_en: 'Chelsea' } };
  const view = boot({ schedule: date => ({ matches: date === day ? [fixture] : [] }) });
  await tick();
  view.storage.clear();
  const old = deferred(); let calls = 0;
  view.context.fetch = async url => ({ ok: true, json: () => {
    if (!String(url).includes('/prematch')) return Promise.resolve({});
    return ++calls === 1 ? old.promise : Promise.resolve({ sample_size: 5, label: 'New form', home: {}, away: {} });
  } });
  const first = view.app.openMatchDetails(1);
  await tick();
  view.app.closeMatchDetails();
  await view.app.openMatchDetails(1);
  old.resolve({ sample_size: 5, label: 'Old form', home: {}, away: {} });
  await first;
  view.app.closeMatchDetails();
  await view.app.openMatchDetails(1);
  assert.match(view.modal.innerHTML, /New form/);
  assert.doesNotMatch(view.modal.innerHTML, /Old form/);
});

test('a late live-refresh detail response cannot reopen a closed popup', async () => {
  const view = boot({ schedule: date => ({ matches: date === day ? [{ ...match(), status: 'live' }] : [] }) });
  await tick();
  await view.app.openMatchDetails(1);
  const pending = deferred();
  view.context.fetch = async () => ({ ok: true, json: () => pending.promise });
  const refresh = view.app.refreshOpenLiveMatch(1);
  view.app.closeMatchDetails();
  pending.resolve({ ...match(), status: 'live', home_score: 5, away_score: 0 });
  await refresh;
  assert.equal(view.modal.hidden, true);
  assert.equal(view.modal.innerHTML, '');
});

test('a failed details request leaves a usable popup instead of an endless loading state', async () => {
  const view = boot({ schedule: date => ({ matches: date === day ? [match()] : [] }) });
  await tick();
  view.context.fetch = async () => { throw Error('offline'); };
  await view.app.openMatchDetails(1);
  assert.equal(view.modal.hidden, false);
  assert.match(view.modal.innerHTML, /Manchester City/);
  assert.doesNotMatch(view.modal.innerHTML, /detail-loading/);
  assert.match(view.modal.innerHTML, /Statistics are not available/);
  view.app.closeMatchDetails();
  assert.equal(view.modal.hidden, true);
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

test('cards read time then score then status, while the popup keeps its existing order', async () => {
  for (const locale of ['en', 'ar']) {
    for (const status of ['live', 'half_time', 'finished']) {
      const fixture = { ...match(), status, home_score: 2, away_score: 1 };
      const view = boot({ locale, schedule: date => ({ matches: date === day ? [fixture] : [] }) });
      await tick();
      const html = view.grid.innerHTML;
      const timeIndex = html.indexOf('class="match-time"');
      const scoreIndex = html.indexOf('class="match-vs match-score"');
      const statusIndex = html.indexOf('class="match-status ');
      assert.ok(timeIndex >= 0 && timeIndex < scoreIndex && scoreIndex < statusIndex, `${locale}/${status}: time must precede score and status`);
      await view.app.openMatchDetails(1);
      const popup = view.modal.innerHTML;
      assert.ok(popup.indexOf('class="detail-score-status ') < popup.indexOf('class="detail-score"'));
      assert.ok(popup.indexOf('class="detail-score"') < popup.indexOf('class="detail-score-time"'));
    }
  }
});

test('day-tab cards show only kickoff time while match details keep the full date', async () => {
  for (const [locale, clock, month, status] of [
    ['en', '12:05', 'Sept', 'scheduled'],
    ['es', '12:05', 'sept', 'finished'],
    ['fr', '13:05', 'sept', 'scheduled'],
    ['ar', '13:05', 'سبتمبر', 'live'],
  ]) {
    const fixture = { ...match(), scheduled_at: `${day}T10:05:00Z`, status, home_score: 2, away_score: 1 };
    const view = boot({ locale, schedule: date => ({ matches: date === day ? [fixture] : [] }) });
    await tick();
    const time = view.grid.innerHTML.match(/<div class="match-time">([\s\S]*?)<\/div>/)?.[1];
    assert.ok(time, `${locale}: match time should be visible`);
    assert.equal(time.match(/^<span class="bidi-datetime"><bdi class="bidi-ltr" dir="ltr">([^<]+)<\/bdi>/)?.[1], clock, `${locale}: use an isolated 24-hour clock, without date`);
    assert.doesNotMatch(time, /[٠-٩۰-۹]/);
    assert.match(time, /bidi-timezone/, 'keep the timezone');
    await view.app.openMatchDetails(1);
    const detailsTime = view.modal.innerHTML.match(/<span class="detail-score-time">([\s\S]*?)<\/span>/)?.[1];
    assert.ok(detailsTime?.includes(month), `${locale}: retain the month in details`);
    assert.ok(detailsTime?.includes('16'), `${locale}: retain the day in details`);
  }
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
