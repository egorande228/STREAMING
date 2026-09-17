import { readFile, writeFile } from 'node:fs/promises';

const manifestUrl = new URL('./team-crest-sources.json', import.meta.url);
const appSource = await readFile(new URL('./app.js', import.meta.url), 'utf8');
const previous = JSON.parse(await readFile(manifestUrl, 'utf8'));
const compactNow = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const version = process.env.KINGLIVE_CREST_VERSION || compactNow;
const seasonYear = Number(process.env.KINGLIVE_UEFA_SEASON || (new Date().getUTCMonth() >= 6 ? new Date().getUTCFullYear() + 1 : new Date().getUTCFullYear()));
const crests = {};

for (const [legacyKey, source] of Object.entries(previous.crests || {})) {
  if (source.includes('assets.laliga.com/')) crests[`laliga:${legacyKey.replace(/^laliga:/, '')}`] = source;
}

for (const match of appSource.matchAll(/https:\/\/crests\.football-data\.org\/([a-z0-9-]+)\.(?:png|jpe?g)/gi)) {
  crests[`football-data:${match[1].toLowerCase()}`] = match[0];
}

const response = await fetch(`https://match.uefa.com/v5/matches?competitionId=1&seasonYear=${seasonYear}&limit=500&offset=0`, {
  headers: { Accept: 'application/json' },
  signal: AbortSignal.timeout(20_000),
});
if (!response.ok) throw new Error(`UEFA crest catalog failed: ${response.status}`);
const matches = await response.json();
if (!Array.isArray(matches) || !matches.length || matches.length >= 500) throw new Error('Incomplete UEFA crest catalog');
for (const match of matches) {
  for (const side of ['homeTeam', 'awayTeam']) {
    const team = match[side];
    const source = team?.mediumLogoUrl || team?.logoUrl || '';
    if (/^https:\/\/img\.uefa\.com\/imgml\/TP\/teams\/logos\/\d+x\d+\/\d+\.png$/i.test(source)) {
      crests[`uefa:${team.id}`] = source;
    }
  }
}

const ordered = Object.fromEntries(Object.entries(crests).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(manifestUrl, `${JSON.stringify({ version, seasonYear, crests: ordered }, null, 2)}\n`);
process.stdout.write(`Catalog: ${Object.keys(ordered).length} raster crests for WebP optimization\n`);
