import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mainHtml = readFileSync(new URL('./main/index.html', import.meta.url), 'utf8');
const mainConfig = readFileSync(new URL('./main/config.js', import.meta.url), 'utf8');
const playerHtml = readFileSync(new URL('./player/index.html', import.meta.url), 'utf8');
const playerConfig = readFileSync(new URL('./player/config.js', import.meta.url), 'utf8');
const playerReadme = readFileSync(new URL('./player/README.md', import.meta.url), 'utf8');

assert.match(mainHtml, /KingLive/);
assert.match(mainHtml, /Тоглолтын төв/);
assert.match(mainHtml, /Бүх/);
assert.doesNotMatch(mainHtml, /World football streams/);

assert.match(mainHtml, /sponsor-footer/);

assert.match(mainConfig, /KINGLIVE_MAIN_CONFIG/);
assert.match(mainConfig, /playerBase/);
assert.match(mainConfig, /defaultLocale: 'mn'/);

assert.match(playerHtml, /KingLive тоглуулагч/);
assert.match(playerHtml, /Тоглолт хүлээж байна/);
assert.doesNotMatch(playerHtml, /Pass `match`, `src`/);
assert.match(playerHtml, /data-ad-slot="player-top"/);
assert.match(playerHtml, /data-ad-slot="player-bottom"/);
assert.match(playerHtml, /data-ad-slot="player-rail"/);
assert.match(playerConfig, /KINGLIVE_PLAYER_CONFIG/);
assert.match(playerConfig, /streamConfigUrl/);
assert.match(playerConfig, /defaultLang: 'mn'/);
assert.doesNotMatch(playerReadme, /\?src=/);
