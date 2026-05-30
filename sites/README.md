# Static Cloudflare Pages sites

This directory contains standalone static deployments that do not require a Node.js server.

- `main`: public homepage and match launcher.
- `player`: standalone stream player for HLS and iframe restream sources.

Deploy each subfolder as a separate Cloudflare Pages project. Configure the runtime endpoints in each `config.js` before publishing.
