(function () {
  const config = window.KINGLIVE_PLAYER_CONFIG || {};
  const apiBase = String(config.apiBase || '').replace(/\/$/, '');
  const params = new URLSearchParams(window.location.search);
  const streamConfigUrl = config.streamConfigUrl || './streams.json';
  const activeStreamsApiUrl = config.activeStreamsApiUrl || `${apiBase}/api/streams/active`;
  const chatApiBase = String(config.chatApiBase || (apiBase ? `${apiBase}/api/chat` : '')).replace(/\/$/, '');
  const chatPollMs = Math.max(3000, Number(config.chatPollMs) || 5000);
  const chatPromo = {
    intervalMs: Math.max(60000, Number(config.chatPromo?.intervalMs) || 5 * 60 * 1000),
    messages: Array.isArray(config.chatPromo?.messages)
      ? config.chatPromo.messages.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
  };
  const stage = document.getElementById('stage');
  const controls = document.getElementById('controls');
  const titleEl = document.getElementById('title');
  const sourceSelect = document.getElementById('source-select');
  const copyEmbed = document.getElementById('copy-embed');
  const tgPopup = document.getElementById('tg-popup');
  const chatPanel = document.getElementById('chat-panel');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatAuthor = document.getElementById('chat-author');
  const chatMessage = document.getElementById('chat-message');
  const chatStatus = document.getElementById('chat-status');
  const chatPinned = document.getElementById('chat-pinned');
  const adSlots = config.adSlots || {};
  const tgPopupConfig = config.tgPopup || {};
  const chatPinnedConfig = config.chatPinned || {};
  let matchStreams = config.matchStreams || {};
  let tgPopupDismissed = false;
  let chatMatchId = '';
  let chatLastSeen = 0;
  let chatTimer = null;
  let chatPromoTimer = null;
  let chatPromoIndex = 0;
  let chatMessagesState = [];
  const adSlotKeys = {
    'player-top': 'playerTop',
    'player-bottom': 'playerBottom',
    'player-rail': 'playerRail',
  };
  const i18n = {
    en: {
      nowPlaying: 'Now playing',
      source: 'Source',
      copyIframe: 'Copy iframe',
      copied: 'Copied',
      copyPrompt: 'Copy iframe code',
      stream: 'Stream',
      configuredStream: 'Configured stream',
      connecting: 'Connecting',
      live: 'Live',
      offline: 'Offline',
      sending: 'Sending',
      error: 'Error',
      wait: 'Wait',
      chatUnavailable: 'Chat is unavailable right now.',
      noMessages: 'No messages yet. Start the match chat.',
      guest: 'Guest',
      close: 'Close',
      community: 'Community',
      tgTitle: 'Telegram',
      tgMessage: 'Join our Telegram updates.',
      tgButton: 'Open Telegram',
      chatRoom: 'Live room',
      chatTitle: 'Match chat',
      nick: 'Nick',
      message: 'Message',
      writeMessage: 'Write a message',
      send: 'Send',
    },
    mn: {
      nowPlaying: 'Одоо тоглуулж байна',
      source: 'Эх сурвалж',
      copyIframe: 'iframe хуулах',
      copied: 'Хуулагдлаа',
      copyPrompt: 'iframe код хуулах',
      stream: 'Шууд дамжуулалт',
      configuredStream: 'Тохируулсан дамжуулалт',
      connecting: 'Холбогдож байна',
      live: 'Шууд',
      offline: 'Офлайн',
      sending: 'Илгээж байна',
      error: 'Алдаа',
      wait: 'Хүлээнэ үү',
      chatUnavailable: 'Чат одоогоор боломжгүй байна.',
      noMessages: 'Одоогоор зурвас алга. Тоглолтын чатыг эхлүүлээрэй.',
      guest: 'Зочин',
      close: 'Хаах',
      community: 'Нийгэмлэг',
      tgTitle: 'Telegram',
      tgMessage: 'Telegram шинэчлэлтэд нэгдээрэй.',
      tgButton: 'Telegram нээх',
      chatRoom: 'Шууд өрөө',
      chatTitle: 'Тоглолтын чат',
      nick: 'Нэр',
      message: 'Зурвас',
      writeMessage: 'Зурвас бичих',
      send: 'Илгээх',
    },
  };
  let currentStreams = [];
  let hls;

  const preferredLang = params.get('lang') || config.defaultLang || 'en';
  const uiLang = i18n[preferredLang] ? preferredLang : 'en';
  const preferredRegion = params.get('region') || config.defaultRegion || 'global';
  const isAdmin = params.get('admin') === '1';
  const chatClientId = getChatClientId();

  copyEmbed.hidden = !isAdmin;

  function t(key) {
    return i18n[uiLang]?.[key] ?? i18n.en[key] ?? key;
  }

  function localizeStaticControls() {
    if (document.documentElement) {
      document.documentElement.lang = uiLang;
      document.documentElement.dir = 'ltr';
    }
    const setText = (id, value) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    };
    setText('now-playing-label', t('nowPlaying'));
    setText('source-label', t('source'));
    setText('chat-room-label', t('chatRoom'));
    setText('chat-title', t('chatTitle'));
    setText('chat-author-label', t('nick'));
    setText('chat-message-label', t('message'));
    setText('chat-submit', t('send'));
    if (copyEmbed) copyEmbed.textContent = t('copyIframe');
    if (titleEl && titleEl.textContent === 'Stream') titleEl.textContent = t('stream');
    if (chatAuthor) chatAuthor.placeholder = t('guest');
    if (chatMessage) chatMessage.placeholder = t('writeMessage');
    if (chatPanel) chatPanel.setAttribute('aria-label', t('chatTitle'));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getChatClientId() {
    try {
      const existing = window.localStorage?.getItem('kinglive_chat_client_id');
      if (existing) return existing;
      const next = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      window.localStorage?.setItem('kinglive_chat_client_id', next);
      return next;
    } catch {
      return `${Date.now()}`;
    }
  }

  function setupChat(matchId) {
    if (!chatPanel || !chatMessages || !chatForm || !chatApiBase || !matchId) {
      if (chatPanel) chatPanel.hidden = true;
      return;
    }
    chatMatchId = String(matchId);
    chatLastSeen = 0;
    chatMessagesState = [];
    chatPanel.hidden = false;
    if (chatAuthor && !chatAuthor.value) {
      try {
        chatAuthor.value = window.localStorage?.getItem('kinglive_chat_author') || '';
      } catch {}
    }
    renderChatMessages();
    renderChatPinned();
    setChatStatus(t('connecting'));
    void loadChatMessages();
    stopChatPolling();
    chatTimer = setInterval(() => {
      void loadChatMessages();
    }, chatPollMs);
    startChatPromo();
  }

  function stopChatPolling() {
    if (!chatTimer) return;
    clearInterval(chatTimer);
    chatTimer = null;
  }

  function startChatPromo() {
    stopChatPromo();
    if (!chatPromo.messages.length) return;
    addChatPromoMessage();
    chatPromoTimer = setInterval(addChatPromoMessage, chatPromo.intervalMs);
  }

  function stopChatPromo() {
    if (!chatPromoTimer) return;
    clearInterval(chatPromoTimer);
    chatPromoTimer = null;
  }

  function renderChatPinned() {
    if (!chatPinned) return;
    const enabled = chatPinnedConfig.enabled !== false;
    const title = String(chatPinnedConfig.title || '').trim();
    const message = String(chatPinnedConfig.message || '').trim();
    const ctaLabel = String(chatPinnedConfig.ctaLabel || '').trim();
    const url = String(chatPinnedConfig.url || '').trim();
    if (!enabled || (!title && !message)) {
      chatPinned.hidden = true;
      chatPinned.innerHTML = '';
      return;
    }

    chatPinned.hidden = false;
    chatPinned.innerHTML = `
      <div class="chat-pinned-copy">
        ${title ? `<strong>${escapeHtml(title)}</strong>` : ''}
        ${message ? `<span>${escapeHtml(message)}</span>` : ''}
      </div>
      ${url && ctaLabel ? `<a href="${escapeHtml(url)}" target="_blank" rel="nofollow sponsored noopener">${escapeHtml(ctaLabel)}</a>` : ''}
    `;
  }

  function addChatPromoMessage() {
    if (!chatMatchId || !chatPromo.messages.length) return;
    const message = chatPromo.messages[chatPromoIndex % chatPromo.messages.length];
    chatPromoIndex += 1;
    const now = Date.now();
    mergeChatMessages([
      {
        id: `promo-${chatMatchId}-${now}`,
        author: 'ADMIN',
        message,
        created_at: new Date(now).toISOString(),
        created_at_ms: now,
        is_promo: true,
      },
    ]);
  }

  async function loadChatMessages() {
    if (!chatMatchId || !chatApiBase) return;
    try {
      const url = new URL(`${chatApiBase}/${encodeURIComponent(chatMatchId)}`);
      if (chatLastSeen > 0) url.searchParams.set('since', String(chatLastSeen));
      const response = await fetch(url.toString(), { cache: 'no-store' });
      if (!response.ok) throw new Error(`Chat returned ${response.status}`);
      const payload = await response.json();
      const incoming = Array.isArray(payload.messages) ? payload.messages : [];
      mergeChatMessages(incoming);
      setChatStatus(t('live'));
    } catch {
      setChatStatus(t('offline'));
      if (!chatMessagesState.length) renderChatError(t('chatUnavailable'));
    }
  }

  function mergeChatMessages(messages) {
    if (!messages.length) {
      renderChatMessages();
      return;
    }
    const byId = new Map(chatMessagesState.map((message) => [message.id, message]));
    messages.forEach((message) => {
      if (!message?.id) return;
      byId.set(String(message.id), message);
      chatLastSeen = Math.max(chatLastSeen, Number(message.created_at_ms) || Date.parse(message.created_at || '') || 0);
    });
    chatMessagesState = Array.from(byId.values())
      .sort((a, b) => (Number(a.created_at_ms) || 0) - (Number(b.created_at_ms) || 0))
      .slice(-100);
    renderChatMessages();
  }

  function renderChatMessages() {
    if (!chatMessages) return;
    if (!chatMessagesState.length) {
      chatMessages.innerHTML = `<p class="chat-empty">${escapeHtml(t('noMessages'))}</p>`;
      return;
    }
    chatMessages.innerHTML = chatMessagesState
      .map((message) => {
        const time = formatChatTime(message.created_at);
        return `
          <article class="chat-message">
            <div class="chat-message-head">
              <span class="chat-author">${escapeHtml(message.author || t('guest'))}</span>
              <time>${escapeHtml(time)}</time>
            </div>
            <div class="chat-text">${escapeHtml(message.message || '')}</div>
          </article>
        `;
      })
      .join('');
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function renderChatError(message) {
    if (chatMessages) chatMessages.innerHTML = `<p class="chat-error">${escapeHtml(message)}</p>`;
  }

  function setChatStatus(value) {
    if (chatStatus) chatStatus.textContent = value;
  }

  function formatChatTime(value) {
    const date = new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  async function submitChatMessage(event) {
    event.preventDefault();
    if (!chatMatchId || !chatApiBase || !chatMessage) return;
    const message = chatMessage.value.trim();
    if (!message) return;
    const author = (chatAuthor?.value || '').trim() || t('guest');
    try {
      if (chatAuthor) window.localStorage?.setItem('kinglive_chat_author', author);
    } catch {}

    const submit = chatForm?.querySelector?.('[type="submit"]');
    if (submit) submit.disabled = true;
    setChatStatus(t('sending'));
    try {
      const response = await fetch(`${chatApiBase}/${encodeURIComponent(chatMatchId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author,
          message,
          client_id: chatClientId,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 429) setChatStatus(`${t('wait')} ${payload.retry_after || 5}s`);
        else setChatStatus(t('error'));
        return;
      }
      chatMessage.value = '';
      mergeChatMessages(payload.message ? [payload.message] : []);
      setChatStatus(t('live'));
    } catch {
      setChatStatus(t('offline'));
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  function clearPlayer() {
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
    const urls = Array.isArray(tgPopupConfig.urls)
      ? tgPopupConfig.urls.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    const url = nextTelegramPopupUrl(urls, String(tgPopupConfig.url || '').trim());
    if (!enabled || !url) {
      tgPopup.hidden = true;
      tgPopup.innerHTML = '';
      return;
    }

    const title = tgPopupConfig.title || t('tgTitle');
    const message = tgPopupConfig.message || t('tgMessage');
    const buttonLabel = tgPopupConfig.buttonLabel || t('tgButton');
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

  function inferType(src, explicitType) {
    if (explicitType === 'hls' || explicitType === 'iframe') return explicitType;
    if (/\.m3u8(\?|$)/i.test(src)) return 'hls';
    return 'iframe';
  }

  function streamLabel(stream, index) {
    return stream.label || `${stream.language_code || t('stream')} ${stream.quality || index + 1}`;
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
      const aLang = a.language_code === preferredLang ? 0 : 1;
      const bLang = b.language_code === preferredLang ? 0 : 1;
      if (aLang !== bLang) return aLang - bLang;
      const aRegion = a.region === preferredRegion || a.region === 'global' ? 0 : 1;
      const bRegion = b.region === preferredRegion || b.region === 'global' ? 0 : 1;
      if (aRegion !== bRegion) return aRegion - bRegion;
      return (b.priority || 0) - (a.priority || 0);
    });
  }

  function destroyHls() {
    if (hls) {
      hls.destroy();
      hls = null;
    }
  }

  function renderIframe(stream) {
    destroyHls();
    if (stage.classList) stage.classList.add('stage-iframe');
    stage.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = stream.url;
    iframe.title = stream.title || stream.label || t('stream');
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = stream.referrer_policy || stream.referrerPolicy || 'strict-origin';
    iframe.sandbox = 'allow-forms allow-presentation allow-same-origin allow-scripts';
    stage.appendChild(iframe);
    const shield = document.createElement('div');
    shield.className = 'third-party-shield';
    shield.setAttribute('aria-hidden', 'true');
    stage.appendChild(shield);
    const adCover = document.createElement('div');
    adCover.className = 'iframe-ad-cover';
    adCover.setAttribute('aria-hidden', 'true');
    stage.appendChild(adCover);
    attachTelegramPopupToStage();
  }

  function renderHls(stream) {
    destroyHls();
    if (stage.classList) stage.classList.remove('stage-iframe');
    stage.innerHTML = '';
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.poster = params.get('poster') || '';
    stage.appendChild(video);
    attachTelegramPopupToStage();

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = stream.url;
      video.play().catch(() => {});
      return;
    }

    if (window.Hls && window.Hls.isSupported()) {
      hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 1,
        liveMaxLatencyDurationCount: 2,
        backBufferLength: 20,
        maxBufferLength: 8,
      });
      hls.loadSource(stream.url);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      hls.on(window.Hls.Events.ERROR, (_, data) => {
        if (data.fatal) clearPlayer();
      });
      return;
    }

    video.src = stream.url;
  }

  function playStream(index) {
    const stream = currentStreams[index];
    if (!stream) return;
    titleEl.textContent = stream.title || stream.label || params.get('title') || t('stream');
    if (stream.source_type === 'iframe') renderIframe(stream);
    else renderHls(stream);
  }

  function setStreams(streams, title) {
    currentStreams = sortStreams(streams.filter((stream) => stream.url && stream.is_active !== false));
    if (!currentStreams.length) {
      clearPlayer();
      return;
    }

    sourceSelect.innerHTML = currentStreams
      .map((stream, index) => `<option value="${index}">${streamLabel(stream, index)}</option>`)
      .join('');
    sourceSelect.hidden = currentStreams.length < 2;
    titleEl.textContent = title || params.get('title') || t('stream');
    controls.hidden = false;
    playStream(0);
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

    const home = match?.home_team?.name_en || 'TBD';
    const away = match?.away_team?.name_en || 'TBD';
    const streams = configuredStreams.length ? configuredStreams : match?.streams || [];
    setStreams(streams, `${home} vs ${away}`);
  }

  sourceSelect.addEventListener('change', () => playStream(Number(sourceSelect.value)));
  if (chatForm) chatForm.addEventListener('submit', submitChatMessage);
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('beforeunload', stopChatPolling);
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
        window.prompt(t('copyPrompt'), code);
      }
    });
  }

  document.querySelectorAll('[data-ad-slot]').forEach((slot) => {
    const key = adSlotKeys[slot.dataset.adSlot];
    if (key && adSlots[key]) slot.innerHTML = adSlots[key];
  });

  (async function boot() {
    localizeStaticControls();
    renderTelegramPopup();
    try {
      matchStreams = await loadStreamConfig();
      const activeMatches = activeStreamMatchIds();
      const matchId = params.get('match') || params.get('id') || (activeMatches.length === 1 ? activeMatches[0] : '');
      if (matchId) {
        setupChat(matchId);
        await loadFromMatch(matchId);
        return;
      }
      stopChatPolling();
      if (chatPanel) chatPanel.hidden = true;
      clearPlayer();
    } catch (error) {
      stopChatPolling();
      clearPlayer();
    }
  })();
})();
