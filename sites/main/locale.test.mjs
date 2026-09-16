import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

function element() {
  return {
    innerHTML: '', children: [], attributes: {}, dataset: {}, style: {},
    appendChild(child) { this.children.push(child); child.parentElement = this; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; },
  };
}

async function boot(page, { query = '', stored, defaultLocale = 'en', browserLanguage = 'en', storageBlocked = false } = {}) {
  const location = new URL(`https://kinglive.test/${page === 'news' ? 'news.html' : ''}?url=https%3A%2F%2Fsource.test%2Fstory${query ? `&${query}` : ''}#schedule`);
  const storage = new Map([['unrelated', 'keep'], ['kinglive_theme', 'dark']]);
  if (stored) storage.set('kinglive_locale', stored);
  const localeButton = element(), article = element(), grid = element(), newsGrid = element(), root = element(), created = [], requests = [];
  const historyState = { keep: 'navigation-state' };
  const history = {
    state: historyState,
    replaceState(state, _title, href) { this.state = state; location.href = href; },
  };
  const context = {
    URL, URLSearchParams, Intl, Date, Set, console,
    window: {
      location, history, navigator: { language: browserLanguage },
      KINGLIVE_MAIN_CONFIG: { apiBase: 'https://api.test', defaultLocale, adSlots: {} },
      localStorage: {
        getItem(key) { if (storageBlocked) throw Error('storage disabled'); return storage.get(key) ?? null; },
        setItem(key, value) { if (storageBlocked) throw Error('storage disabled'); storage.set(key, value); },
      },
      addEventListener() {},
    },
    document: {
      documentElement: root, body: element(), addEventListener() {},
      createElement() { const node = element(); created.push(node); return node; },
      getElementById(id) { return { 'news-article': article, 'match-grid': grid, 'news-grid': newsGrid }[id] || null; },
      querySelector(selector) { return selector === '.locale' ? localeButton : null; },
      querySelectorAll() { return []; },
    },
    fetch: async url => { requests.push(new URL(url, location)); return { ok: true, json: async () => ({ matches: [], news: [] }) }; },
  };
  vm.runInNewContext(readFileSync(new URL(`./${page === 'news' ? 'news' : 'app'}.js`, import.meta.url), 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  return { root, location, storage, history, historyState, requests, menu: created.find(node => node.className === 'locale-menu') };
}

for (const page of ['main', 'news']) {
  test(`${page}: the language menu exposes only the four supported locales`, async () => {
    const view = await boot(page);
    assert.deepEqual([...view.menu.innerHTML.matchAll(/data-locale="([^"]+)"/g)].map(match => match[1]), ['en', 'es', 'fr', 'ar']);
  });

  test(`${page}: a retired locale link migrates to Arabic without losing other URL state`, async () => {
    for (const removed of ['mn', 'MN', 'mn-MN']) {
      const view = await boot(page, { query: `lang=${removed}&match=77&source=a%2Bb&src=https%3A%2F%2Fvideo.test%2Fwatch%3Fid%3D1`, stored: 'mn' });
      assert.equal(view.root.lang, 'ar');
      assert.equal(view.root.dir, 'rtl');
      assert.equal(view.storage.get('kinglive_locale'), 'ar');
      assert.equal(view.location.searchParams.get('lang'), 'ar');
      assert.equal(view.location.searchParams.get('match'), '77');
      assert.equal(view.location.searchParams.get('source'), 'a+b');
      assert.equal(view.location.searchParams.get('src'), 'https://video.test/watch?id=1');
      assert.equal(view.location.searchParams.get('url'), 'https://source.test/story');
      assert.equal(view.location.hash, '#schedule');
      assert.equal(view.history.state, view.historyState);
      assert.equal(view.storage.get('unrelated'), 'keep');
      assert.equal(view.storage.get('kinglive_theme'), 'dark');
      const localizedRequests = view.requests.filter(url => ['/api/news', '/api/matches'].includes(url.pathname));
      assert.ok(localizedRequests.length > 0);
      assert.ok(localizedRequests.every(url => url.searchParams.get('lang') === 'ar'));
    }
  });

  test(`${page}: saved Mongolian and legacy settings fall back to Arabic`, async () => {
    for (const options of [{ stored: 'mn' }, { defaultLocale: 'mn' }, { defaultLocale: 'auto', browserLanguage: 'mn-MN' }]) {
      const view = await boot(page, options);
      assert.equal(view.root.lang, 'ar');
      assert.equal(view.storage.get('kinglive_locale'), 'ar');
    }
  });

  test(`${page}: locale migration works even when browser storage is blocked`, async () => {
    const view = await boot(page, { query: 'lang=mn', storageBlocked: true });
    assert.equal(view.root.lang, 'ar');
    assert.equal(view.location.searchParams.get('lang'), 'ar');
  });

  test(`${page}: supported explicit locale choices keep precedence`, async () => {
    for (const locale of ['en', 'es', 'fr', 'ar']) {
      const view = await boot(page, { query: `lang=${locale}`, stored: 'mn' });
      assert.equal(view.root.lang, locale);
      assert.equal(view.location.searchParams.get('lang'), locale);
    }
  });
}
