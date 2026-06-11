import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mainHtml = readFileSync(new URL('./main/index.html', import.meta.url), 'utf8');
const mainConfig = readFileSync(new URL('./main/config.js', import.meta.url), 'utf8');
const playerHtml = readFileSync(new URL('./player/index.html', import.meta.url), 'utf8');
const playerConfig = readFileSync(new URL('./player/config.js', import.meta.url), 'utf8');
const playerReadme = readFileSync(new URL('./player/README.md', import.meta.url), 'utf8');

assert.match(mainHtml, /KingLive/);
assert.match(mainHtml, /Matchday Hub/);
assert.match(mainHtml, /Follow every/);
assert.doesNotMatch(mainHtml, /World football streams/);

assert.match(mainHtml, /sponsor-footer/);
assert.match(mainHtml, /url-propagation\.js/);
assert.match(mainHtml, /refpa3665\.com/);

assert.match(mainConfig, /KINGLIVE_MAIN_CONFIG/);
assert.match(mainConfig, /playerBase/);

assert.match(playerHtml, /KingLive Player/);
assert.match(playerHtml, /id="stage"/);
assert.match(playerHtml, /id="controls"/);
assert.doesNotMatch(playerHtml, /Pass `match`, `src`/);
assert.match(playerHtml, /data-ad-slot="player-top"/);
assert.match(playerHtml, /data-ad-slot="player-bottom"/);
assert.match(playerHtml, /data-ad-slot="player-rail"/);
assert.match(playerHtml, /url-propagation\.js/);
assert.match(playerConfig, /KINGLIVE_PLAYER_CONFIG/);
assert.match(playerConfig, /streamConfigUrl/);
assert.doesNotMatch(playerReadme, /\?src=/);
