import { readFile, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const manifest = JSON.parse(await readFile(new URL('./team-crest-sources.json', import.meta.url), 'utf8'));
const outputDir = new URL('./assets/team-crests-webp/', import.meta.url);
await mkdir(outputDir, { recursive: true });

let totalPngBytes = 0;
let totalWebpBytes = 0;
const generated = {};
const expectedFiles = new Set();
const entries = Object.entries(manifest.crests);
let cursor = 0;
async function optimizeNext() {
  while (cursor < entries.length) {
    const [key, source] = entries[cursor++];
  if (!/^(?:laliga|uefa|football-data):[a-z0-9-]+$/.test(key) || !/^https:\/\//.test(source)) {
    throw new Error(`Unexpected crest source: ${key}`);
  }
  const sourceUrl = source.includes('assets.laliga.com/') ? source.replace('/medium/', '/xsmall/') : source;
  const response = await fetch(sourceUrl);
  if (!response.ok || !/^image\/(?:png|jpe?g)/i.test(response.headers.get('content-type') || '')) {
    throw new Error(`Crest download failed: ${key} (${response.status})`);
  }
  const input = Buffer.from(await response.arrayBuffer());
  const webp = await sharp(input).resize({ width: 144, height: 144, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 70, alphaQuality: 86, smartSubsample: true, effort: 6 }).toBuffer();
  const filename = `${key.replace(':', '-')}.${manifest.version}.webp`;
  await writeFile(new URL(filename, outputDir), webp);
  generated[key] = `./assets/team-crests-webp/${filename}`;
  expectedFiles.add(filename);
  totalPngBytes += input.length;
  totalWebpBytes += webp.length;
  process.stdout.write(`${key}: ${input.length} -> ${webp.length} bytes\n`);
  }
}
await Promise.all(Array.from({ length: Math.min(8, entries.length) }, () => optimizeNext()));
for (const filename of await readdir(outputDir)) {
  if (filename.endsWith('.webp') && !expectedFiles.has(filename)) await rm(new URL(filename, outputDir));
}
await writeFile(new URL('./team-crest-assets.js', import.meta.url),
  `(function () { window.KINGLIVE_TEAM_CRESTS = Object.freeze(${JSON.stringify(generated, null, 2)}); })();\n`);
process.stdout.write(`Total: ${totalPngBytes} -> ${totalWebpBytes} bytes\n`);
