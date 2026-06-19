import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

const cwd = new URL('./', import.meta.url);
const dist = new URL('./dist/', import.meta.url);
const arabicTelegramUrl = 'https://t.me/worldcup_live2026arabia';
const arabicYoutubeUrl =
  'https://www.youtube.com/@%D8%A7%D9%84%D8%B9%D8%A7%D9%84%D9%85%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%D8%A8%D8%B7%D9%88%D9%84%D8%A9%D8%A7%D9%84%D8%B9%D8%A7%D9%84%D9%852026';
const staleArabicSocialHandlePattern = new RegExp(`worldcup(?:${['2026', 'arabworld'].join('')}|${['_', 'arabia'].join('')})`);

test('build creates a deployable dist directory for Cloudflare Pages', () => {
  rmSync(dist, { recursive: true, force: true });

  execFileSync('node', ['build.mjs'], {
    cwd,
    stdio: 'pipe',
  });

  for (const path of [
    'index.html',
    'app.js',
    'url-propagation.js',
    'analytics.js',
    'styles.css',
    'config.js',
    '_headers',
    '_redirects',
    'assets/world-cup-hero.png',
    'streams.json',
    'banners/kinglive_player_leaderboard.png',
    'banners/kinglive_player_rail.png',
    'banners/kinglive_banner_1554x192.png',
    'banners/kinglive_banner_1554x192_fixed.png',
    'banners/melbet_bottom_banner_1554x192.png',
    'banners/melbet_top_banner_1554x192.png',
    'banners/melbet_right_banner.png',
    'banners/kinglive_top_banner_1554x192.png',
    'banners/kinglive_right_banner_300x600.png',
    'banners/kinglive_right_banner_300x920.png',
  ]) {
    assert.equal(existsSync(new URL(`./dist/${path}`, import.meta.url)), true, `expected ${path} in dist`);
  }

  assert.equal(existsSync(new URL('./dist/README.md', import.meta.url)), false);
  assert.equal(existsSync(new URL('./dist/app.test.mjs', import.meta.url)), false);

  const wrangler = readFileSync(new URL('./wrangler.toml', import.meta.url), 'utf8');
  assert.match(wrangler, /pages_build_output_dir = "\.\/dist"/);

  const config = readFileSync(new URL('./dist/config.js', import.meta.url), 'utf8');
  assert.match(config, /const bannerClickUrl = 'https:\/\/qweqr\.sbs\/jJQN6M'/);
  assert.match(config, /function safeBannerFile\(file\)/);
  assert.match(config, /src="\.\.\/banners\/\$\{safeFile\}"/);
  assert.match(config, /href="\$\{safeHref\}" target="_blank" rel="nofollow sponsored noopener"/);
  assert.match(config, /const unifiedApiBase = String\(runtimeConfig\.apiBase \|\| window\.KINGLIVE_API_BASE \|\|/);
  assert.match(config, /playerTop: banner\('melbet_top_banner_1554x192\.png', 1554, 192/);
  assert.match(config, /playerBottom: banner\('melbet_bottom_banner_1554x192\.png', 1554, 192/);
  assert.match(config, /playerRail: banner\('melbet_right_banner\.png', 717, 2194/);
  assert.match(config, new RegExp(arabicTelegramUrl.replaceAll('.', '\\.')));
  assert.match(config, new RegExp(arabicYoutubeUrl.replaceAll('.', '\\.')));
  assert.doesNotMatch(config, staleArabicSocialHandlePattern);
});
