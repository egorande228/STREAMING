import { cp, mkdir, rm } from 'node:fs/promises';

const files = ['index.html', 'news.html', 'admin.html', 'app.js', 'news.js', 'admin.js', 'analytics-init.js', 'theme.js', 'url-propagation.js', 'styles.css', 'admin.css', 'config.js', '_headers', '_redirects', 'assets'];

await rm(new URL('./dist/', import.meta.url), { recursive: true, force: true });
await mkdir(new URL('./dist/', import.meta.url), { recursive: true });

for (const file of files) {
  await cp(new URL(`./${file}`, import.meta.url), new URL(`./dist/${file}`, import.meta.url), {
    recursive: true,
  });
}

await cp(new URL('../banners/', import.meta.url), new URL('./dist/banners/', import.meta.url), {
  recursive: true,
});

await cp(new URL('./stream.json', import.meta.url), new URL('./dist/stream.json', import.meta.url));
