import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const tick = () => new Promise(resolve => setImmediate(resolve));
const sourceUrl = 'https://www.aljazeera.net/sport/2026/9/16/كارلوس-إسبي-ريال-مدريد-مورينيو';
const apiStory = {
  id: 'api-story', title: 'API headline', summary: 'API summary',
  url: 'https://example.test/news/api-story', source: 'API source',
  published_at: '2026-09-16T09:00:00Z', image_url: '',
};

function element() {
  return {
    innerHTML: '', hidden: true, style: {}, dataset: {},
    addEventListener() {}, setAttribute() {}, appendChild() {},
    querySelector: () => null, querySelectorAll: () => [],
    classList: { toggle() {}, contains: () => false },
  };
}

function boot({ page = 'index', locale = 'ar', identifier = '', news = async () => [apiStory], storage = new Map() } = {}) {
  const content = element();
  const query = `?lang=${locale}&url=${encodeURIComponent(identifier)}`;
  let requests = 0;
  const context = {
    URL, URLSearchParams, Intl, Date, Set,
    window: {
      location: { href: `https://kinglive.test/${page}.html${query}`, search: query, hash: '' },
      KINGLIVE_MAIN_CONFIG: { apiBase: 'https://api.test', defaultLocale: 'en', adSlots: {} },
      localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    },
    document: {
      title: '', documentElement: {}, body: element(), createElement: element,
      addEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
      getElementById: id => id === (page === 'index' ? 'news-grid' : 'news-article') ? content : null,
    },
    fetch: async url => {
      assert.equal(new URL(url).pathname, '/api/news');
      requests++;
      return { ok: true, json: async () => ({ news: await news() }) };
    },
  };
  // Load the actual HTML dependency order, so a missing script tag is a regression.
  const html = readFileSync(new URL(`./${page}.html`, import.meta.url), 'utf8');
  for (const [, file] of html.matchAll(/<script[^>]*src="\.\/([^"?]+)(?:\?[^"]*)?"/g)) {
    if (['curated-news.js', 'app.js', 'news.js'].includes(file)) {
      vm.runInNewContext(readFileSync(new URL(`./${file}`, import.meta.url), 'utf8'), context);
    }
  }
  return { content, context, storage, get requests() { return requests; } };
}

test('Arabic curation renders immediately with KL placeholders while the news API is pending', () => {
  const view = boot({ news: () => new Promise(() => {}) });
  const html = view.content.innerHTML;
  assert.equal((html.match(/class="news-football-fallback"/g) || []).length, 4);
  assert.match(html, /إسبي/);
  assert.match(html, /مانشستر/);
  assert.match(html, /السعودية/);
  assert.match(html, /تير شتيغن/);
  assert.doesNotMatch(html, /skeleton-card|<img(?![^>]*banners\/)/);
  assert.match(html, /lang=ar/);
  assert.match(html, /16 سبتمبر 2026/);
  assert.doesNotMatch(html, /[٠-٩]/);
});

test('curated news stays first and removes API duplicates of the same source URL', async () => {
  const view = boot({ news: async () => [{ ...apiStory, url: encodeURI(sourceUrl), title: 'Duplicate headline' }, apiStory] });
  await tick();
  const html = view.content.innerHTML;
  assert.ok(html.indexOf('إسبي') < html.indexOf('API headline'));
  assert.doesNotMatch(html, /Duplicate headline/);
  assert.equal((html.match(/class="news-football-fallback"/g) || []).length, 5);
  assert.equal((html.match(/sponsor-news-card/g) || []).length, 1);
});

test('news API failure cannot remove the local Arabic selection', async () => {
  const view = boot({ news: async () => { throw new Error('offline'); } });
  await tick();
  assert.equal((view.content.innerHTML.match(/class="news-football-fallback"/g) || []).length, 4);
  assert.doesNotMatch(view.content.innerHTML, /news-empty/);
});

for (const locale of ['en', 'es', 'fr']) {
  test(`${locale} feed is unchanged by the Arabic selection`, async () => {
    const view = boot({ locale });
    await tick();
    assert.match(view.content.innerHTML, /API headline/);
    assert.doesNotMatch(view.content.innerHTML, /إسبي|تير شتيغن|السعودية/);
    assert.equal((view.content.innerHTML.match(/class="news-football-fallback"/g) || []).length, 1);
  });
}

test('a curated article opens directly without cache or API, with source attribution and no photo', () => {
  const view = boot({ page: 'news', identifier: sourceUrl });
  assert.match(view.content.innerHTML, /إسبي/);
  assert.match(view.content.innerHTML, /الدقيقة 91/);
  assert.match(view.content.innerHTML, /href="https:\/\/www\.aljazeera\.net\/sport\/2026\/9\/16\//);
  assert.match(view.content.innerHTML, /href="\.\/\?lang=ar#news/);
  assert.match(view.content.innerHTML, /16 سبتمبر 2026/);
  assert.doesNotMatch(view.content.innerHTML, /<img|[٠-٩]/);
  assert.equal(view.requests, 0);
});

test('encoded source URLs resolve to the same curated article', () => {
  const view = boot({ page: 'news', identifier: encodeURI(sourceUrl) });
  assert.match(view.content.innerHTML, /إسبي/);
  assert.equal(view.requests, 0);
});

test('current curated text takes priority over an older story cache', () => {
  const storage = new Map([[`kinglive.news.story.v1:${sourceUrl}`, JSON.stringify({ ...apiStory, title: 'Old cached title', url: sourceUrl })]]);
  const view = boot({ page: 'news', identifier: sourceUrl, storage });
  assert.match(view.content.innerHTML, /إسبي/);
  assert.doesNotMatch(view.content.innerHTML, /Old cached title/);
});

test('curated content is not leaked to other locales through the shared story cache', async () => {
  const storage = new Map();
  const arabic = boot({ storage });
  await tick();
  assert.match(arabic.content.innerHTML, /إسبي/);
  const english = boot({ page: 'news', locale: 'en', identifier: sourceUrl, storage });
  await tick();
  assert.doesNotMatch(english.content.innerHTML, /إسبي/);
});

test('an API payload cannot opt into trusted editorial source links', async () => {
  const view = boot({
    page: 'news', locale: 'en', identifier: 'javascript:alert(1)',
    news: async () => [{ ...apiStory, url: 'javascript:alert(1)', curated: true, published_label: 'Untrusted date' }],
  });
  await tick();
  assert.match(view.content.innerHTML, /API headline/);
  assert.doesNotMatch(view.content.innerHTML, /href="javascript:|Untrusted date/);
});
