const runtimeConfig = window.KINGLIVE_RUNTIME || {};
const unifiedApiBase = String(runtimeConfig.apiBase || window.KINGLIVE_API_BASE || 'https://kinglive-football-api.figurator228.workers.dev').replace(/\/$/, '');

window.KINGLIVE_MAIN_CONFIG = {
  apiBase: unifiedApiBase,
  adminApiBase: unifiedApiBase,
  activeStreamsApiUrl: `${unifiedApiBase}/api/streams/active`,
  playerBase: 'https://stream-player-site.pages.dev',
  streamConfigUrl: './stream.json',
  newsApiUrl: `${unifiedApiBase}/api/news?limit=6&v=20260518-main-unified`,
  sponsorUrl: 'https://refpa3665.com/L?tag=d_5517121m_66329c_worldcuplive',
  defaultLocale: 'en',
  manualMatchesOnly: true,
  manualMatches: [
    {
      id: 20260530,
      scheduled_at: '2026-05-30T19:00:00Z',
      status: 'scheduled',
      home_score: 0,
      away_score: 0,
      home_team: {
        name_en: 'Paris Saint Germain',
        flag_url: 'https://media.api-sports.io/football/teams/85.png',
      },
      away_team: {
        name_en: 'Arsenal',
        flag_url: 'https://media.api-sports.io/football/teams/42.png',
      },
      league: { name: 'UEFA Champions League' },
      stage: 'Final',
      venue: 'Puskas Arena',
      city: 'Budapest',
      streams: [{ url: 'https://stream-player-site.pages.dev/?match=20260530', is_active: true }],
    },
  ],
  adSlots: {},
};
