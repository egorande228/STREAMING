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
});
