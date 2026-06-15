const runtimeConfig = window.KINGLIVE_RUNTIME || {};
const unifiedApiBase = String(runtimeConfig.apiBase || window.KINGLIVE_API_BASE || 'https://kinglive-football-api.figurator228.workers.dev').replace(/\/$/, '');
const bannerClickUrl = 'https://qweqr.sbs/jJQN6M';

function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeBannerFile(file) {
  const baseName = String(file || '').split('/').pop() || '';
  return encodeURIComponent(baseName);
}

const banner = (file, width, height, label = 'Advertisement', href = bannerClickUrl) => {
  const safeLabel = escapeHtmlAttr(label || 'Advertisement');
  const safeFile = safeBannerFile(file);
  const safeHref = escapeHtmlAttr(href || '#');
  const safeWidth = Number(width) > 0 ? Number(width) : 300;
  const safeHeight = Number(height) > 0 ? Number(height) : 250;
  return `
  <a class="banner-link" href="${safeHref}" target="_blank" rel="nofollow sponsored noopener" aria-label="${safeLabel}">
    <img src="../banners/${safeFile}" width="${safeWidth}" height="${safeHeight}" alt="${safeLabel}" loading="lazy" />
  </a>
`;
};

window.KINGLIVE_PLAYER_CONFIG = {
  apiBase: unifiedApiBase,
  activeStreamsApiUrl: `${unifiedApiBase}/api/streams/active`,
  streamConfigUrl: './streams.json',
  defaultLang: 'en',
  defaultRegion: 'global',
  tgPopup: {
    enabled: true,
    title: 'World Cup Telegram',
    message: 'Join our Telegram channels for match updates and live stream alerts.',
    buttonLabel: 'Open Telegram',
    urls: ['https://t.me/worldcuplive_international'],
    delayMs: 0,
  },
  adSlots: {
    playerTop: banner('melbet_top_banner_1554x192.png', 1554, 192, 'Melbet sports bonus'),
    playerBottom: banner('melbet_bottom_banner_1554x192.png', 1554, 192, 'Melbet sports bonus'),
    playerRail: banner('melbet_right_banner.png', 717, 2194, 'Melbet live football streams'),
  },
};
