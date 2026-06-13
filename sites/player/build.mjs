import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');
const files = [
  'index.html',
  'app.js',
  'analytics.js',
  'url-propagation.js',
  'styles.css',
  'config.js',
  '_headers',
  '_redirects',
  'streams.json',
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

async function copyTree(from, to) {
  const fromPath = typeof from === 'string' ? from : fileURLToPath(from);
  const toPath = typeof to === 'string' ? to : fileURLToPath(to);
  await mkdir(toPath, { recursive: true });
  for (const entry of await readdir(fromPath, { withFileTypes: true })) {
    const source = join(fromPath, entry.name);
    const target = join(toPath, entry.name);
    if (entry.isDirectory()) {
      await copyTree(source, target);
    } else {
      await copyFile(source, target);
    }
  }
}

for (const file of files) {
  await copyFile(join(root, file), join(dist, file));
}

await copyTree(join(root, 'assets'), join(dist, 'assets'));
await copyTree(join(root, '..', 'banners'), join(dist, 'banners'));
