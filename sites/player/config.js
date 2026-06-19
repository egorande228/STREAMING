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
  allowDirectStreamParams: window.location.hostname === 'player-dev.melteam.org',
  defaultLang: 'en',
  defaultRegion: 'global',
  socialLinksByLang: {
    ar: [
      { brand: 'telegram', label: 'Telegram', url: 'https://t.me/worldcup_live2026arabia' },
      { brand: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@%D8%A7%D9%84%D8%B9%D8%A7%D9%84%D9%85%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%D8%A8%D8%B7%D9%88%D9%84%D8%A9%D8%A7%D9%84%D8%B9%D8%A7%D9%84%D9%852026' },
      { brand: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@2026melbetworldcuparabia?_r=1&_t=ZS-96xaxd2saoP' },
      { brand: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/share/18nunR1PmA/?mibextid=wwXIfr' },
      { brand: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/2026melbetfifaworldcuparabia?igsh=aDZsY3R6eHhxYzkx&utm_source=qr' },
    ],
    en: [
      { brand: 'telegram', label: 'Telegram', url: 'https://t.me/worldcuplive_international' },
      { brand: 'facebook', label: 'Facebook', url: 'https://facebook.com/worldcupliveinternationalll' },
      { brand: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/worldcuplive_international/' },
    ],
    es: [
      { brand: 'telegram', label: 'Telegram', url: 'https://t.me/worldcuplive_international' },
      { brand: 'facebook', label: 'Facebook', url: 'https://facebook.com/worldcupliveinternationalll' },
      { brand: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/worldcuplive_international/' },
    ],
  },
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
