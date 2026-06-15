(function () {
  const config = window.KINGLIVE_MAIN_CONFIG || {};
  const apiBase = String(config.adminApiBase || config.apiBase || '').replace(/\/$/, '');
  const playerBase = String(config.playerBase || 'https://livekinglive.win').replace(/\/$/, '');
  const tokenKey = 'kinglive_admin_token';

  const $ = (id) => document.getElementById(id);
  const authStatus = $('auth-status');
  const saveMsg = $('save-msg');
  const saveErr = $('save-err');
  const streamsBody = $('streams-body');
  const monitoringMetrics = $('monitoring-metrics');
  const monitoringBody = $('monitoring-body');
  const monitoringMeta = $('monitoring-meta');
  const refreshResult = $('refresh-result');
  const statusBody = $('status-body');
  const settingsStatus = $('settings-status');
  const chatBody = $('chat-body');
  const chatAdminStatus = $('chat-admin-status');
  const overlayBody = $('overlay-body');
  const overlayStatus = $('overlay-status');
  const fallbackOverlays = [
    { id: 'kinglive_player_leaderboard.png', name: 'KingLive player', builtin: true },
    { id: 'kinglive_banner_1554x192_fixed.png', name: 'KingLive wide', builtin: true },
    { id: 'kinglive_top_banner_1554x192.png', name: 'KingLive top', builtin: true },
    { id: 'melbet_top_banner_1554x192.png', name: 'Melbet top', builtin: true },
    { id: 'melbet_banner_1870x245_safe_player.png', name: 'Melbet safe player', builtin: true },
  ];
  const overlayPreviewBase = { width: 1280, height: 720 };
  const overlayPresetPercent = {
    'top-left': [0, 0],
    'top-center': [50, 0],
    'top-right': [100, 0],
    center: [50, 50],
    'bottom-left': [0, 100],
    'bottom-center': [50, 100],
    'bottom-right': [100, 100],
  };
  let overlayPreviewHls = null;
  let overlayPreviewUrl = '';
  let overlayPreviewType = '';
  let overlayPreviewKey = '';
  let overlayPreviewTimer = 0;
  let overlayPreviewCaptureTimer = 0;

  function token() {
    try {
      return window.localStorage.getItem(tokenKey) || '';
    } catch {
      return '';
    }
  }

  function setToken(value) {
    try {
      if (value) window.localStorage.setItem(tokenKey, value);
      else window.localStorage.removeItem(tokenKey);
    } catch {}
  }

  function setAuthLabel() {
    authStatus.textContent = token() ? 'Authenticated' : 'Not authenticated';
  }

  function numberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function selectedOverlayLabel() {
    const select = $('overlay-image');
    const option = select?.options?.[select.selectedIndex];
    return option?.textContent?.trim() || select?.value || 'Banner';
  }

  function presetOverlayPercent() {
    const preset = overlayPresetPercent[$('overlay-position')?.value] || overlayPresetPercent['top-right'];
    const width = clamp(Number($('overlay-width')?.value || 420), 80, 1000);
    const margin = clamp(Number($('overlay-margin')?.value || 24), 0, 200);
    const bannerHeight = width * 0.124;
    const maxX = Math.max(1, overlayPreviewBase.width - width);
    const maxY = Math.max(1, overlayPreviewBase.height - bannerHeight);
    let x = (maxX * preset[0]) / 100;
    let y = (maxY * preset[1]) / 100;
    const position = $('overlay-position')?.value || 'top-right';
    if (position.includes('left')) x = margin;
    if (position.includes('right')) x = maxX - margin;
    if (position.startsWith('top')) y = margin;
    if (position.startsWith('bottom')) y = maxY - margin;
    return [clamp(Math.round((x / maxX) * 100), 0, 100), clamp(Math.round((y / maxY) * 100), 0, 100)];
  }

  function currentOverlayPercent() {
    const x = numberOrNull($('overlay-x-percent')?.value);
    const y = numberOrNull($('overlay-y-percent')?.value);
    if (x !== null && y !== null) return [clamp(Math.round(x), 0, 100), clamp(Math.round(y), 0, 100), true];
    return [...presetOverlayPercent(), false];
  }

  function setManualOverlayPercent(x, y) {
    if ($('overlay-x-percent')) $('overlay-x-percent').value = String(clamp(Math.round(x), 0, 100));
    if ($('overlay-y-percent')) $('overlay-y-percent').value = String(clamp(Math.round(y), 0, 100));
    updateOverlayPreview();
  }

  function clearManualOverlayPercent() {
    if ($('overlay-x-percent')) $('overlay-x-percent').value = '';
    if ($('overlay-y-percent')) $('overlay-y-percent').value = '';
    updateOverlayPreview();
  }

  function setOverlayPreviewMessage(message) {
    const empty = $('overlay-preview-empty');
    if (!empty) return;
    empty.textContent = message;
    empty.hidden = false;
  }

  function hideOverlayPreviewMessage() {
    const empty = $('overlay-preview-empty');
    if (empty) empty.hidden = true;
  }

  function destroyOverlayPreviewHls() {
    if (overlayPreviewHls) {
      overlayPreviewHls.destroy();
      overlayPreviewHls = null;
    }
  }

  function stopOverlayFrameCapture() {
    window.clearInterval(overlayPreviewCaptureTimer);
    overlayPreviewCaptureTimer = 0;
  }

  function captureOverlayPreviewFrame() {
    const video = $('overlay-preview-video');
    const canvas = $('overlay-preview-canvas');
    if (!video || !canvas || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return false;
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.hidden = false;
      hideOverlayPreviewMessage();
      return true;
    } catch {
      setOverlayPreviewMessage('Cannot capture this stream frame');
      return false;
    }
  }

  function startOverlayFrameCapture() {
    stopOverlayFrameCapture();
    captureOverlayPreviewFrame();
    overlayPreviewCaptureTimer = window.setInterval(captureOverlayPreviewFrame, 1500);
  }

  function clearOverlayStreamPreview(message = 'Stream preview loads from URL') {
    destroyOverlayPreviewHls();
    stopOverlayFrameCapture();
    overlayPreviewUrl = '';
    overlayPreviewType = '';
    overlayPreviewKey = '';
    const surface = $('overlay-preview-surface');
    const video = $('overlay-preview-video');
    const canvas = $('overlay-preview-canvas');
    const frame = $('overlay-preview-frame');
    if (surface) {
      surface.classList.remove('is-iframe-preview');
      surface.style.removeProperty('--overlay-iframe-scale');
    }
    if (video) {
      video.pause();
      video.onloadeddata = null;
      video.oncanplay = null;
      video.onplaying = null;
      video.removeAttribute('src');
      video.load();
    }
    if (canvas) {
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width || 1, canvas.height || 1);
      canvas.hidden = true;
    }
    if (frame) {
      frame.removeAttribute('src');
      frame.hidden = true;
    }
    setOverlayPreviewMessage(message);
  }

  function isHttpsUrl(value) {
    try {
      return new URL(String(value || '')).protocol === 'https:';
    } catch {
      return false;
    }
  }

  function isHlsPreviewUrl(value) {
    try {
      const url = new URL(String(value || ''));
      return /\.m3u8($|\?)/i.test(`${url.pathname}${url.search}`);
    } catch {
      return false;
    }
  }

  function previewHlsUrl(value) {
    try {
      const url = new URL(String(value || ''));
      if (/\.m3u8$/i.test(url.pathname) && !url.searchParams.has('cookieCheck')) {
        url.searchParams.set('cookieCheck', '1');
      }
      return url.toString();
    } catch {
      return String(value || '');
    }
  }

  function playerPreviewUrl() {
    const matchId = String($('match-id')?.value || '').trim();
    if (!matchId) return '';
    const url = new URL(`${playerBase}/`, window.location.href);
    const streamId = String($('stream-id')?.value || '').trim();
    const label = String($('stream-label')?.value || '').trim();
    const lang = String($('lang')?.value || 'en').trim() || 'en';
    url.searchParams.set('match', matchId);
    url.searchParams.set('lang', lang);
    url.searchParams.set('preview', '1');
    url.searchParams.set('v', 'admin-overlay-preview-20260615');
    if (streamId) url.searchParams.set('source', streamId);
    else if (label) url.searchParams.set('source', label);
    if (label) url.searchParams.set('title', label);
    return url.toString();
  }

  function showPlayerFramePreview() {
    const frame = $('overlay-preview-frame');
    const url = playerPreviewUrl();
    if (!frame || !url) return false;
    if (frame.getAttribute('src') !== url) frame.src = url;
    frame.title = 'Player stream preview';
    frame.hidden = false;
    hideOverlayPreviewMessage();
    return true;
  }

  function scheduleOverlayStreamPreview() {
    window.clearTimeout(overlayPreviewTimer);
    overlayPreviewTimer = window.setTimeout(loadOverlayStreamPreview, 450);
  }

  function loadOverlayStreamPreview() {
    const rawUrl = $('stream-url')?.value.trim() || '';
    const sourceType = $('source-type')?.value || '';
    const video = $('overlay-preview-video');
    const frame = $('overlay-preview-frame');
    if (!video || !frame) return;
    if (!rawUrl) {
      clearOverlayStreamPreview('Stream preview loads from URL');
      return;
    }
    if (!isHttpsUrl(rawUrl)) {
      clearOverlayStreamPreview('Preview needs an https stream URL');
      return;
    }
    const previewKey = [
      rawUrl,
      sourceType,
      $('match-id')?.value || '',
      $('stream-id')?.value || '',
      $('stream-label')?.value || '',
      $('lang')?.value || '',
    ].join('|');
    if (previewKey === overlayPreviewKey) return;

    destroyOverlayPreviewHls();
    stopOverlayFrameCapture();
    overlayPreviewUrl = rawUrl;
    overlayPreviewType = sourceType;
    overlayPreviewKey = previewKey;
    video.pause();
    video.onloadeddata = null;
    video.oncanplay = null;
    video.onplaying = null;
    video.crossOrigin = 'anonymous';
    video.removeAttribute('src');
    const canvas = $('overlay-preview-canvas');
    if (canvas) canvas.hidden = true;
    const surface = $('overlay-preview-surface');
    if (surface) {
      surface.classList.remove('is-iframe-preview');
      surface.style.removeProperty('--overlay-iframe-scale');
    }
    frame.hidden = true;
    frame.removeAttribute('src');
    setOverlayPreviewMessage('Loading stream frame...');

    if (sourceType === 'iframe' && !isHlsPreviewUrl(rawUrl)) {
      if (surface) surface.classList.add('is-iframe-preview');
      updateOverlayPreview();
      frame.src = rawUrl;
      frame.title = 'Iframe stream preview';
      frame.hidden = false;
      hideOverlayPreviewMessage();
      return;
    }

    if (!isHlsPreviewUrl(rawUrl)) {
      clearOverlayStreamPreview('Preview supports HLS .m3u8 or iframe URLs');
      return;
    }

    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = startOverlayFrameCapture;
    video.oncanplay = startOverlayFrameCapture;
    video.onplaying = startOverlayFrameCapture;
    const hlsUrl = previewHlsUrl(rawUrl);
    const hasPlayerFallback = showPlayerFramePreview();
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.play().catch(() => {});
      return;
    }
    if (window.Hls?.isSupported?.()) {
      overlayPreviewHls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
      overlayPreviewHls.on(window.Hls.Events.ERROR, (event, data) => {
        if (data?.fatal && !hasPlayerFallback) clearOverlayStreamPreview('Stream preview failed to load');
      });
      overlayPreviewHls.loadSource(hlsUrl);
      overlayPreviewHls.attachMedia(video);
      overlayPreviewHls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      return;
    }
    if (!hasPlayerFallback) clearOverlayStreamPreview('This browser cannot preview HLS here');
  }

  function updateOverlayPreview() {
    const preview = $('overlay-preview-surface');
    const banner = $('overlay-preview-banner');
    if (!preview || !banner) return;
    const previewRect = preview.getBoundingClientRect();
    const previewWidth = previewRect.width || preview.clientWidth || 0;
    const previewHeight = previewRect.height || preview.clientHeight || 0;
    if (!previewWidth || !previewHeight) return;
    if (preview.classList.contains('is-iframe-preview')) {
      preview.style.setProperty('--overlay-iframe-scale', String(previewWidth / 640));
    }

    const enabled = $('overlay-enabled')?.value === 'true';
    const overlayWidth = clamp(Number($('overlay-width')?.value || 420), 80, 1000);
    const bannerWidth = clamp((overlayWidth / overlayPreviewBase.width) * previewWidth, 72, previewWidth);
    const bannerHeight = clamp(bannerWidth * 0.124, 26, previewHeight);
    const [xPercent, yPercent, manual] = currentOverlayPercent();
    const maxX = Math.max(0, previewWidth - bannerWidth);
    const maxY = Math.max(0, previewHeight - bannerHeight);
    const left = (maxX * xPercent) / 100;
    const top = (maxY * yPercent) / 100;

    banner.style.width = `${bannerWidth}px`;
    banner.style.height = `${bannerHeight}px`;
    banner.style.transform = `translate(${left}px, ${top}px)`;
    banner.style.opacity = enabled ? '1' : '0.45';
    banner.textContent = selectedOverlayLabel();

    const meta = $('overlay-preview-meta');
    if (meta) {
      meta.textContent = manual
        ? `manual: x ${xPercent}% / y ${yPercent}%`
        : `preset: ${$('overlay-position')?.value || 'top-right'}`;
    }
  }

  function setupOverlayPreviewDrag() {
    const preview = $('overlay-preview-surface');
    const banner = $('overlay-preview-banner');
    if (!preview || !banner) return;
    let drag = null;

    function startDrag(event, jumpToPointer = false) {
      event.preventDefault();
      const bannerRect = banner.getBoundingClientRect();
      drag = {
        pointerId: event.pointerId,
        offsetX: jumpToPointer ? bannerRect.width / 2 : event.clientX - bannerRect.left,
        offsetY: jumpToPointer ? bannerRect.height / 2 : event.clientY - bannerRect.top,
      };
      banner.classList.add('dragging');
      preview.setPointerCapture(event.pointerId);
      const move = (moveEvent) => {
        if (!drag || moveEvent.pointerId !== drag.pointerId) return;
        const currentPreviewRect = preview.getBoundingClientRect();
        const currentBannerRect = banner.getBoundingClientRect();
        const maxX = Math.max(1, currentPreviewRect.width - currentBannerRect.width);
        const maxY = Math.max(1, currentPreviewRect.height - currentBannerRect.height);
        const left = clamp(moveEvent.clientX - currentPreviewRect.left - drag.offsetX, 0, maxX);
        const top = clamp(moveEvent.clientY - currentPreviewRect.top - drag.offsetY, 0, maxY);
        setManualOverlayPercent((left / maxX) * 100, (top / maxY) * 100);
      };
      const end = (endEvent) => {
        if (!drag || endEvent.pointerId !== drag.pointerId) return;
        drag = null;
        banner.classList.remove('dragging');
        preview.releasePointerCapture(endEvent.pointerId);
        preview.removeEventListener('pointermove', move);
        preview.removeEventListener('pointerup', end);
        preview.removeEventListener('pointercancel', end);
      };
      preview.addEventListener('pointermove', move);
      preview.addEventListener('pointerup', end);
      preview.addEventListener('pointercancel', end);
      move(event);
    }

    banner.addEventListener('pointerdown', (event) => {
      startDrag(event, false);
    });
    preview.addEventListener('pointerdown', (event) => {
      if (event.target === banner) return;
      startDrag(event, true);
    });
  }

  async function adminFetch(path, init = {}) {
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || payload.error || `Request failed (${response.status})`);
    return payload;
  }

  async function login() {
    saveMsg.textContent = '';
    saveErr.textContent = '';
    try {
      const payload = await adminFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: $('login-username').value.trim(),
          password: $('login-password').value,
        }),
      });
      setToken(payload.token || '');
      setAuthLabel();
      await loadSettings();
      await loadOverlays();
      await loadMonitoring();
      await loadStreams();
      await loadStatuses();
    } catch (error) {
      saveErr.textContent = String(error.message || error);
    }
  }

  function logout() {
    setToken('');
    setAuthLabel();
    streamsBody.innerHTML = '<tr><td colspan="12">Logged out</td></tr>';
    if (monitoringBody) monitoringBody.innerHTML = '<tr><td colspan="3">Logged out</td></tr>';
    if (statusBody) statusBody.innerHTML = '<tr><td colspan="7">Logged out</td></tr>';
    if (chatBody) chatBody.innerHTML = '<tr><td colspan="4">Logged out</td></tr>';
    if (overlayBody) overlayBody.innerHTML = '<tr><td colspan="4">Logged out</td></tr>';
    if (overlayStatus) overlayStatus.textContent = '';
    updateOverlaySelect(fallbackOverlays);
    if ($('hide-finished-matches')) $('hide-finished-matches').checked = false;
    if (settingsStatus) settingsStatus.textContent = '';
    if (chatAdminStatus) chatAdminStatus.textContent = '';
  }

  function streamFromForm() {
    const overlayEnabled = $('overlay-enabled').value === 'true';
    const overlay = {
      enabled: overlayEnabled,
      image: $('overlay-image').value,
      position: $('overlay-position').value,
      width: Number($('overlay-width').value || 420),
      margin: Number($('overlay-margin').value || 24),
    };
    const xPercent = numberOrNull($('overlay-x-percent')?.value);
    const yPercent = numberOrNull($('overlay-y-percent')?.value);
    if (xPercent !== null && yPercent !== null) {
      overlay.x_percent = clamp(Math.round(xPercent), 0, 100);
      overlay.y_percent = clamp(Math.round(yPercent), 0, 100);
    }
    return {
      match_id: Number($('match-id').value),
      label: $('stream-label').value.trim() || 'Live stream',
      url: $('stream-url').value.trim(),
      source_type: $('source-type').value,
      quality: $('quality').value.trim() || '720p',
      restream: {
        channel_name: $('channel-name').value.trim(),
        transcode_profile: $('transcode-profile').value || 'auto',
        overlay,
      },
      language_code: $('lang').value.trim() || 'en',
      region: $('region').value.trim() || 'global',
      priority: Number($('priority').value || 100),
      commentary_type: 'full',
      is_active: $('is-active').value === 'true',
      starts_at: normalizeAdminDateTime($('starts-at').value),
      ends_at: normalizeAdminDateTime($('ends-at').value),
    };
  }

  function fillForm(stream) {
    $('stream-id').value = String(stream.id || '');
    $('match-id').value = String(stream.match_id || '');
    $('stream-label').value = stream.label || '';
    $('stream-url').value = stream.url || '';
    $('channel-name').value = stream.restream?.channel_name || '';
    $('source-type').value = stream.source_type || 'iframe';
    $('quality').value = stream.quality || '720p';
    $('transcode-profile').value = stream.restream?.transcode_profile || 'auto';
    const overlay = stream.restream?.overlay || {};
    $('overlay-enabled').value = overlay.enabled ? 'true' : 'false';
    $('overlay-image').value = overlay.image || 'kinglive_player_leaderboard.png';
    $('overlay-position').value = overlay.position || 'top-right';
    $('overlay-width').value = String(overlay.width || 420);
    $('overlay-margin').value = String(overlay.margin ?? 24);
    $('overlay-x-percent').value = overlay.x_percent ?? overlay.xPercent ?? '';
    $('overlay-y-percent').value = overlay.y_percent ?? overlay.yPercent ?? '';
    $('lang').value = stream.language_code || 'en';
    $('region').value = stream.region || 'global';
    $('priority').value = String(stream.priority ?? 100);
    $('is-active').value = stream.is_active === false ? 'false' : 'true';
    $('starts-at').value = formatAdminDateTime(stream.starts_at);
    $('ends-at').value = formatAdminDateTime(stream.ends_at);
    updateOverlayPreview();
    scheduleOverlayStreamPreview();
  }

  function resetForm() {
    $('stream-form').reset();
    $('stream-id').value = '';
    $('quality').value = '720p';
    $('channel-name').value = '';
    $('transcode-profile').value = 'auto';
    $('overlay-enabled').value = 'false';
    $('overlay-image').value = 'kinglive_player_leaderboard.png';
    $('overlay-position').value = 'top-right';
    $('overlay-width').value = '420';
    $('overlay-margin').value = '24';
    $('overlay-x-percent').value = '';
    $('overlay-y-percent').value = '';
    $('lang').value = 'en';
    $('region').value = 'global';
    $('priority').value = '100';
    $('is-active').value = 'true';
    $('starts-at').value = '';
    $('ends-at').value = '';
    updateOverlayPreview();
    clearOverlayStreamPreview();
  }

  async function saveStream(event) {
    event.preventDefault();
    saveMsg.textContent = '';
    saveErr.textContent = '';
    try {
      const id = Number($('stream-id').value || 0);
      if (id > 0) {
        await adminFetch(`/api/admin/streams/${id}`, { method: 'PUT', body: JSON.stringify(streamFromForm()) });
      } else {
        await adminFetch('/api/admin/streams', { method: 'POST', body: JSON.stringify(streamFromForm()) });
      }
      saveMsg.textContent = 'Saved';
      resetForm();
      await loadStreams();
    } catch (error) {
      saveErr.textContent = String(error.message || error);
    }
  }

  async function deleteStream(id) {
    if (!window.confirm(`Delete stream #${id}?`)) return;
    saveMsg.textContent = '';
    saveErr.textContent = '';
    try {
      await adminFetch(`/api/admin/streams/${id}`, { method: 'DELETE' });
      saveMsg.textContent = 'Deleted';
      await loadStreams();
    } catch (error) {
      saveErr.textContent = String(error.message || error);
    }
  }

  async function loadStreams() {
    if (!token()) {
      streamsBody.innerHTML = '<tr><td colspan="14">Login first</td></tr>';
      return;
    }
    try {
      const payload = await adminFetch('/api/admin/streams');
      const streams = Array.isArray(payload.streams) ? payload.streams : [];
      if (!streams.length) {
        streamsBody.innerHTML = '<tr><td colspan="14">No streams</td></tr>';
        return;
      }
      streamsBody.innerHTML = streams
        .map((stream) => {
          const url = escapeHtml(stream.url || '');
          const editable = stream.editable !== false && stream.origin !== 'dami';
          const overlay = stream.restream?.overlay;
          const manualPosition = overlay?.x_percent !== undefined && overlay?.y_percent !== undefined
            ? `<br/>manual ${escapeHtml(overlay.x_percent)}% / ${escapeHtml(overlay.y_percent)}%`
            : '';
          const overlayLabel = overlay?.enabled
            ? `${escapeHtml(overlay.image || 'banner')}<br/>${escapeHtml(overlay.position || 'top-right')} ${escapeHtml(overlay.width || 420)}px${manualPosition}`
            : '';
          return `
            <tr>
              <td>${escapeHtml(stream.id)}</td>
              <td>${escapeHtml(stream.origin || 'manual')}</td>
              <td>${escapeHtml(stream.match_id)}</td>
              <td>${escapeHtml(stream.source_type || '')}</td>
              <td>${escapeHtml(stream.label || '')}</td>
              <td class="mono">${url}</td>
              <td class="mono">${escapeHtml(stream.restream?.channel_name || '')}</td>
              <td>${escapeHtml(stream.restream?.transcode_profile || '')}</td>
              <td class="mono">${overlayLabel}</td>
              <td>${escapeHtml(stream.priority ?? '')}</td>
              <td>${stream.is_active === false ? 'false' : 'true'}</td>
              <td class="mono">${escapeHtml(stream.starts_at || '')}<br/>${escapeHtml(stream.ends_at || '')}</td>
              <td>${stream.is_live_now ? 'true' : 'false'}</td>
              <td>
                <div class="admin-actions">
                  ${editable ? `<button class="button secondary" type="button" data-edit="${escapeHtml(stream.id)}">Edit</button>` : '<span class="mono">auto</span>'}
                  ${editable ? `<button class="button secondary" type="button" data-del="${escapeHtml(stream.id)}">Delete</button>` : ''}
                </div>
              </td>
            </tr>
          `;
        })
        .join('');

      streamsBody.querySelectorAll('[data-edit]').forEach((button) => {
        button.addEventListener('click', () => {
          const id = Number(button.getAttribute('data-edit'));
          const stream = streams.find((item) => Number(item.id) === id);
          if (stream) fillForm(stream);
        });
      });
      streamsBody.querySelectorAll('[data-del]').forEach((button) => {
        button.addEventListener('click', () => {
          const id = Number(button.getAttribute('data-del'));
          if (id > 0) deleteStream(id);
        });
      });
    } catch (error) {
      streamsBody.innerHTML = `<tr><td colspan="14">${escapeHtml(String(error.message || error))}</td></tr>`;
    }
  }

  async function loadOverlays() {
    updateOverlaySelect(fallbackOverlays);
    if (!overlayBody) return;
    if (!token()) {
      overlayBody.innerHTML = '<tr><td colspan="4">Login first</td></tr>';
      return;
    }
    try {
      const payload = await adminFetch('/api/admin/overlays');
      const overlays = Array.isArray(payload.overlays) ? payload.overlays : fallbackOverlays;
      updateOverlaySelect(overlays);
      const uploaded = overlays.filter((overlay) => overlay && overlay.builtin !== true);
      if (!uploaded.length) {
        overlayBody.innerHTML = '<tr><td colspan="4">No uploaded banners</td></tr>';
        return;
      }
      overlayBody.innerHTML = uploaded
        .map((overlay) => `
          <tr>
            <td>${escapeHtml(overlay.name || overlay.id)}</td>
            <td class="mono">${escapeHtml(overlay.id)}</td>
            <td>${escapeHtml(formatBytes(overlay.size || 0))}</td>
            <td><button class="button secondary" type="button" data-overlay-del="${escapeHtml(overlay.id)}">Delete</button></td>
          </tr>
        `)
        .join('');
      overlayBody.querySelectorAll('[data-overlay-del]').forEach((button) => {
        button.addEventListener('click', () => deleteOverlay(button.getAttribute('data-overlay-del')));
      });
    } catch (error) {
      overlayBody.innerHTML = `<tr><td colspan="4">${escapeHtml(String(error.message || error))}</td></tr>`;
    }
  }

  function updateOverlaySelect(overlays) {
    const select = $('overlay-image');
    if (!select) return;
    const current = select.value || 'kinglive_player_leaderboard.png';
    const list = Array.isArray(overlays) && overlays.length ? overlays : fallbackOverlays;
    select.innerHTML = list
      .map((overlay) => {
        const label = overlay.builtin ? overlay.name : `${overlay.name || overlay.id} (uploaded)`;
        return `<option value="${escapeHtml(overlay.id)}">${escapeHtml(label)}</option>`;
      })
      .join('');
    select.value = list.some((overlay) => overlay.id === current) ? current : 'kinglive_player_leaderboard.png';
    updateOverlayPreview();
  }

  async function uploadOverlay(event) {
    event.preventDefault();
    if (!overlayStatus) return;
    overlayStatus.textContent = '';
    saveErr.textContent = '';
    try {
      const file = $('overlay-file')?.files?.[0];
      if (!file) throw new Error('Choose PNG file');
      if (file.type && file.type !== 'image/png') throw new Error('PNG only');
      if (file.size > 1_500_000) throw new Error('PNG is too large');
      overlayStatus.textContent = 'Uploading...';
      const dataUrl = await readFileAsDataUrl(file);
      const payload = await adminFetch('/api/admin/overlays', {
        method: 'POST',
        body: JSON.stringify({
          name: $('overlay-name')?.value.trim() || file.name,
          data_url: dataUrl,
        }),
      });
      $('overlay-file').value = '';
      $('overlay-name').value = '';
      overlayStatus.textContent = 'Uploaded';
      if (payload.overlay?.id) $('overlay-image').value = payload.overlay.id;
      await loadOverlays();
      if (payload.overlay?.id) $('overlay-image').value = payload.overlay.id;
    } catch (error) {
      overlayStatus.textContent = '';
      saveErr.textContent = String(error.message || error);
    }
  }

  async function deleteOverlay(id) {
    if (!id || !window.confirm(`Delete banner ${id}?`)) return;
    overlayStatus.textContent = '';
    saveErr.textContent = '';
    try {
      await adminFetch(`/api/admin/overlays/${encodeURIComponent(id)}`, { method: 'DELETE' });
      overlayStatus.textContent = 'Deleted';
      await loadOverlays();
    } catch (error) {
      saveErr.textContent = String(error.message || error);
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
  }

  function formatBytes(value) {
    const bytes = Number(value) || 0;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function statusFromForm() {
    const minute = $('status-minute')?.value;
    const homeScore = $('status-home-score')?.value;
    const awayScore = $('status-away-score')?.value;
    return {
      match_id: Number($('status-match-id').value),
      status: $('status-value').value,
      minute: minute === '' ? null : Number(minute),
      home_score: homeScore === '' ? null : Number(homeScore),
      away_score: awayScore === '' ? null : Number(awayScore),
      scheduled_at: normalizeAdminDateTime($('status-scheduled-at').value),
      note: $('status-note').value.trim(),
    };
  }

  function fillStatusForm(override) {
    $('status-match-id').value = String(override.match_id || '');
    $('status-value').value = override.status || 'scheduled';
    $('status-minute').value = override.minute == null ? '' : String(override.minute);
    $('status-home-score').value = override.home_score == null ? '' : String(override.home_score);
    $('status-away-score').value = override.away_score == null ? '' : String(override.away_score);
    $('status-scheduled-at').value = formatAdminDateTime(override.scheduled_at);
    $('status-note').value = override.note || '';
  }

  function resetStatusForm() {
    $('status-form').reset();
    $('status-value').value = 'scheduled';
  }

  async function saveStatus(event) {
    event.preventDefault();
    saveMsg.textContent = '';
    saveErr.textContent = '';
    try {
      await adminFetch('/api/admin/match-overrides', {
        method: 'POST',
        body: JSON.stringify(statusFromForm()),
      });
      saveMsg.textContent = 'Status override saved';
      resetStatusForm();
      await loadStatuses();
      await runRefresh('matches');
    } catch (error) {
      saveErr.textContent = String(error.message || error);
    }
  }

  async function deleteStatus(matchId) {
    if (!window.confirm(`Delete status override for match #${matchId}?`)) return;
    saveMsg.textContent = '';
    saveErr.textContent = '';
    try {
      await adminFetch(`/api/admin/match-overrides/${matchId}`, { method: 'DELETE' });
      saveMsg.textContent = 'Status override deleted';
      await loadStatuses();
      await runRefresh('matches');
    } catch (error) {
      saveErr.textContent = String(error.message || error);
    }
  }

  async function loadStatuses() {
    if (!statusBody) return;
    if (!token()) {
      statusBody.innerHTML = '<tr><td colspan="7">Login first</td></tr>';
      return;
    }
    try {
      const payload = await adminFetch('/api/admin/match-overrides');
      const overrides = Array.isArray(payload.overrides) ? payload.overrides : [];
      if (!overrides.length) {
        statusBody.innerHTML = '<tr><td colspan="7">No overrides</td></tr>';
        return;
      }
      statusBody.innerHTML = overrides.map((override) => `
        <tr>
          <td>${escapeHtml(override.match_id)}</td>
          <td>${escapeHtml(override.status || '')}</td>
          <td>${escapeHtml(override.minute ?? '')}</td>
          <td>${escapeHtml(scoreLabel(override))}</td>
          <td class="mono">${escapeHtml(override.scheduled_at || '')}</td>
          <td class="mono">${escapeHtml(override.updated_at || '')}</td>
          <td>
            <div class="admin-actions">
              <button class="button secondary" type="button" data-status-edit="${escapeHtml(override.match_id)}">Edit</button>
              <button class="button secondary" type="button" data-status-del="${escapeHtml(override.match_id)}">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
      statusBody.querySelectorAll('[data-status-edit]').forEach((button) => {
        button.addEventListener('click', () => {
          const matchId = Number(button.getAttribute('data-status-edit'));
          const override = overrides.find((item) => Number(item.match_id) === matchId);
          if (override) fillStatusForm(override);
        });
      });
      statusBody.querySelectorAll('[data-status-del]').forEach((button) => {
        button.addEventListener('click', () => {
          const matchId = Number(button.getAttribute('data-status-del'));
          if (matchId > 0) deleteStatus(matchId);
        });
      });
    } catch (error) {
      statusBody.innerHTML = `<tr><td colspan="7">${escapeHtml(String(error.message || error))}</td></tr>`;
    }
  }

  function scoreLabel(override) {
    if (override.home_score == null && override.away_score == null) return '';
    return `${override.home_score ?? 0} : ${override.away_score ?? 0}`;
  }

  async function loadSettings() {
    if (!$('hide-finished-matches')) return;
    if (!token()) {
      if (settingsStatus) settingsStatus.textContent = 'Login first';
      return;
    }
    try {
      const payload = await adminFetch('/api/admin/settings');
      const settings = payload.settings || {};
      $('hide-finished-matches').checked = settings.hide_finished_matches === true;
      if (settingsStatus) settingsStatus.textContent = 'Loaded';
    } catch (error) {
      if (settingsStatus) settingsStatus.textContent = String(error.message || error);
    }
  }

  async function saveSettings() {
    if (!$('hide-finished-matches')) return;
    saveMsg.textContent = '';
    saveErr.textContent = '';
    if (settingsStatus) settingsStatus.textContent = 'Saving...';
    try {
      const payload = await adminFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          hide_finished_matches: $('hide-finished-matches').checked,
        }),
      });
      if (settingsStatus) settingsStatus.textContent = payload.settings?.hide_finished_matches ? 'Finished hidden' : 'Finished visible';
      saveMsg.textContent = 'Settings saved';
      await loadMonitoring();
    } catch (error) {
      if (settingsStatus) settingsStatus.textContent = String(error.message || error);
      saveErr.textContent = String(error.message || error);
    }
  }

  function chatMatchId() {
    return Number($('chat-match-id')?.value || 0);
  }

  async function loadChat() {
    if (!chatBody) return;
    if (!token()) {
      chatBody.innerHTML = '<tr><td colspan="4">Login first</td></tr>';
      return;
    }
    const matchId = chatMatchId();
    if (!(matchId > 0)) {
      chatBody.innerHTML = '<tr><td colspan="4">Enter match ID</td></tr>';
      if (chatAdminStatus) chatAdminStatus.textContent = '';
      return;
    }
    if (chatAdminStatus) chatAdminStatus.textContent = 'Loading...';
    try {
      const payload = await adminFetch(`/api/admin/chat/${matchId}`);
      const messages = Array.isArray(payload.messages) ? payload.messages : [];
      if (chatAdminStatus) chatAdminStatus.textContent = `${messages.length} messages`;
      if (!messages.length) {
        chatBody.innerHTML = '<tr><td colspan="4">No messages</td></tr>';
        return;
      }
      chatBody.innerHTML = messages.map((message) => {
        const author = message.author || 'Guest';
        return `
          <tr>
            <td class="mono">${escapeHtml(formatAdminDateTime(message.created_at) || message.created_at || '')}</td>
            <td>${escapeHtml(author)}</td>
            <td>${escapeHtml(message.message || '')}</td>
            <td>
              <div class="admin-actions wrap">
                <button class="button secondary" type="button" data-chat-delete="${escapeHtml(encodeURIComponent(message.id || ''))}">Delete</button>
                <button class="button secondary" type="button" data-chat-author-delete="${escapeHtml(encodeURIComponent(author))}">Delete author</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
      chatBody.querySelectorAll('[data-chat-delete]').forEach((button) => {
        button.addEventListener('click', () => {
          const messageId = decodeURIComponent(button.getAttribute('data-chat-delete') || '');
          if (messageId) deleteChatMessage(messageId);
        });
      });
      chatBody.querySelectorAll('[data-chat-author-delete]').forEach((button) => {
        button.addEventListener('click', () => {
          const author = decodeURIComponent(button.getAttribute('data-chat-author-delete') || '');
          if (author) deleteChatAuthor(author);
        });
      });
    } catch (error) {
      if (chatAdminStatus) chatAdminStatus.textContent = String(error.message || error);
      chatBody.innerHTML = `<tr><td colspan="4">${escapeHtml(String(error.message || error))}</td></tr>`;
    }
  }

  async function deleteChatMessage(messageId) {
    const matchId = chatMatchId();
    if (!(matchId > 0) || !messageId) return;
    if (!window.confirm('Delete this chat message?')) return;
    if (chatAdminStatus) chatAdminStatus.textContent = 'Deleting...';
    try {
      const payload = await adminFetch(`/api/admin/chat/${matchId}/messages/${encodeURIComponent(messageId)}`, { method: 'DELETE' });
      if (chatAdminStatus) chatAdminStatus.textContent = `Deleted ${payload.deleted || 0}`;
      await loadChat();
    } catch (error) {
      if (chatAdminStatus) chatAdminStatus.textContent = String(error.message || error);
    }
  }

  async function deleteChatAuthor(author) {
    const matchId = chatMatchId();
    if (!(matchId > 0) || !author) return;
    if (!window.confirm(`Delete all chat messages from ${author}?`)) return;
    if (chatAdminStatus) chatAdminStatus.textContent = 'Deleting author...';
    try {
      const payload = await adminFetch(`/api/admin/chat/${matchId}/authors`, {
        method: 'POST',
        body: JSON.stringify({ author }),
      });
      if (chatAdminStatus) chatAdminStatus.textContent = `Deleted ${payload.deleted || 0}`;
      await loadChat();
    } catch (error) {
      if (chatAdminStatus) chatAdminStatus.textContent = String(error.message || error);
    }
  }

  async function clearChat() {
    const matchId = chatMatchId();
    if (!(matchId > 0)) return;
    if (!window.confirm(`Clear all chat messages for match #${matchId}?`)) return;
    if (chatAdminStatus) chatAdminStatus.textContent = 'Clearing...';
    try {
      const payload = await adminFetch(`/api/admin/chat/${matchId}`, { method: 'DELETE' });
      if (chatAdminStatus) chatAdminStatus.textContent = `Cleared ${payload.deleted || 0}`;
      await loadChat();
    } catch (error) {
      if (chatAdminStatus) chatAdminStatus.textContent = String(error.message || error);
    }
  }

  async function loadMonitoring() {
    if (!monitoringBody || !monitoringMetrics) return;
    if (!token()) {
      monitoringBody.innerHTML = '<tr><td colspan="3">Login first</td></tr>';
      return;
    }
    try {
      const payload = await adminFetch('/api/admin/monitoring');
      const activeStreams = payload.active_streams || {};
      const activeViewers = payload.active_viewers || {};
      const metrics = payload.metrics || {};
      monitoringMetrics.innerHTML = [
        ['Active streams', activeStreams.total || 0],
        ['Active viewers', activeViewers.total || 0],
        ['API calls', metrics.api_calls || 0],
        ['Cache hits', metrics.cache_hits || 0],
        ['Upstream calls', metrics.upstream_calls || 0],
        ['Last Sportmonks update', metrics.last_sportmonks_update || 'n/a'],
        ['Last DAMI update', metrics.last_dami_update || 'n/a'],
      ].map(([label, value]) => `
        <div class="admin-metric">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join('');

      const matchIds = Array.from(new Set([
        ...Object.keys(activeStreams.by_match || {}),
        ...Object.keys(activeViewers.by_match || {}),
      ])).sort((left, right) => Number(left) - Number(right));
      if (!matchIds.length) {
        monitoringBody.innerHTML = '<tr><td colspan="3">No active viewers or streams</td></tr>';
      } else {
        monitoringBody.innerHTML = matchIds.map((matchId) => `
          <tr>
            <td>${escapeHtml(matchId)}</td>
            <td>${escapeHtml(activeViewers.by_match?.[matchId] || 0)}</td>
            <td>${escapeHtml(activeStreams.by_match?.[matchId] || 0)}</td>
          </tr>
        `).join('');
      }
      if (monitoringMeta) monitoringMeta.textContent = `Generated: ${payload.generated_at || ''}`;
    } catch (error) {
      monitoringBody.innerHTML = `<tr><td colspan="3">${escapeHtml(String(error.message || error))}</td></tr>`;
    }
  }

  async function runRefresh(scope) {
    saveMsg.textContent = '';
    saveErr.textContent = '';
    if (refreshResult) refreshResult.textContent = 'Refreshing...';
    try {
      const matchId = Number($('refresh-match-id')?.value || 0);
      const date = $('refresh-date')?.value || new Date().toISOString().slice(0, 10);
      const payload = {
        scope,
        date,
        ...(matchId > 0 ? { match_id: matchId } : {}),
      };
      const result = await adminFetch('/api/admin/refresh', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (refreshResult) refreshResult.textContent = JSON.stringify(result, null, 2);
      saveMsg.textContent = `Refresh ${scope} complete`;
      await loadMonitoring();
      await loadStreams();
      await loadStatuses();
    } catch (error) {
      if (refreshResult) refreshResult.textContent = String(error.message || error);
      saveErr.textContent = String(error.message || error);
    }
  }

  function normalizeAdminDateTime(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return null;
    const parsed = Date.parse(normalized);
    if (Number.isNaN(parsed)) return null;
    return new Date(parsed).toISOString();
  }

  function formatAdminDateTime(value) {
    if (!value) return '';
    const parsed = Date.parse(String(value));
    if (Number.isNaN(parsed)) return '';
    const date = new Date(parsed);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  $('login-button').addEventListener('click', login);
  $('logout-button').addEventListener('click', logout);
  $('stream-form').addEventListener('submit', saveStream);
  if ($('status-form')) $('status-form').addEventListener('submit', saveStatus);
  $('reload-streams').addEventListener('click', loadStreams);
  $('reload-monitoring').addEventListener('click', loadMonitoring);
  if ($('reload-statuses')) $('reload-statuses').addEventListener('click', loadStatuses);
  if ($('reload-chat')) $('reload-chat').addEventListener('click', loadChat);
  if ($('clear-chat')) $('clear-chat').addEventListener('click', clearChat);
  if ($('overlay-form')) $('overlay-form').addEventListener('submit', uploadOverlay);
  if ($('reload-overlays')) $('reload-overlays').addEventListener('click', loadOverlays);
  if ($('save-admin-settings')) $('save-admin-settings').addEventListener('click', saveSettings);
  $('reset-form').addEventListener('click', resetForm);
  ['overlay-enabled', 'overlay-image', 'overlay-width', 'overlay-margin'].forEach((id) => {
    if ($(id)) $(id).addEventListener('input', updateOverlayPreview);
    if ($(id)) $(id).addEventListener('change', updateOverlayPreview);
  });
  ['match-id', 'stream-id', 'stream-label', 'stream-url', 'source-type', 'lang'].forEach((id) => {
    if ($(id)) $(id).addEventListener('input', scheduleOverlayStreamPreview);
    if ($(id)) $(id).addEventListener('change', scheduleOverlayStreamPreview);
  });
  if ($('overlay-position')) {
    $('overlay-position').addEventListener('change', clearManualOverlayPercent);
  }
  if ($('overlay-preview-reset')) $('overlay-preview-reset').addEventListener('click', clearManualOverlayPercent);
  window.addEventListener('resize', updateOverlayPreview);
  if ($('reset-status')) $('reset-status').addEventListener('click', resetStatusForm);
  if ($('refresh-date')) $('refresh-date').value = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('[data-refresh-scope]').forEach((button) => {
    button.addEventListener('click', () => runRefresh(button.getAttribute('data-refresh-scope')));
  });

  setAuthLabel();
  setupOverlayPreviewDrag();
  updateOverlayPreview();
  loadOverlays();
  loadSettings();
  loadMonitoring();
  loadStreams();
  loadStatuses();
})();
