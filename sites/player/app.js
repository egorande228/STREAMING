(function () {
  const config = window.KINGLIVE_PLAYER_CONFIG || {};
  const apiBase = String(config.apiBase || '').replace(/\/$/, '');
  const params = new URLSearchParams(window.location.search);
  const isPreviewMode = params.get('preview') === '1';
  if (isPreviewMode) document.documentElement.classList.add('player-preview-mode');
  const streamConfigUrl = config.streamConfigUrl || './streams.json';
  const activeStreamsApiUrl = config.activeStreamsApiUrl || `${apiBase}/api/streams/active`;
  const viewerHeartbeatBase = apiBase ? `${apiBase}/api/viewers` : '';
  const preferredLang = params.get('lang') || config.defaultLang || 'en';
  const normalizedPreferredLang = normalizePreferredLanguage(preferredLang);
  const uiLocale = ['en', 'es', 'fr', 'ar', 'mn'].includes(normalizedPreferredLang) ? normalizedPreferredLang : 'en';
  const i18n = {
    en: {
      advertisement: 'Advertisement', streamPlayer: 'Stream player', nowPlaying: 'Now playing', stream: 'Stream', source: 'Source', copyIframe: 'Copy iframe', copied: 'Copied', copyIframeCode: 'Copy iframe code', close: 'Close', community: 'Community', telegramTitle: 'World Cup Telegram', telegramMessage: 'Join our Telegram channels for match updates and live stream alerts.', openTelegram: 'Open Telegram', playStream: 'Play stream', loadingStream: 'Loading stream...', adblockTitle: 'Ad blocker detected', adblockMessage: 'KingLive is supported by sponsor banners. Please disable your ad blocker for this site to keep streams and match updates available.', continue: 'Continue', watching: 'watching', tbd: 'TBD', configuredStream: 'Configured stream', englishIframe: 'English iframe', player: 'Player', home: 'KingLive home', socialContacts: 'Social contacts',
    },
    es: {
      advertisement: 'Publicidad', streamPlayer: 'Reproductor de transmisión', nowPlaying: 'Reproduciendo ahora', stream: 'Transmisión', source: 'Fuente', copyIframe: 'Copiar iframe', copied: 'Copiado', copyIframeCode: 'Copiar código iframe', close: 'Cerrar', community: 'Comunidad', telegramTitle: 'Telegram del Mundial', telegramMessage: 'Únete a nuestros canales de Telegram para recibir novedades de partidos y alertas de transmisiones en vivo.', openTelegram: 'Abrir Telegram', playStream: 'Reproducir transmisión', loadingStream: 'Cargando transmisión...', adblockTitle: 'Bloqueador de anuncios detectado', adblockMessage: 'KingLive se financia mediante banners de patrocinadores. Desactiva el bloqueador de anuncios en este sitio para mantener disponibles las transmisiones y las actualizaciones de los partidos.', continue: 'Continuar', watching: 'viendo', tbd: 'Por confirmar', configuredStream: 'Transmisión configurada', englishIframe: 'Iframe en inglés', player: 'Reproductor', home: 'Inicio de KingLive', socialContacts: 'Contactos sociales',
    },
    fr: {
      advertisement: 'Publicité', streamPlayer: 'Lecteur de stream', nowPlaying: 'Lecture en cours', stream: 'Stream', source: 'Source', copyIframe: 'Copier l’iframe', copied: 'Copié', copyIframeCode: 'Copier le code iframe', close: 'Fermer', community: 'Communauté', telegramTitle: 'Telegram de la Coupe du monde', telegramMessage: 'Rejoignez nos chaînes Telegram pour recevoir les nouvelles des matchs et les alertes de streams en direct.', openTelegram: 'Ouvrir Telegram', playStream: 'Lire le stream', loadingStream: 'Chargement du stream...', adblockTitle: 'Bloqueur de publicités détecté', adblockMessage: 'KingLive est financé par les bannières de ses sponsors. Désactivez votre bloqueur de publicités pour ce site afin de conserver l’accès aux streams et aux mises à jour des matchs.', continue: 'Continuer', watching: 'regardent', tbd: 'À confirmer', configuredStream: 'Stream configuré', englishIframe: 'Iframe en anglais', player: 'Lecteur', home: 'Accueil KingLive', socialContacts: 'Réseaux sociaux',
    },
    ar: {
      advertisement: 'إعلان', streamPlayer: 'مشغل البث', nowPlaying: 'يُعرض الآن', stream: 'البث', source: 'المصدر', copyIframe: 'نسخ iframe', copied: 'تم النسخ', copyIframeCode: 'نسخ كود iframe', close: 'إغلاق', community: 'المجتمع', telegramTitle: 'تيليجرام كأس العالم', telegramMessage: 'انضم إلى قنواتنا على تيليجرام للحصول على تحديثات المباريات وتنبيهات البث المباشر.', openTelegram: 'فتح تيليجرام', playStream: 'تشغيل البث', loadingStream: 'جارٍ تحميل البث...', adblockTitle: 'تم اكتشاف مانع إعلانات', adblockMessage: 'يعتمد KingLive على إعلانات الرعاة. يرجى تعطيل مانع الإعلانات لهذا الموقع للحفاظ على توفر البث وتحديثات المباريات.', continue: 'متابعة', watching: 'يشاهدون', tbd: 'يحدد لاحقًا', configuredStream: 'بث مهيأ', englishIframe: 'إطار إنجليزي', player: 'المشغل', home: 'الرئيسية في KingLive', socialContacts: 'حسابات التواصل',
    },
    mn: {
      advertisement: 'Зар сурталчилгаа', streamPlayer: 'Дамжуулалтын тоглуулагч', nowPlaying: 'Одоо тоглож байна', stream: 'Дамжуулалт', source: 'Эх сурвалж', copyIframe: 'Iframe хуулах', copied: 'Хуулсан', copyIframeCode: 'Iframe код хуулах', close: 'Хаах', community: 'Нийгэмлэг', telegramTitle: 'Дэлхийн цомын Telegram', telegramMessage: 'Тоглолтын шинэчлэлт болон шууд дамжуулалтын мэдэгдэл авахын тулд манай Telegram сувгуудад нэгдээрэй.', openTelegram: 'Telegram нээх', playStream: 'Дамжуулалт тоглуулах', loadingStream: 'Дамжуулалт ачаалж байна...', adblockTitle: 'Зар хориглогч илэрлээ', adblockMessage: 'KingLive нь ивээн тэтгэгчийн баннераар дэмжигддэг. Шууд дамжуулалт болон тоглолтын шинэчлэлтийг үзэхийн тулд энэ сайтад зар хориглогчоо унтраана уу.', continue: 'Үргэлжлүүлэх', watching: 'үзэж байна', tbd: 'Тодорхойгүй', configuredStream: 'Тохируулсан дамжуулалт', englishIframe: 'Англи iframe', player: 'Тоглуулагч', home: 'KingLive нүүр', socialContacts: 'Сошиал холбоос',
    },
  };
  const preferredRegion = params.get('region') || config.defaultRegion || 'global';
  const stage = document.getElementById('stage');
  const controls = document.getElementById('controls');
  const titleEl = document.getElementById('title');
  const sourceSelect = document.getElementById('source-select');
  const copyEmbed = document.getElementById('copy-embed');
  const viewerCountEl = document.getElementById('viewer-count');
  const tgPopup = document.getElementById('tg-popup');
  const adSlots = config.adSlots || {};
  const tgPopupConfig = config.tgPopup || {};
  const socialLinksByLang = config.socialLinksByLang || {};
  const allowDirectStreamParams = config.allowDirectStreamParams === true;
  let matchStreams = config.matchStreams || {};
  let tgPopupDismissed = false;
  let viewerHeartbeatTimer = null;
  let viewerMatchId = '';
  const adSlotKeys = {
    'player-top': 'playerTop',
    'player-bottom': 'playerBottom',
    'player-rail': 'playerRail',
  };
  const MANAGED_PLAYBACK_CHECK_INTERVAL_MS = 3000;
  const MANAGED_PLAYBACK_NUDGE_AFTER_MS = 20000;
  const MANAGED_PLAYBACK_RELOAD_AFTER_MS = 90000;
  const MANAGED_PLAYBACK_RELOAD_COOLDOWN_MS = 300000;
  let currentStreams = [];
  let hls;
  let videoJsPlayer = null;
  let managedPlaybackTimer = null;
  let managedPlaybackReloadedAt = 0;

  const isAdmin = params.get('admin') === '1';
  const viewerClientId = getViewerClientId();

  copyEmbed.hidden = !isAdmin;

  function t(key) {
    return i18n[uiLocale]?.[key] ?? i18n.en[key] ?? key;
  }

  function localizePlayerChrome() {
    if (document.documentElement) {
      document.documentElement.lang = uiLocale;
      document.documentElement.dir = uiLocale === 'ar' ? 'rtl' : 'ltr';
    }
    Array.from(document.querySelectorAll?.('[data-i18n]') || []).forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    Array.from(document.querySelectorAll?.('[data-i18n-aria]') || []).forEach((element) => {
      element.setAttribute('aria-label', t(element.dataset.i18nAria));
    });
    Array.from(document.querySelectorAll?.('[data-ad-slot]') || []).forEach((element) => {
      element.setAttribute?.('aria-label', t('advertisement'));
      Array.from(element.querySelectorAll?.('img') || []).forEach((image) => image.setAttribute('alt', t('advertisement')));
      Array.from(element.querySelectorAll?.('a') || []).forEach((link) => link.setAttribute('aria-label', t('advertisement')));
    });
    if (titleEl && !params.get('title')) titleEl.textContent = t('stream');
    if (copyEmbed) copyEmbed.textContent = t('copyIframe');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getViewerClientId() {
    try {
      const existing = window.localStorage?.getItem('kinglive_viewer_client_id');
      if (existing) return existing;
      const next = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      window.localStorage?.setItem('kinglive_viewer_client_id', next);
      return next;
    } catch {
      return `${Date.now()}`;
    }
  }

  function clearPlayer() {
    stopViewerHeartbeat();
    destroyHls();
    stage.innerHTML = '';
    controls.hidden = true;
    attachTelegramPopupToStage();
  }

  function attachTelegramPopupToStage() {
    if (!tgPopup || !stage) return;
    if (tgPopupDismissed || tgPopup.hidden || !tgPopup.innerHTML) return;
    // In test stubs stage has no querySelector; keep previous behavior there.
    if (typeof stage.querySelector !== 'function') return;
    if (tgPopup.parentElement !== stage) stage.appendChild(tgPopup);
    if (tgPopup.classList && typeof tgPopup.classList.add === 'function') {
      tgPopup.classList.add('tg-popup-on-stage');
    }
  }

  function renderTelegramPopup() {
    if (!tgPopup) return;
    const enabled = tgPopupConfig.enabled !== false;
    const urls = telegramPopupUrls();
    const url = nextTelegramPopupUrl(urls, String(tgPopupConfig.url || '').trim());
    if (!enabled || !url) {
      tgPopup.hidden = true;
      tgPopup.innerHTML = '';
      return;
    }

    const title = tgPopupConfig.titleByLang?.[uiLocale] || (uiLocale === 'en' ? tgPopupConfig.title : '') || t('telegramTitle');
    const message = tgPopupConfig.messageByLang?.[uiLocale] || (uiLocale === 'en' ? tgPopupConfig.message : '') || t('telegramMessage');
    const buttonLabel = tgPopupConfig.buttonLabelByLang?.[uiLocale] || (uiLocale === 'en' ? tgPopupConfig.buttonLabel : '') || t('openTelegram');
    const delayMs = Math.max(0, Number(tgPopupConfig.delayMs) || 0);

    tgPopup.innerHTML = `
      <section class="tg-popup-card" role="dialog" aria-label="${escapeHtml(title)}">
        <button class="tg-popup-close" type="button" data-tg-close aria-label="${escapeHtml(t('close'))}">×</button>
        <p class="tg-popup-kicker">${escapeHtml(t('community'))}</p>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
        <a class="button tg-popup-button" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(buttonLabel)}</a>
      </section>
    `;

    tgPopup.addEventListener('click', (event) => {
      if (!event.target.closest('[data-tg-close]')) return;
      tgPopupDismissed = true;
      tgPopup.hidden = true;
      tgPopup.innerHTML = '';
    });

    if (delayMs === 0) {
      tgPopup.hidden = false;
      attachTelegramPopupToStage();
      return;
    }

    setTimeout(() => {
      if (tgPopupDismissed) return;
      tgPopup.hidden = false;
      attachTelegramPopupToStage();
    }, delayMs);
  }

  function nextTelegramPopupUrl(urls, fallbackUrl) {
    if (!urls.length) return fallbackUrl;
    const storageKey = 'kinglive.tgPopup.nextIndex';
    let index = 0;
    try {
      index = Math.max(0, Number(window.localStorage?.getItem(storageKey)) || 0);
      window.localStorage?.setItem(storageKey, String((index + 1) % urls.length));
    } catch {
      index = Math.floor(Date.now() / 1000);
    }
    return urls[index % urls.length] || fallbackUrl;
  }

  function telegramPopupUrls() {
    const urlsByLang = tgPopupConfig.urlsByLang && typeof tgPopupConfig.urlsByLang === 'object'
      ? tgPopupConfig.urlsByLang
      : {};
    const explicitLangUrls = Array.isArray(urlsByLang[normalizedPreferredLang])
      ? urlsByLang[normalizedPreferredLang].map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    if (explicitLangUrls.length) return explicitLangUrls;

    const socialTelegramUrls = (socialLinksByLang[normalizedPreferredLang] || [])
      .filter((item) => String(item?.brand || '').toLowerCase() === 'telegram')
      .map((item) => String(item?.url || '').trim())
      .filter(Boolean);
    if (socialTelegramUrls.length) return socialTelegramUrls;

    return Array.isArray(tgPopupConfig.urls)
      ? tgPopupConfig.urls.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
  }

  function inferType(src, explicitType) {
    if (explicitType === 'hls' || explicitType === 'iframe' || explicitType === 'videojs') return explicitType;
    if (explicitType === 'dami-channel') return explicitType;
    if (/^dami-channel:\/?\/?\d+$/i.test(src)) return 'dami-channel';
    if (/\.m3u8(\?|$)/i.test(src)) return 'hls';
    return 'iframe';
  }

  function normalizeLanguageCode(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    const simple = raw.normalize ? raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : raw;
    if (/^(en|eng|english)([-_].*)?$/.test(simple) || /\b(english|eng)\b/.test(simple)) return 'en';
    if (/^(es|spa|spanish|espanol)([-_].*)?$/.test(simple) || /\b(spanish|espanol|spa)\b/.test(simple)) return 'es';
    if (/^(ar|ara|arabic|arab)([-_].*)?$/.test(simple) || /\b(arabic|arab)\b/.test(simple)) return 'ar';
    if (/^(fr|fra|fre|french)([-_].*)?$/.test(simple) || /\b(french|fra|fre)\b/.test(simple)) return 'fr';
    if (/^(ru|rus|russian)([-_].*)?$/.test(simple) || /\b(russian|rus)\b/.test(simple)) return 'ru';
    return '';
  }

  function normalizePreferredLanguage(value) {
    const known = normalizeLanguageCode(value);
    if (known) return known;
    return String(value || '').trim().toLowerCase().split(/[-_\s]/)[0] || '';
  }

  function streamLanguageCode(stream = {}) {
    return normalizeLanguageCode(stream.language_code || stream.languageCode || stream.lang || stream.language || '')
      || normalizeLanguageCode(stream.label || '')
      || normalizeLanguageCode(stream.title || '');
  }

  function setupSocialDock() {
    if (typeof document.querySelector !== 'function') return;
    const dock = document.querySelector('[data-social-dock]');
    const panel = document.querySelector('[data-social-panel]');
    const toggle = document.querySelector('[data-social-toggle]');
    if (!dock || !panel) return;
    const links = socialLinksByLang[normalizedPreferredLang] || socialLinksByLang.en || [];
    panel.innerHTML = links
      .map((item) => {
        const icon = socialIcon(item.brand);
        if (!item.url) {
          return `<span class="social-link disabled" title="${escapeHtml(item.label)}">${icon}<span>${escapeHtml(item.label)}</span></span>`;
        }
        return `
          <a class="social-link ${escapeHtml(item.brand)}" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(item.label)}" aria-label="${escapeHtml(item.label)}">
            ${icon}<span>${escapeHtml(item.label)}</span>
          </a>
        `;
      })
      .join('');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const expanded = dock.classList.toggle('open');
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });
    }
  }

  function socialIcon(brand = '') {
    const icons = {
      telegram: '<svg viewBox="0 0 24 24" focusable="false"><path d="M21.5 4.3 18.4 19c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L5.8 12.6.9 11.1c-1.1-.3-1.1-1.1.2-1.6L20.2 2.2c.9-.3 1.7.2 1.3 2.1Z"/></svg>',
      youtube: '<svg viewBox="0 0 24 24" focusable="false"><path d="M22.3 7.1a3 3 0 0 0-2.1-2.1C18.4 4.5 12 4.5 12 4.5s-6.4 0-8.2.5a3 3 0 0 0-2.1 2.1A31 31 0 0 0 1.2 12a31 31 0 0 0 .5 4.9 3 3 0 0 0 2.1 2.1c1.8.5 8.2.5 8.2.5s6.4 0 8.2-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.9 31 31 0 0 0-.5-4.9ZM9.8 15.3V8.7l5.8 3.3-5.8 3.3Z"/></svg>',
      tiktok: '<svg viewBox="0 0 24 24" focusable="false"><path d="M16.2 3c.4 3 2.1 4.8 4.8 5v3.3a8.3 8.3 0 0 1-4.7-1.5v6.5c0 3.3-2.3 5.7-5.7 5.7a5.5 5.5 0 0 1-5.8-5.4c0-3.5 2.8-5.9 6.5-5.4v3.5c-1.7-.5-3.1.4-3.1 1.9 0 1.2 1 2.1 2.3 2.1 1.4 0 2.3-.9 2.3-2.6V3h3.4Z"/></svg>',
      facebook: '<svg viewBox="0 0 24 24" focusable="false"><path d="M15.7 8.2h-2.3V6.7c0-.6.4-.8.8-.8h1.4V3.1L13.4 3c-2.4 0-3.8 1.5-3.8 4v1.2H7.1v3h2.5V21h3.8v-9.8h2.1l.2-3Z"/></svg>',
      instagram: '<svg viewBox="0 0 24 24" focusable="false"><path d="M7.3 2.8h9.4c2.5 0 4.5 2 4.5 4.5v9.4c0 2.5-2 4.5-4.5 4.5H7.3c-2.5 0-4.5-2-4.5-4.5V7.3c0-2.5 2-4.5 4.5-4.5Zm0 3A1.5 1.5 0 0 0 5.8 7.3v9.4a1.5 1.5 0 0 0 1.5 1.5h9.4a1.5 1.5 0 0 0 1.5-1.5V7.3a1.5 1.5 0 0 0-1.5-1.5H7.3Zm4.7 2.6a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2Zm0 2.2a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Zm4-2.4a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z"/></svg>',
    };
    return `<span class="social-mark ${escapeHtml(brand)}" aria-hidden="true">${icons[brand] || icons.telegram}</span>`;
  }

  function streamLabel(stream, index) {
    return stream.label || `${stream.language_code || 'stream'} ${stream.quality || index + 1}`;
  }

  function configuredStreamsForMatch(matchId) {
    const configured = matchStreams[String(matchId)];
    if (!configured) return [];
    const streams = Array.isArray(configured) ? configured : [configured];

    return streams
      .map((stream, index) => {
        if (typeof stream === 'string') {
          return {
            id: `config-${matchId}-${index}`,
            url: stream,
            source_type: inferType(stream),
            label: t('configuredStream'),
            language_code: preferredLang,
            region: preferredRegion,
            priority: 100 - index,
            is_active: true,
          };
        }

        if (!stream || !stream.url) return null;
        return {
          id: stream.id || `config-${matchId}-${index}`,
          url: stream.url,
          source_type: stream.source_type || stream.sourceType || inferType(stream.url),
          label: stream.label || t('configuredStream'),
          language_code: stream.language_code || stream.languageCode || preferredLang,
          region: stream.region || preferredRegion,
          priority: typeof stream.priority === 'number' ? stream.priority : 100 - index,
          is_active: stream.is_active !== false && stream.isActive !== false,
          title: stream.title || '',
          starts_at: stream.starts_at || stream.startsAt || null,
          ends_at: stream.ends_at || stream.endsAt || null,
        };
      })
      .filter((stream) => stream && isStreamActiveNow(stream));
  }

  function isStreamActiveNow(stream) {
    if (!stream || stream.is_active === false || stream.isActive === false) return false;
    const startsAt = Date.parse(stream.starts_at || stream.startsAt || '');
    const endsAt = Date.parse(stream.ends_at || stream.endsAt || '');
    const now = Date.now();
    if (!Number.isNaN(startsAt) && now < startsAt) return false;
    if (!Number.isNaN(endsAt) && now > endsAt) return false;
    return true;
  }

  function activeStreamMatchIds() {
    return Object.entries(matchStreams)
      .filter(([, configured]) => {
        const streams = Array.isArray(configured) ? configured : [configured];
        return streams.some((stream) => {
          if (typeof stream === 'string') return Boolean(stream);
          return stream?.url && isStreamActiveNow(stream);
        });
      })
      .map(([matchId]) => matchId);
  }

  async function loadStreamConfig() {
    if (apiBase) {
      try {
        const response = await fetch(activeStreamsApiUrl, { cache: 'no-store' });
        if (response.ok) {
          const payload = await response.json();
          if (payload && typeof payload === 'object' && payload.streams && typeof payload.streams === 'object') {
            if (Object.keys(payload.streams).length) return payload.streams;
          }
        }
      } catch {}
    }

    try {
      const response = await fetch(streamConfigUrl, { cache: 'no-store' });
      if (!response.ok) return config.matchStreams || {};
      const data = await response.json();
      return data && typeof data === 'object' ? data : {};
    } catch {
      return config.matchStreams || {};
    }
  }

  function sortStreams(streams) {
    return [...streams].sort((a, b) => {
      const aLang = streamLanguageCode(a) === normalizedPreferredLang ? 0 : 1;
      const bLang = streamLanguageCode(b) === normalizedPreferredLang ? 0 : 1;
      if (aLang !== bLang) return aLang - bLang;
      const aRegion = a.region === preferredRegion || a.region === 'global' ? 0 : 1;
      const bRegion = b.region === preferredRegion || b.region === 'global' ? 0 : 1;
      if (aRegion !== bRegion) return aRegion - bRegion;
      return (b.priority || 0) - (a.priority || 0);
    });
  }

  function isRequestedSource(stream = {}, requestedSource = '') {
    if (!requestedSource) return false;
    const keys = [
      stream.id,
      stream.label,
      stream.source_type,
      stream.sourceType,
      stream.language_code,
      stream.languageCode,
    ];
    return keys.some((key) => String(key || '') === requestedSource);
  }

  function filterStreamsForPreferredLanguage(streams, requestedSource = '') {
    if (!normalizedPreferredLang) return streams;
    const languageStreams = streams.filter((stream) => {
      const language = streamLanguageCode(stream);
      return !language || language === normalizedPreferredLang;
    });
    if (!languageStreams.length) return streams;

    const requestedStream = streams.find((stream) => isRequestedSource(stream, requestedSource));
    if (!requestedStream || languageStreams.includes(requestedStream)) return languageStreams;

    return streams.filter((stream) => languageStreams.includes(stream) || stream === requestedStream);
  }

  function mergeStreams(streamGroups) {
    const seen = new Set();
    return streamGroups.flatMap((streams) => (Array.isArray(streams) ? streams : [])).filter((stream) => {
      const url = String(stream?.url || '').trim();
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }

  function destroyHls() {
    stopManagedPlaybackWatch();
    if (hls) {
      hls.destroy();
      hls = null;
    }
  }

  function destroyVideoJs() {
    if (videoJsPlayer && typeof videoJsPlayer.dispose === 'function') {
      videoJsPlayer.dispose();
    }
    videoJsPlayer = null;
  }

  function renderIframe(stream) {
    destroyHls();
    destroyVideoJs();
    if (stage.classList) {
      stage.classList.add('stage-iframe');
      stage.classList.remove('stage-videojs');
    }
    stage.innerHTML = '';
    const isDami = isDamiEmbedUrl(stream.url);
    const iframe = document.createElement('iframe');
    iframe.src = isDami && config.damiEmbedProxyEnabled === true ? damiEmbedProxyUrl(stream.url) : stream.url;
    iframe.title = stream.title || stream.label || t('streamPlayer');
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = stream.referrer_policy || stream.referrerPolicy || 'no-referrer-when-downgrade';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-presentation');
    stage.appendChild(iframe);
    const shield = document.createElement('div');
    shield.className = 'third-party-shield';
    shield.setAttribute('aria-hidden', 'true');
    stage.appendChild(shield);
    if (isDami) {
      stage.appendChild(createIframeClickShield(stream));
    } else {
      const adCover = document.createElement('div');
      adCover.className = 'iframe-ad-cover';
      adCover.setAttribute('aria-hidden', 'true');
      stage.appendChild(adCover);
    }
    attachTelegramPopupToStage();
  }

  function attachStreamPlayButton(video) {
    if (!video || typeof video.play !== 'function') return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'stream-play-button';
    button.setAttribute('aria-label', t('playStream'));
    if (typeof button.addEventListener !== 'function') return;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const playResult = video.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => {
          video.muted = true;
          const mutedPlayResult = video.play();
          if (mutedPlayResult && typeof mutedPlayResult.catch === 'function') mutedPlayResult.catch(() => {});
        });
      }
    });

    const syncButton = () => {
      button.hidden = !video.paused && !video.ended;
    };
    if (typeof video.addEventListener === 'function') {
      video.addEventListener('play', syncButton);
      video.addEventListener('playing', syncButton);
      video.addEventListener('pause', syncButton);
      video.addEventListener('ended', syncButton);
      video.addEventListener('error', syncButton);
    }
    syncButton();
    stage.appendChild(button);
  }

  function createIframeClickShield(stream) {
    const shield = document.createElement('div');
    shield.className = 'iframe-click-shield';
    shield.setAttribute('aria-hidden', 'true');
    let remainingClicks = iframeShieldClicks(stream);
    shield.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      remainingClicks -= 1;
      if (remainingClicks <= 0) shield.remove();
    });
    return shield;
  }

  function iframeShieldClicks(stream) {
    const streamValue = Number(stream.click_shield_clicks ?? stream.clickShieldClicks);
    if (Number.isFinite(streamValue) && streamValue > 0) return Math.min(5, Math.floor(streamValue));
    const configuredValue = Number(config.iframeClickShieldClicks);
    if (Number.isFinite(configuredValue) && configuredValue > 0) return Math.min(5, Math.floor(configuredValue));
    return 2;
  }

  function isDamiEmbedUrl(value) {
    try {
      const url = new URL(String(value || ''), window.location.href);
      return /(^|\.)dami-tv\.pro$/i.test(url.hostname) && url.pathname.startsWith('/embed');
    } catch {
      return false;
    }
  }

  function damiEmbedProxyUrl(value) {
    try {
      const url = new URL(String(value || ''), window.location.href);
      const channel = url.searchParams.get('ch') || url.searchParams.get('channel') || '';
      if (!/^\d+$/.test(channel)) return value;
      const proxyBase = apiBase || window.location.origin;
      const proxyUrl = new URL(`${proxyBase}/api/embed-proxy/dami`);
      proxyUrl.searchParams.set('ch', channel);
      return proxyUrl.toString();
    } catch {
      return value;
    }
  }

  function usesCredentialedHls(value) {
    return false;
  }

  function usesManagedHls(value) {
    try {
      const url = new URL(String(value || ''), window.location.href);
      return url.hostname === 'hls.livekinglive.win'
        || url.hostname === 'cdn-hls.livekinglive.win'
        || url.hostname === 'hls-test.melteam.org';
    } catch {
      return false;
    }
  }

  function isAppleTouchBrowser() {
    const nav = window.navigator || navigator || {};
    const userAgent = String(nav.userAgent || '');
    const platform = String(nav.platform || '');
    return /iP(hone|od|ad)/i.test(userAgent) || (platform === 'MacIntel' && Number(nav.maxTouchPoints || 0) > 1);
  }

  function withManagedHlsCookieCheck(value) {
    try {
      const url = new URL(String(value || ''), window.location.href);
      if (url.hostname === 'hls.livekinglive.win') url.searchParams.set('cookieCheck', '1');
      return url.toString();
    } catch {
      return value;
    }
  }

  function startNativeManagedHls(video, value, recoverPlayback) {
    const fallbackUrl = withManagedHlsCookieCheck(value);
    video.src = fallbackUrl;
    requestMutedPlayback(video);
    startManagedPlaybackWatch(video, recoverPlayback);
  }

  function configureVideoElement(video, streamUrl, options = {}) {
    if (!video) return;
    video.className = [video.className, 'stream-video-live-controls'].filter(Boolean).join(' ');
    if (typeof video.setAttribute === 'function') {
      video.setAttribute('data-live-controls', 'true');
      video.setAttribute('autoplay', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      if (shouldStartMuted(streamUrl)) video.setAttribute('muted', '');
    }
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.muted = shouldStartMuted(streamUrl);
    video.defaultMuted = video.muted;
    if (options.crossOrigin !== false) {
      video.crossOrigin = usesCredentialedHls(streamUrl) ? 'use-credentials' : 'anonymous';
    }
    video.poster = params.get('poster') || '';
  }

  function shouldStartMuted(value) {
    return /dami-tv\.pro/i.test(value || '') || usesManagedHls(value);
  }

  function stopManagedPlaybackWatch() {
    if (managedPlaybackTimer) {
      clearInterval(managedPlaybackTimer);
      managedPlaybackTimer = null;
    }
  }

  function requestMutedPlayback(video) {
    if (!video || typeof video.play !== 'function') return;
    video.muted = true;
    const result = video.play();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  }

  function decodedFrameCount(video) {
    try {
      if (typeof video.getVideoPlaybackQuality === 'function') {
        const count = Number(video.getVideoPlaybackQuality()?.totalVideoFrames);
        if (Number.isFinite(count)) return count;
      }
    } catch {}
    const webkitCount = Number(video.webkitDecodedFrameCount);
    if (Number.isFinite(webkitCount)) return webkitCount;
    const mozCount = Number(video.mozParsedFrames);
    if (Number.isFinite(mozCount)) return mozCount;
    return null;
  }

  function playbackSnapshot(video) {
    return {
      time: Number(video.currentTime || 0),
      frames: decodedFrameCount(video),
    };
  }

  function playbackAdvanced(previous, current) {
    if (!previous) return true;
    if (Number.isFinite(previous.frames) && Number.isFinite(current.frames) && current.frames > previous.frames) {
      return true;
    }
    return current.time > previous.time + 0.25;
  }

  function recoverManagedPlayback(recoverPlayback) {
    const now = Date.now();
    if (managedPlaybackReloadedAt && now - managedPlaybackReloadedAt < MANAGED_PLAYBACK_RELOAD_COOLDOWN_MS) {
      return false;
    }
    managedPlaybackReloadedAt = now;
    stopManagedPlaybackWatch();
    if (typeof recoverPlayback === 'function') recoverPlayback();
    return true;
  }

  function startManagedPlaybackWatch(video, recoverPlayback) {
    stopManagedPlaybackWatch();
    if (!video || typeof video.play !== 'function') return;
    let lastSnapshot = null;
    let stalledMs = 0;
    let nudged = false;
    const tick = () => {
      if (document.hidden) {
        lastSnapshot = playbackSnapshot(video);
        stalledMs = 0;
        nudged = false;
        return;
      }
      if (video.ended || video.seeking) {
        lastSnapshot = playbackSnapshot(video);
        stalledMs = 0;
        return;
      }
      if (video.paused) {
        requestMutedPlayback(video);
        lastSnapshot = playbackSnapshot(video);
        stalledMs = 0;
        return;
      }

      const currentSnapshot = playbackSnapshot(video);
      if (!playbackAdvanced(lastSnapshot, currentSnapshot) && Number(video.readyState || 0) >= 2) {
        stalledMs += MANAGED_PLAYBACK_CHECK_INTERVAL_MS;
        if (!nudged && stalledMs >= MANAGED_PLAYBACK_NUDGE_AFTER_MS && hls && Number.isFinite(hls.liveSyncPosition) && hls.liveSyncPosition > 0) {
          try {
            video.currentTime = Math.max(0, hls.liveSyncPosition - 1);
          } catch {}
          currentSnapshot.time = Number(video.currentTime || currentSnapshot.time);
          requestMutedPlayback(video);
          nudged = true;
        }
        if (stalledMs >= MANAGED_PLAYBACK_RELOAD_AFTER_MS && recoverManagedPlayback(recoverPlayback)) {
          return;
        }
      } else {
        stalledMs = 0;
        nudged = false;
      }
      lastSnapshot = currentSnapshot;
    };
    tick();
    managedPlaybackTimer = setInterval(tick, MANAGED_PLAYBACK_CHECK_INTERVAL_MS);
  }

  function renderHls(stream, options = {}) {
    destroyHls();
    destroyVideoJs();
    const isVideoJsLike = options.videojs === true || stream.source_type === 'videojs';
    if (stage.classList) {
      stage.classList.remove('stage-iframe');
      if (isVideoJsLike) stage.classList.add('stage-videojs');
      else stage.classList.remove('stage-videojs');
    }
    stage.innerHTML = '';
    const video = document.createElement('video');
    const nativeManagedHls = usesManagedHls(stream.url) && isAppleTouchBrowser();
    const playbackUrl = nativeManagedHls ? withManagedHlsCookieCheck(stream.url) : stream.url;
    const recoverManagedHls = () => renderHls(stream, options);
    configureVideoElement(video, stream.url, { crossOrigin: !nativeManagedHls });
    stage.appendChild(video);
    attachStreamPlayButton(video);
    attachTelegramPopupToStage();

    const preferHlsJs = /dami-tv\.pro/i.test(stream.url || '') || usesManagedHls(stream.url);
    if (nativeManagedHls) {
      startNativeManagedHls(video, stream.url, recoverManagedHls);
      return;
    }

    if (!preferHlsJs && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playbackUrl;
      video.play().catch(() => {});
      return;
    }

    if (window.Hls && window.Hls.isSupported()) {
      const managedHls = usesManagedHls(stream.url);
      hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: false,
        xhrSetup: usesCredentialedHls(stream.url)
          ? (xhr) => {
              xhr.withCredentials = true;
            }
          : undefined,
        liveSyncDurationCount: 4,
        liveMaxLatencyDurationCount: 7,
        backBufferLength: 30,
        maxBufferLength: 30,
      });
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
      if (managedHls) startManagedPlaybackWatch(video, recoverManagedHls);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        if (managedHls) requestMutedPlayback(video);
        else video.play().catch(() => {});
      });
      hls.on(window.Hls.Events.ERROR, (_, data) => {
        if (data.fatal) clearPlayer();
      });
      return;
    }

    video.src = playbackUrl;
  }

  function renderVideoJs(stream) {
    const appleManagedHls = usesManagedHls(stream.url) && isAppleTouchBrowser();
    if (usesManagedHls(stream.url) && (appleManagedHls || (window.Hls && window.Hls.isSupported()))) {
      renderHls(stream, { videojs: true });
      return;
    }

    destroyHls();
    destroyVideoJs();
    if (stage.classList) {
      stage.classList.remove('stage-iframe');
      stage.classList.add('stage-videojs');
    }
    stage.innerHTML = '';
    const video = document.createElement('video');
    video.className = 'video-js vjs-default-skin vjs-big-play-centered';
    const playbackUrl = appleManagedHls ? withManagedHlsCookieCheck(stream.url) : stream.url;
    configureVideoElement(video, stream.url, { crossOrigin: !appleManagedHls });
    stage.appendChild(video);
    attachStreamPlayButton(video);
    attachTelegramPopupToStage();

    if (window.videojs) {
      videoJsPlayer = window.videojs(video, {
        autoplay: true,
        controls: true,
        controlBar: {
          progressControl: false,
          currentTimeDisplay: false,
          timeDivider: false,
          durationDisplay: false,
          remainingTimeDisplay: false,
        },
        fluid: false,
        responsive: true,
        liveui: true,
        muted: video.muted,
        html5: usesCredentialedHls(stream.url)
          ? {
              vhs: {
                withCredentials: true,
              },
            }
          : undefined,
        sources: [{ src: playbackUrl, type: 'application/x-mpegURL' }],
      });
      if (videoJsPlayer && typeof videoJsPlayer.ready === 'function') {
        videoJsPlayer.ready(() => {
          const playResult = typeof videoJsPlayer.play === 'function' ? videoJsPlayer.play() : null;
          if (playResult && typeof playResult.catch === 'function') playResult.catch(() => {});
        });
      }
      return;
    }

    video.src = playbackUrl;
    video.play().catch(() => {});
  }

  function damiChannelId(stream) {
    const match = String(stream.url || '').match(/^dami-channel:\/?\/?(\d+)$/i);
    return match ? match[1] : '';
  }

  async function resolveDamiChannel(stream) {
    const channelId = damiChannelId(stream);
    if (!channelId) throw new Error('Missing DAMI channel id');
    const response = await fetch(`https://dami-tv.pro/papi/tv/resolve/${channelId}?t=`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`DAMI resolve returned ${response.status}`);
    const data = await response.json();
    const resolvedUrl = data.stream || data.url || '';
    if (!resolvedUrl) throw new Error('DAMI resolve returned no stream');
    return {
      ...stream,
      source_type: 'hls',
      url: resolvedUrl.startsWith('http') ? resolvedUrl : `https://dami-tv.pro${resolvedUrl}`,
    };
  }

  async function playStream(index) {
    const stream = currentStreams[index];
    if (!stream) return;
    titleEl.textContent = stream.title || stream.label || params.get('title') || t('stream');
    if (stream.source_type === 'iframe') {
      renderIframe(stream);
      return;
    }
    if (stream.source_type === 'dami-channel') {
      stage.innerHTML = `<div class="player-empty">${escapeHtml(t('loadingStream'))}</div>`;
      try {
        renderHls(await resolveDamiChannel(stream));
      } catch {
        clearPlayer();
      }
      return;
    }
    if (stream.source_type === 'videojs') {
      renderVideoJs(stream);
      return;
    }
    renderHls(stream);
  }

  function setStreams(streams, title) {
    const requestedSource = String(params.get('source') || '').trim();
    const activeStreams = streams.filter((stream) => stream.url && stream.is_active !== false);
    currentStreams = sortStreams(filterStreamsForPreferredLanguage(activeStreams, requestedSource));
    if (!currentStreams.length) {
      clearPlayer();
      return;
    }

    const requestedIndex = requestedSource
      ? currentStreams.findIndex((stream) => {
          return isRequestedSource(stream, requestedSource);
        })
      : -1;
    const initialIndex = requestedIndex >= 0 ? requestedIndex : 0;
    sourceSelect.innerHTML = currentStreams
      .map((stream, index) => `<option value="${index}">${streamLabel(stream, index)}</option>`)
      .join('');
    sourceSelect.value = String(initialIndex);
    sourceSelect.hidden = currentStreams.length < 2;
    titleEl.textContent = title || params.get('title') || t('stream');
    controls.hidden = false;
    playStream(initialIndex);
  }

  function loadDirectStream() {
    const directUrl = String(params.get('src') || '').trim();
    if (!directUrl) return false;
    const directType = String(params.get('type') || '').trim() || inferType(directUrl);
    setStreams(
      [
        {
          id: params.get('source') || 'direct',
          url: directUrl,
          source_type: directType,
          label: params.get('title') || t('englishIframe'),
          language_code: preferredLang,
          priority: 100,
          is_active: true,
        },
      ],
      params.get('title') || t('stream'),
    );
    return true;
  }

  function isAdElementHidden(element) {
    if (!element) return false;
    const style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(element) : null;
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return true;
    const height = Number(element.offsetHeight ?? element.clientHeight ?? 1);
    const width = Number(element.offsetWidth ?? element.clientWidth ?? 1);
    return height <= 0 || width <= 0 || element.hidden === true;
  }

  function showAdblockModal() {
    if (!document.body || document.querySelector?.('.adblock-modal')) return;
    const notice = document.createElement('div');
    notice.className = 'adblock-modal';
    notice.innerHTML = `
      <div class="adblock-modal-backdrop" data-adblock-close></div>
      <section class="adblock-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(t('adblockTitle'))}">
        <h2>${escapeHtml(t('adblockTitle'))}</h2>
        <p>${escapeHtml(t('adblockMessage'))}</p>
        <button class="button" type="button" data-adblock-close>${escapeHtml(t('continue'))}</button>
      </section>
    `;
    notice.addEventListener('click', (event) => {
      if (!event.target?.closest?.('[data-adblock-close]')) return;
      notice.hidden = true;
      if (typeof notice.remove === 'function') notice.remove();
    });
    document.body.appendChild(notice);
  }

  function detectAdblock() {
    if (!document.body || typeof document.createElement !== 'function') return;
    const probe = document.createElement('div');
    probe.className = 'adsbox ad-banner ad-unit pub_300x250 text-ad';
    probe.setAttribute?.('aria-hidden', 'true');
    probe.textContent = 'Advertisement';
    if (probe.style) {
      probe.style.cssText = 'position:absolute;left:-10000px;top:-10000px;width:1px;height:1px;pointer-events:none;';
    }
    document.body.appendChild(probe);

    const check = () => {
      const adSlots = Array.from(document.querySelectorAll?.('[data-ad-slot], .ad-shell') || []);
      const slotsBlocked = adSlots.length > 0 && adSlots.every((slot) => isAdElementHidden(slot));
      const blocked = isAdElementHidden(probe) || slotsBlocked;
      if (typeof probe.remove === 'function') probe.remove();
      if (blocked) showAdblockModal();
    };
    if (typeof setTimeout === 'function') setTimeout(check, 80);
    else check();
  }

  function viewerHeartbeatPayload() {
    return JSON.stringify({
      client_id: viewerClientId,
      page: 'player',
    });
  }

  function updateViewerCount(value) {
    if (!viewerCountEl) return;
    const count = Number(value);
    if (!Number.isFinite(count) || count <= 0) {
      viewerCountEl.hidden = true;
      viewerCountEl.textContent = '';
      viewerCountEl.removeAttribute?.('aria-label');
      return;
    }
    const normalized = Math.max(1, Math.round(count));
    const formatted = normalized.toLocaleString('en-US');
    viewerCountEl.textContent = formatted;
    viewerCountEl.setAttribute?.('aria-label', `${formatted} ${t('watching')}`);
    viewerCountEl.hidden = false;
  }

  async function sendViewerHeartbeat(matchId, options = {}) {
    if (!viewerHeartbeatBase || !matchId) return;
    try {
      const response = await fetch(`${viewerHeartbeatBase}/${encodeURIComponent(matchId)}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: viewerHeartbeatPayload(),
        keepalive: options.keepalive !== false,
      });
      if (!response.ok || typeof response.json !== 'function') return;
      const payload = await response.json().catch(() => null);
      updateViewerCount(payload?.viewers);
    } catch {}
  }

  function startViewerHeartbeat(matchId) {
    if (!viewerHeartbeatBase || !matchId) return;
    stopViewerHeartbeat();
    viewerMatchId = String(matchId);
    void sendViewerHeartbeat(viewerMatchId, { keepalive: true });
    viewerHeartbeatTimer = setInterval(() => {
      void sendViewerHeartbeat(viewerMatchId, { keepalive: true });
    }, 25_000);
  }

  function stopViewerHeartbeat() {
    if (viewerHeartbeatTimer) {
      clearInterval(viewerHeartbeatTimer);
      viewerHeartbeatTimer = null;
    }
    viewerMatchId = '';
    updateViewerCount(0);
  }

  function sendFinalViewerHeartbeat() {
    if (!viewerHeartbeatBase || !viewerMatchId) return;
    const url = `${viewerHeartbeatBase}/${encodeURIComponent(viewerMatchId)}/heartbeat`;
    if (navigator.sendBeacon) {
      try {
        const body = typeof Blob === 'function' ? new Blob([viewerHeartbeatPayload()], { type: 'application/json' }) : viewerHeartbeatPayload();
        if (navigator.sendBeacon(url, body)) return;
      } catch {}
    }
    void sendViewerHeartbeat(viewerMatchId, { keepalive: true });
  }

  async function loadFromMatch(matchId) {
    const query = new URLSearchParams();
    query.set('lang', preferredLang);
    query.set('region', preferredRegion);
    const configuredStreams = configuredStreamsForMatch(matchId);
    let match = null;

    try {
      const response = await fetch(`${apiBase}/api/matches/${matchId}?${query}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      match = await response.json();
    } catch (error) {
      if (!configuredStreams.length) throw error;
    }

    const home = match?.home_team?.name_en || t('tbd');
    const away = match?.away_team?.name_en || t('tbd');
    const streams = mergeStreams([configuredStreams, match?.streams || []]);
    setStreams(streams, `${home} vs ${away}`);
    if (currentStreams.length && !isPreviewMode) startViewerHeartbeat(matchId);
  }

  sourceSelect.addEventListener('change', () => playStream(Number(sourceSelect.value)));
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('beforeunload', () => {
      sendFinalViewerHeartbeat();
    });
    window.addEventListener('pagehide', sendFinalViewerHeartbeat);
  }

  if (isAdmin) {
    copyEmbed.addEventListener('click', async () => {
      const code = `<iframe src="${window.location.href}" width="960" height="540" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
      try {
        await navigator.clipboard.writeText(code);
        copyEmbed.textContent = t('copied');
        setTimeout(() => {
          copyEmbed.textContent = t('copyIframe');
        }, 1600);
      } catch {
        window.prompt(t('copyIframeCode'), code);
      }
    });
  }

  document.querySelectorAll('[data-ad-slot]').forEach((slot) => {
    const key = adSlotKeys[slot.dataset.adSlot];
    if (key && adSlots[key]) slot.innerHTML = adSlots[key];
  });
  localizePlayerChrome();
  setupSocialDock();
  if (!isPreviewMode) detectAdblock();

  (async function boot() {
    if (!isPreviewMode) renderTelegramPopup();
    try {
      if (allowDirectStreamParams && loadDirectStream()) return;
      matchStreams = await loadStreamConfig();
      const activeMatches = activeStreamMatchIds();
      const matchId = params.get('match') || params.get('id') || (activeMatches.length === 1 ? activeMatches[0] : '');
      if (matchId) {
        await loadFromMatch(matchId);
        return;
      }
      clearPlayer();
    } catch (error) {
      clearPlayer();
    }
  })();
})();
