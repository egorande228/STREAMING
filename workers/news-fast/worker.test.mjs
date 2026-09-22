import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';

const rss = `<?xml version="1.0"?><rss><channel><item>
  <title><![CDATA[Football headline]]></title>
  <description><![CDATA[Football summary.]]></description>
  <link>https://www.bbc.co.uk/sport/football/articles/example</link>
  <guid>example</guid><pubDate>Tue, 22 Sep 2026 09:00:00 GMT</pubDate>
</item></channel></rss>`;

test('English news uses direct BBC feed and returns existing card shape', async () => {
  const original = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return new Response(rss, { status: 200 });
  };
  try {
    const response = await worker.fetch(new Request('https://news.test/api/news?lang=en&limit=6'), {}, {});
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(body.news.length, 1);
    assert.equal(body.news[0].title, 'Football headline');
    assert.equal(body.news[0].image_url, '');
    assert.equal(urls.length, 1);
    assert.equal(urls[0], 'https://feeds.bbci.co.uk/sport/football/rss.xml');
  } finally {
    globalThis.fetch = original;
  }
});

test('locales use a football-specific direct feed', async () => {
  const original = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return new Response(rss, { status: 200 });
  };
  try {
    for (const lang of ['ar', 'fr', 'es']) {
      const response = await worker.fetch(new Request(`https://news.test/api/news?lang=${lang}`), {}, {});
      assert.equal(response.status, 200);
      assert.equal((await response.json()).lang, lang);
    }
    assert.equal(urls.every((url) => url.startsWith('https://news.google.com/rss/search?')), true);
  } finally {
    globalThis.fetch = original;
  }
});

test('failed source gives a quick explicit error', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('error', { status: 503 });
  try {
    const response = await worker.fetch(new Request('https://news.test/api/news?lang=en'), {}, {});
    assert.equal(response.status, 502);
    assert.equal((await response.json()).error, 'news_feed_error');
  } finally {
    globalThis.fetch = original;
  }
});
