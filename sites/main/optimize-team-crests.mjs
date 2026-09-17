import { readFile, mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const manifest = JSON.parse(await readFile(new URL('./team-crest-sources.json', import.meta.url), 'utf8'));
const outputDir = new URL('./assets/team-crests-webp/', import.meta.url);
await mkdir(outputDir, { recursive: true });

let totalPngBytes = 0;
let totalWebpBytes = 0;
for (const [id, mediumUrl] of Object.entries(manifest.crests)) {
  if (!/^[a-z0-9-]+$/.test(id) || !mediumUrl.startsWith('https://assets.laliga.com/assets/')) {
    throw new Error(`Unexpected crest source: ${id}`);
  }
  const sourceUrl = mediumUrl.replace('/medium/', '/xsmall/');
  const response = await fetch(sourceUrl);
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/png')) {
    throw new Error(`Crest download failed: ${id} (${response.status})`);
  }
  const png = Buffer.from(await response.arrayBuffer());
  const webp = await sharp(png).webp({ quality: 82, effort: 6 }).toBuffer();
  await writeFile(new URL(`${id}.${manifest.version}.webp`, outputDir), webp);
  totalPngBytes += png.length;
  totalWebpBytes += webp.length;
  process.stdout.write(`${id}: ${png.length} -> ${webp.length} bytes\n`);
}
process.stdout.write(`Total: ${totalPngBytes} -> ${totalWebpBytes} bytes\n`);
