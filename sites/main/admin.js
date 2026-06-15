(function () {
  const config = window.KINGLIVE_MAIN_CONFIG || {};
  const apiBase = String(config.adminApiBase || config.apiBase || '').replace(/\/$/, '');
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
    $('lang').value = stream.language_code || 'en';
    $('region').value = stream.region || 'global';
    $('priority').value = String(stream.priority ?? 100);
    $('is-active').value = stream.is_active === false ? 'false' : 'true';
    $('starts-at').value = formatAdminDateTime(stream.starts_at);
    $('ends-at').value = formatAdminDateTime(stream.ends_at);
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
    $('lang').value = 'en';
    $('region').value = 'global';
    $('priority').value = '100';
    $('is-active').value = 'true';
    $('starts-at').value = '';
    $('ends-at').value = '';
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

  async function restartStream(id) {
    if (!window.confirm(`Restart IPTV restream #${id}?`)) return;
    saveMsg.textContent = '';
    saveErr.textContent = '';
    try {
      const payload = await adminFetch(`/api/admin/streams/${id}/restart`, { method: 'POST' });
      saveMsg.textContent = `Restart requested${payload.slug ? `: ${payload.slug}` : ''}`;
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
          const restartable = editable && stream.restream?.enabled && stream.is_active !== false && stream.restream?.desired_state !== 'stopped';
          const overlay = stream.restream?.overlay;
          const overlayLabel = overlay?.enabled
            ? `${escapeHtml(overlay.image || 'banner')}<br/>${escapeHtml(overlay.position || 'top-right')} ${escapeHtml(overlay.width || 420)}px`
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
                  ${restartable ? `<button class="button secondary" type="button" data-restart="${escapeHtml(stream.id)}">Restart</button>` : ''}
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
      streamsBody.querySelectorAll('[data-restart]').forEach((button) => {
        button.addEventListener('click', () => {
          const id = Number(button.getAttribute('data-restart'));
          if (id > 0) restartStream(id);
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
  if ($('reset-status')) $('reset-status').addEventListener('click', resetStatusForm);
  if ($('refresh-date')) $('refresh-date').value = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('[data-refresh-scope]').forEach((button) => {
    button.addEventListener('click', () => runRefresh(button.getAttribute('data-refresh-scope')));
  });

  setAuthLabel();
  loadOverlays();
  loadSettings();
  loadMonitoring();
  loadStreams();
  loadStatuses();
})();
