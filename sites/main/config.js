const runtimeConfig = window.KINGLIVE_RUNTIME || {};
const unifiedApiBase = String(runtimeConfig.apiBase || window.KINGLIVE_API_BASE || 'https://kinglive-football-api.figurator228.workers.dev').replace(/\/$/, '');
const isDevHost = /(^|[.-])dev([.-]|$)|\.pages\.dev$/i.test(window.location.hostname || '');
const defaultPlayerBase = 'https://livekinglive.win';
const playerBase = String(runtimeConfig.playerBase || window.KINGLIVE_PLAYER_BASE || defaultPlayerBase).replace(/\/$/, '');

window.KINGLIVE_MAIN_CONFIG = {
  apiBase: unifiedApiBase,
  adminApiBase: unifiedApiBase,
  activeStreamsApiUrl: `${unifiedApiBase}/api/streams/active`,
  playerBase,
  streamConfigUrl: './stream.json',
  newsApiUrl: `${unifiedApiBase}/api/news?limit=6&v=20260518-main-unified`,
  sponsorUrl: 'https://qweqr.sbs/jJQN6M',
  defaultLocale: 'en',
  adSlots: {},
};
