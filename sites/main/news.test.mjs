import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const newsSource = readFileSync(new URL('./news.js', import.meta.url), 'utf8');

function translationKeys(locale) {
  const block = newsSource.match(new RegExp(`    ${locale}: \\{([\\s\\S]*?)\\n    \\},`));
  assert.ok(block, `missing ${locale} translation block`);
  return [...block[1].matchAll(/^      ([A-Za-z0-9_]+):/gm)].map((match) => match[1]).sort();
}

test('all news-page locales expose the same translation keys', () => {
  const englishKeys = translationKeys('en');
  for (const locale of ['es', 'fr', 'ar', 'mn']) {
    assert.deepEqual(translationKeys(locale), englishKeys);
  }
  assert.match(newsSource, /url\.searchParams\.set\('lang', uiLocale\)/);
  assert.match(newsSource, /if \(uiLocale === 'mn'\) return false;/);
  assert.doesNotMatch(newsSource, /← Back to news/);
});

test('renders a selected RSS news item on an internal story page', async () => {
  let articleHtml = '';
  let title = '';
  const article = {
    get innerHTML() {
      return articleHtml;
    },
    set innerHTML(value) {
      articleHtml = value;
    },
  };

  const context = {
    URLSearchParams,
    Intl,
    Date,
    window: {
      location: {
        search: '?url=https%3A%2F%2Fwww.bbc.com%2Fsport%2Ffootball%2Farticles%2Ftest',
      },
      KINGLIVE_MAIN_CONFIG: {
        apiBase: 'https://kinglive-football-api.test',
        newsApiUrl: 'https://kinglive-football-api.test/api/news?limit=12',
      },
    },
    document: {
      get title() {
        return title;
      },
      set title(value) {
        title = value;
      },
      getElementById(id) {
        return id === 'news-article' ? article : null;
      },
    },
    fetch(url) {
      assert.equal(String(url), 'https://kinglive-football-api.test/api/news?limit=12&lang=en');
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            news: [
              {
                id: 'story-id',
                title: 'BBC football headline',
                summary: 'BBC football summary',
                full_text: 'Full paragraph one.\n\nFull paragraph two.',
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

  vm.runInNewContext(newsSource, context);
  await new Promise((resolve) => setImmediate(resolve));

  assert.match(title, /BBC football headline/);
  assert.match(articleHtml, /BBC football headline/);
  assert.match(articleHtml, /Full paragraph one\./);
  assert.match(articleHtml, /Full paragraph two\./);
  assert.doesNotMatch(articleHtml, /BBC football summary/);
  assert.doesNotMatch(articleHtml, /Read full story at source/);
  assert.doesNotMatch(articleHtml, /This page displays the complete story text provided by the RSS feed/);
  assert.doesNotMatch(articleHtml, /href="https:\/\/www\.bbc\.com/);
});

test('renders a selected story from client cache when it expired from the feed', async () => {
  let articleHtml = '';
  let title = '';
  const requestedUrl = 'https://www.bbc.com/sport/football/articles/expired';
  const cachedStory = {
    id: 'expired-story-id',
    title: 'Cached football headline',
    summary: 'Cached summary',
    full_text: 'Cached paragraph one.\n\nCached paragraph two.',
    url: requestedUrl,
    published_at: 'Fri, 12 Jun 2026 14:19:46 GMT',
    image_url: '',
    source: 'BBC Sport',
  };
  const storage = new Map([
    [`kinglive.news.story.v1:${requestedUrl}`, JSON.stringify(cachedStory)],
    [`kinglive.news.story.v1:${cachedStory.id}`, JSON.stringify(cachedStory)],
  ]);
  const article = {
    get innerHTML() {
      return articleHtml;
    },
    set innerHTML(value) {
      articleHtml = value;
    },
  };

  const context = {
    URL,
    URLSearchParams,
    Intl,
    Date,
    window: {
      location: {
        search: `?url=${encodeURIComponent(requestedUrl)}`,
        href: `https://kinglive.test/news.html?url=${encodeURIComponent(requestedUrl)}`,
      },
      localStorage: {
        getItem(key) {
          return storage.get(key) || null;
        },
        setItem(key, value) {
          storage.set(key, value);
        },
      },
      KINGLIVE_MAIN_CONFIG: {
        apiBase: 'https://kinglive-football-api.test',
        newsApiUrl: 'https://kinglive-football-api.test/api/news?limit=12',
      },
    },
    document: {
      get title() {
        return title;
      },
      set title(value) {
        title = value;
      },
      getElementById(id) {
        return id === 'news-article' ? article : null;
      },
    },
    fetch(url) {
      assert.equal(String(url), 'https://kinglive-football-api.test/api/news?limit=12&lang=en');
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ news: [] }),
      });
    },
  };

  vm.runInNewContext(newsSource, context);
  await new Promise((resolve) => setImmediate(resolve));

  assert.match(title, /Cached football headline/);
  assert.match(articleHtml, /Cached paragraph one\./);
  assert.match(articleHtml, /Cached paragraph two\./);
  assert.doesNotMatch(articleHtml, /News story not found/);
});
