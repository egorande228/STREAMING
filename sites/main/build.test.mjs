import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

const cwd = new URL('./', import.meta.url);
const dist = new URL('./dist/', import.meta.url);

test('build creates a deployable dist directory for Cloudflare Pages', () => {
  rmSync(dist, { recursive: true, force: true });

  execFileSync('node', ['build.mjs'], {
    cwd,
    stdio: 'pipe',
  });

  for (const path of [
    'index.html',
    'news.html',
    'admin.html',
    'app.js',
    'news.js',
    'admin.js',
    'analytics-init.js',
    'url-propagation.js',
    'meta-pixel.js',
    'styles.css',
    'config.js',
    '_headers',
    '_redirects',
    'assets/world-cup-hero.png',
    'assets/vendor/hlsjs/hls.min.js',
    'stream.json',
    'banners/strip_1180x120_mockup_original.png',
    'banners/inline_1180x160_mockup_original.png',
    'banners/news_card_360x220_mockup_original.png',
    'banners/popup_320x80_mockup_original.png',
    'banners/footer_1180x180_mockup_original.png',
  ]) {
    assert.equal(existsSync(new URL(`./dist/${path}`, import.meta.url)), true, `expected ${path} in dist`);
  }

  assert.equal(existsSync(new URL('./dist/README.md', import.meta.url)), false);
  assert.equal(existsSync(new URL('./dist/app.test.mjs', import.meta.url)), false);

  const wrangler = readFileSync(new URL('./wrangler.toml', import.meta.url), 'utf8');
  assert.match(wrangler, /pages_build_output_dir = "\.\/dist"/);

  const config = readFileSync(new URL('./dist/config.js', import.meta.url), 'utf8');
  assert.match(config, /runtimeConfig\.playerBase/);
  assert.match(config, /window\.KINGLIVE_PLAYER_BASE/);
  assert.match(config, /livekinglive\.win/);

  const headers = readFileSync(new URL('./dist/_headers', import.meta.url), 'utf8');
  const csp = headers.match(/Content-Security-Policy: ([^\n]+)/)?.[1] || '';
  const scriptSrc = csp.match(/script-src ([^;]+)/)?.[1] || '';
  const styleSrc = csp.match(/style-src ([^;]+)/)?.[1] || '';
  const styleSrcElem = csp.match(/style-src-elem ([^;]+)/)?.[1] || '';
  const styleSrcAttr = csp.match(/style-src-attr ([^;]+)/)?.[1] || '';
  const frameAncestors = csp.match(/frame-ancestors ([^;]+)/)?.[1] || '';
  assert.match(scriptSrc, /https:\/\/www\.facebook\.com/);
  assert.match(scriptSrc, /https:\/\/\*\.facebook\.com/);
  assert.match(scriptSrc, /https:\/\/365melbet\.bet/);
  assert.doesNotMatch(scriptSrc, /'unsafe-inline'/);
  assert.equal(styleSrc, "'self'");
  assert.match(styleSrcElem, /'unsafe-inline'/);
  assert.match(styleSrcAttr, /'unsafe-inline'/);
  assert.match(frameAncestors, /https:\/\/www\.facebook\.com/);
  assert.match(frameAncestors, /https:\/\/business\.facebook\.com/);
  assert.match(frameAncestors, /https:\/\/\*\.facebook\.com/);
  assert.doesNotMatch(frameAncestors, /'none'/);

  const index = readFileSync(new URL('./dist/index.html', import.meta.url), 'utf8');
  assert.match(index, /src="\.\/analytics-init\.js/);
  assert.doesNotMatch(index, /<script>\s*window\.dataLayer/);
  assert.equal((index.match(/meta-pixel\.js/g) || []).length, 1);
  assert.doesNotMatch(index, /connect\.facebook\.net\/en_US\/fbevents\.js/);
  assert.doesNotMatch(index, /data-quiz-fallback/);
  assert.doesNotMatch(index, /class="quiz-floating-button" href="https:\/\/365melbet\.bet"/);
  assert.match(index, /src="https:\/\/365melbet\.bet\/js\/quiz-widget\.js"/);

  const news = readFileSync(new URL('./dist/news.html', import.meta.url), 'utf8');
  assert.equal((news.match(/meta-pixel\.js/g) || []).length, 1);
  assert.doesNotMatch(news, /connect\.facebook\.net\/en_US\/fbevents\.js/);

  const styles = readFileSync(new URL('./dist/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /\.__fq-trigger/);
  assert.match(styles, /position:\s*fixed\s*!important/);
});
