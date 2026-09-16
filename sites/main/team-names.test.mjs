import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const context = { window: {} };
vm.runInNewContext(readFileSync(new URL('./team-names.js', import.meta.url), 'utf8'), context);
const { teams, arabicName } = context.window.KINGLIVE_TEAM_NAMES;

// Official 2026/27 rosters, independently checked on 2026-09-16 (TEAM-NAMES.md).
const rosters = {
  pl: ['Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton & Hove Albion', 'Chelsea', 'Coventry City', 'Crystal Palace', 'Everton', 'Fulham', 'Hull City', 'Ipswich Town', 'Leeds United', 'Liverpool', 'Manchester City', 'Manchester United', 'Newcastle United', 'Nottingham Forest', 'Sunderland', 'Tottenham Hotspur'],
  laliga: ['Athletic Club', 'Atlético de Madrid', 'CA Osasuna', 'Celta', 'Deportivo Alavés', 'Elche CF', 'FC Barcelona', 'Getafe CF', 'Levante UD', 'Málaga CF', 'R. Racing Club', 'Rayo Vallecano', 'RC Deportivo', 'RCD Espanyol de Barcelona', 'Real Betis', 'Real Madrid', 'Real Sociedad', 'Sevilla FC', 'Valencia CF', 'Villarreal CF'],
  ucl: ['AEK Athens', 'Arsenal', 'Aston Villa', 'Atlético de Madrid', 'FC Barcelona', 'Bayern München', 'Bodø/Glimt', 'Borussia Dortmund', 'Club Brugge', 'Como', 'Fenerbahçe', 'Feyenoord', 'Galatasaray', 'Inter', 'LASK', 'Leipzig', 'Lens', 'Lille', 'Liverpool', 'Manchester City', 'Manchester United', 'Napoli', 'Paris Saint-Germain', 'Porto', 'PSV', 'Real Betis', 'Real Madrid', 'Roma', 'Sabah', 'Shakhtar', 'Slavia Praha', 'Slovan Bratislava', 'Sporting CP', 'Stuttgart', 'Viking', 'Villarreal CF'],
};

test('every current PL, LaLiga and UCL league-phase club has an Arabic display label', () => {
  assert.equal(teams.length, 66);
  for (const [competition, expected] of Object.entries(rosters)) {
    assert.deepEqual(Array.from(teams.filter(team => team.competitions.includes(competition)), team => team.name).sort(), [...expected].sort());
    for (const name of expected) {
      const translated = arabicName({ name_en: name });
      assert.match(translated, /[\u0600-\u06ff]/, name);
      assert.doesNotMatch(translated, /[a-z]/i, name);
    }
  }
});

test('provider aliases, punctuation and accents resolve without confusing similar clubs', () => {
  for (const [name, expected] of [
    ['  FC Bayern München  ', 'بايرن ميونخ'],
    ['Bodø/Glimt', 'بودو غليمت'],
    ['BODO-GLIMT', 'بودو غليمت'],
    ['Brighton and Hove Albion FC', 'برايتون أند هوف ألبيون'],
    ['Manchester United FC', 'مانشستر يونايتد'],
    ['Man City', 'مانشستر سيتي'],
    ['Athletic Bilbao', 'أتلتيك بلباو'],
    ['Atletico Madrid', 'أتلتيكو مدريد'],
    ['FC Internazionale Milano', 'إنتر ميلان'],
    ['Racing Santander', 'راسينغ سانتاندير'],
    ['Paris', 'باريس سان جيرمان'],
    ['Paris FC', ''],
    ['City', ''],
    ['Unknown Club', ''],
  ]) assert.equal(arabicName({ name_en: name }), expected, name);
  assert.equal(arabicName({ name: 'Real Madrid' }), 'ريال مدريد');
  assert.equal(arabicName({ name_en: 'Unknown Club', name_ar: 'اسم عربي' }), 'اسم عربي');
});
