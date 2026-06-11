import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const newsSource = readFileSync(new URL('./news.js', import.meta.url), 'utf8');

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
