# Main site for Cloudflare Pages

This folder is a standalone static site. Deploy `sites/main` as the Cloudflare Pages project root.

## Configure

Edit `config.js` before deploying:

```js
window.KINGLIVE_MAIN_CONFIG = {
  apiBase: 'https://api.example.com',
  activeStreamsApiUrl: 'https://api.example.com/api/streams/active',
  playerBase: 'https://player.example.com',
  streamConfigUrl: './stream.json',
  defaultLocale: 'en',
  adSlots: {
    mainTop: '<iframe src="https://ads.example.com/970x90" width="970" height="90"></iframe>',
    mainHero: '',
    mainHeroMobile: '',
    mainRailTop: '',
    mainRailTall: '',
    mainBottom: '',
  },
};
```

`apiBase` can be empty when `/api/*` is routed to the backend by the same domain.
`activeStreamsApiUrl` is the primary source for showing the stream button in match details.
`playerBase` should point to the separate player Pages project or subdomain.
The match list expects `/api/matches*` to return current fixtures. It shows the player button only when the selected match is currently active in `/api/streams/active` (or in legacy `stream.json` fallback). Live cards also request `/api/matches/:id/stats` for compact match stats.

Legacy fallback `stream.json` (optional):

```json
{
  "match_id": 1379275,
  "is_active": true
}
```

## Banner slots

- `mainTop`: 970x90 leaderboard above the hero.
- `mainHero`: 300x250 rectangle inside the hero on desktop.
- `mainHeroMobile`: 336x280 rectangle inside the hero on mobile.
- `mainRailTop`: 300x250 rectangle beside the match list on desktop.
- `mainRailTall`: 300x600 half-page beside the match list on desktop.
- `mainBottom`: 970x250 billboard above the final KingLive CTA section.

## Deploy

Cloudflare Pages settings:

- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `sites/main`

Important:

- For GitHub integration, connect the repository in Cloudflare Pages and use the settings above.
- Do not use `npx wrangler deploy` for a Pages project.
- For manual CLI publishing, use `npx wrangler pages deploy dist --project-name <your-pages-project>`.
