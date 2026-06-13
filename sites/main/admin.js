(function () {
  const config = window.KINGLIVE_MAIN_CONFIG || {};
  const apiBase = String(config.adminApiBase || config.apiBase || '').replace(/\/$/, '');
  const tokenKey = 'kinglive_admin_token';

  const $ = (id) => document.getElementById(id);
  const authStatus = $('auth-status');
  const saveMsg = $('save-msg');
  const saveErr = $('save-err');
  const streamsBody = $('streams-body');
  const restreamsBody = $('restreams-body');
  const monitoringMetrics = $('monitoring-metrics');
  const monitoringBody = $('monitoring-body');
  const monitoringMeta = $('monitoring-meta');
  const refreshResult = $('refresh-result');
  const statusBody = $('status-body');

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
      await loadMonitoring();
      await loadStreams();
      await loadRestreams();
      await loadStatuses();
    } catch (error) {
      saveErr.textContent = String(error.message || error);
    }
  }

  function logout() {
    setToken('');
    setAuthLabel();
    streamsBody.innerHTML = '<tr><td colspan="13">Logged out</td></tr>';
    if (restreamsBody) restreamsBody.innerHTML = '<tr><td colspan="8">Logged out</td></tr>';
    if (monitoringBody) monitoringBody.innerHTML = '<tr><td colspan="3">Logged out</td></tr>';
    if (statusBody) statusBody.innerHTML = '<tr><td colspan="7">Logged out</td></tr>';
  }

  function streamFromForm() {
    return {
      match_id: Number($('match-id').value),
      label: $('stream-label').value.trim() || 'Live stream',
      url: $('stream-url').value.trim(),
      source_type: $('source-type').value,
      playback_mode: $('playback-mode').value,
      quality: $('quality').value.trim() || '720p',
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
    $('source-type').value = stream.source_type || 'iframe';
    $('playback-mode').value = stream.playback_mode || 'auto';
    $('quality').value = stream.quality || '720p';
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
    $('playback-mode').value = 'auto';
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
      const id = String($('stream-id').value || '').trim();
      if (id) {
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
    const isApiStream = String(id || '').startsWith('dami-');
    if (!window.confirm(isApiStream ? `Reset override for ${id}?` : `Delete stream #${id}?`)) return;
    saveMsg.textContent = '';
    saveErr.textContent = '';
    try {
      await adminFetch(`/api/admin/streams/${id}`, { method: 'DELETE' });
      saveMsg.textContent = isApiStream ? 'API stream override reset' : 'Deleted';
      await loadStreams();
    } catch (error) {
      saveErr.textContent = String(error.message || error);
    }
  }

  async function loadStreams() {
    if (!token()) {
      streamsBody.innerHTML = '<tr><td colspan="13">Login first</td></tr>';
      return;
    }
    try {
      const payload = await adminFetch('/api/admin/streams');
      const streams = Array.isArray(payload.streams) ? payload.streams : [];
      if (!streams.length) {
        streamsBody.innerHTML = '<tr><td colspan="13">No streams</td></tr>';
        return;
      }
      streamsBody.innerHTML = streams
        .map((stream) => {
          const url = escapeHtml(stream.url || '');
          const editable = stream.editable !== false;
          const isApiStream = stream.origin === 'dami';
          return `
            <tr>
              <td>${escapeHtml(stream.id)}</td>
              <td>${escapeHtml(stream.origin || 'manual')}</td>
              <td>${escapeHtml(stream.match_id)}</td>
              <td>${escapeHtml(stream.source_type || '')}</td>
              <td>${escapeHtml(stream.playback_mode || 'auto')}</td>
              <td>${escapeHtml(stream.label || '')}</td>
              <td>${escapeHtml(stream.language_code || '')}</td>
              <td class="mono">${url}</td>
              <td>${escapeHtml(stream.priority ?? '')}</td>
              <td>${stream.is_active === false ? 'false' : 'true'}</td>
              <td class="mono">${escapeHtml(stream.starts_at || '')}<br/>${escapeHtml(stream.ends_at || '')}</td>
              <td>${stream.is_live_now ? 'true' : 'false'}</td>
              <td>
                <div class="admin-actions">
                  ${editable ? `<button class="button secondary" type="button" data-edit="${escapeHtml(stream.id)}">Edit</button>` : '<span class="mono">auto</span>'}
                  ${editable ? `<button class="button secondary" type="button" data-del="${escapeHtml(stream.id)}">${isApiStream ? 'Reset' : 'Delete'}</button>` : ''}
                </div>
              </td>
            </tr>
          `;
        })
        .join('');

      streamsBody.querySelectorAll('[data-edit]').forEach((button) => {
        button.addEventListener('click', () => {
          const id = String(button.getAttribute('data-edit') || '');
          const stream = streams.find((item) => String(item.id) === id);
          if (stream) fillForm(stream);
        });
      });
      streamsBody.querySelectorAll('[data-del]').forEach((button) => {
        button.addEventListener('click', () => {
          const id = String(button.getAttribute('data-del') || '');
          if (id) deleteStream(id);
        });
      });
    } catch (error) {
      streamsBody.innerHTML = `<tr><td colspan="13">${escapeHtml(String(error.message || error))}</td></tr>`;
    }
  }

  function restreamFromForm() {
    return {
      match_id: Number($('restream-match-id').value),
      slug: $('restream-slug').value.trim(),
      donor_url: $('restream-donor-url').value.trim(),
      channel_name: $('restream-channel-name').value.trim(),
      label: $('restream-label').value.trim(),
      language_code: $('restream-lang').value.trim() || 'en',
      priority: Number($('restream-priority').value || 100),
      desired_state: $('restream-desired-state').value,
      is_active: $('restream-is-active').value === 'true',
      starts_at: normalizeAdminDateTime($('restream-starts-at').value),
      ends_at: normalizeAdminDateTime($('restream-ends-at').value),
    };
  }

  function fillRestreamForm(restream) {
    $('restream-id').value = restream.id || '';
    $('restream-match-id').value = String(restream.match_id || '');
    $('restream-slug').value = restream.slug || restream.id || '';
    $('restream-donor-url').value = restream.donor_url || '';
    $('restream-channel-name').value = restream.channel_name || '';
    $('restream-label').value = restream.label || '';
    $('restream-lang').value = restream.language_code || 'en';
    $('restream-priority').value = String(restream.priority ?? 100);
    $('restream-desired-state').value = restream.desired_state || 'running';
    $('restream-is-active').value = restream.is_active === false ? 'false' : 'true';
    $('restream-starts-at').value = formatAdminDateTime(restream.starts_at);
    $('restream-ends-at').value = formatAdminDateTime(restream.ends_at);
  }

  function resetRestreamForm() {
    if (!$('restream-form')) return;
    $('restream-form').reset();
    $('restream-id').value = '';
    $('restream-lang').value = 'en';
    $('restream-priority').value = '100';
    $('restream-desired-state').value = 'running';
    $('restream-is-active').value = 'true';
    $('restream-starts-at').value = '';
    $('restream-ends-at').value = '';
  }

  async function saveRestream(event) {
    event.preventDefault();
    saveMsg.textContent = '';
    saveErr.textContent = '';
    try {
      const id = String($('restream-id').value || '').trim();
      const path = id ? `/api/admin/restreams/${encodeURIComponent(id)}` : '/api/admin/restreams';
      const method = id ? 'PUT' : 'POST';
      await adminFetch(path, { method, body: JSON.stringify(restreamFromForm()) });
      saveMsg.textContent = 'Restream saved';
      resetRestreamForm();
      await loadRestreams();
      await loadStreams();
    } catch (error) {
      saveErr.textContent = String(error.message || error);
    }
  }

  async function restreamAction(id, action) {
    saveMsg.textContent = '';
    saveErr.textContent = '';
    try {
      await adminFetch(`/api/admin/restreams/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
      saveMsg.textContent = `Restream ${action} saved`;
      await loadRestreams();
      await loadStreams();
    } catch (error) {
      saveErr.textContent = String(error.message || error);
    }
  }

  async function deleteRestream(id) {
    if (!window.confirm(`Delete restream ${id}?`)) return;
    saveMsg.textContent = '';
    saveErr.textContent = '';
    try {
      await adminFetch(`/api/admin/restreams/${encodeURIComponent(id)}`, { method: 'DELETE' });
      saveMsg.textContent = 'Restream deleted';
      await loadRestreams();
      await loadStreams();
    } catch (error) {
      saveErr.textContent = String(error.message || error);
    }
  }

  async function loadRestreams() {
    if (!restreamsBody) return;
    if (!token()) {
      restreamsBody.innerHTML = '<tr><td colspan="8">Login first</td></tr>';
      return;
    }
    try {
      const payload = await adminFetch('/api/admin/restreams');
      const restreams = Array.isArray(payload.restreams) ? payload.restreams : [];
      if (!restreams.length) {
        restreamsBody.innerHTML = '<tr><td colspan="8">No restreams</td></tr>';
        return;
      }
      restreamsBody.innerHTML = restreams.map((restream) => `
        <tr>
          <td>${escapeHtml(restream.slug || restream.id || '')}</td>
          <td>${escapeHtml(restream.match_id || '')}</td>
          <td>${escapeHtml(restream.label || '')}</td>
          <td>${escapeHtml(restream.desired_state || '')}${restream.is_active === false ? '<br/><span class="mono">inactive</span>' : ''}</td>
          <td>${escapeHtml(restream.language_code || '')}</td>
          <td class="mono">${escapeHtml(restream.output_url || '')}</td>
          <td class="mono">${escapeHtml(restream.updated_at || '')}</td>
          <td>
            <div class="admin-actions wrap">
              <button class="button secondary" type="button" data-restream-edit="${escapeHtml(restream.id)}">Edit</button>
              <button class="button secondary" type="button" data-restream-action="${escapeHtml(restream.id)}" data-action="start">Start</button>
              <button class="button secondary" type="button" data-restream-action="${escapeHtml(restream.id)}" data-action="stop">Stop</button>
              <button class="button secondary" type="button" data-restream-action="${escapeHtml(restream.id)}" data-action="restart">Restart</button>
              <button class="button secondary" type="button" data-restream-del="${escapeHtml(restream.id)}">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
      restreamsBody.querySelectorAll('[data-restream-edit]').forEach((button) => {
        button.addEventListener('click', () => {
          const id = String(button.getAttribute('data-restream-edit') || '');
          const restream = restreams.find((item) => String(item.id) === id);
          if (restream) fillRestreamForm(restream);
        });
      });
      restreamsBody.querySelectorAll('[data-restream-action]').forEach((button) => {
        button.addEventListener('click', () => {
          const id = String(button.getAttribute('data-restream-action') || '');
          const action = String(button.getAttribute('data-action') || '');
          if (id && action) restreamAction(id, action);
        });
      });
      restreamsBody.querySelectorAll('[data-restream-del]').forEach((button) => {
        button.addEventListener('click', () => {
          const id = String(button.getAttribute('data-restream-del') || '');
          if (id) deleteRestream(id);
        });
      });
    } catch (error) {
      restreamsBody.innerHTML = `<tr><td colspan="8">${escapeHtml(String(error.message || error))}</td></tr>`;
    }
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
      await loadRestreams();
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
  if ($('restream-form')) $('restream-form').addEventListener('submit', saveRestream);
  if ($('status-form')) $('status-form').addEventListener('submit', saveStatus);
  $('reload-streams').addEventListener('click', loadStreams);
  if ($('reload-restreams')) $('reload-restreams').addEventListener('click', loadRestreams);
  $('reload-monitoring').addEventListener('click', loadMonitoring);
  if ($('reload-statuses')) $('reload-statuses').addEventListener('click', loadStatuses);
  $('reset-form').addEventListener('click', resetForm);
  if ($('reset-restream-form')) $('reset-restream-form').addEventListener('click', resetRestreamForm);
  if ($('reset-status')) $('reset-status').addEventListener('click', resetStatusForm);
  if ($('refresh-date')) $('refresh-date').value = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('[data-refresh-scope]').forEach((button) => {
    button.addEventListener('click', () => runRefresh(button.getAttribute('data-refresh-scope')));
  });

  setAuthLabel();
  loadMonitoring();
  loadStreams();
  loadRestreams();
  loadStatuses();
})();
