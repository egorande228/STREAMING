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
  adSlots: {},
};
