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
  assert.match(config, /const bannerClickUrl = 'https:\/\/refpa3665\.com\/L\?tag=d_5674754m_66329c_KINGLIVE2026(&amp;|&)site=5674754(&amp;|&)ad=66329'/);
  assert.match(config, /function safeBannerFile\(file\)/);
  assert.match(config, /src="\.\.\/banners\/\$\{safeFile\}"/);
  assert.match(config, /href="\$\{safeHref\}" target="_blank" rel="nofollow sponsored noopener"/);
  assert.match(config, /const unifiedApiBase = String\(runtimeConfig\.apiBase \|\| window\.KINGLIVE_API_BASE \|\|/);
  assert.match(config, /playerTop: banner\('melbet_top_banner_1554x192\.png', 1554, 192/);
  assert.match(config, /playerBottom: banner\('melbet_bottom_banner_1554x192\.png', 1554, 192/);
  assert.match(config, /playerRail: banner\('melbet_right_banner\.png', 717, 2194/);
});
