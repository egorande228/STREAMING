(function () {
  const config = window.KINGLIVE_MAIN_CONFIG || {};
  const apiBase = String(config.adminApiBase || config.apiBase || '').replace(/\/$/, '');
  const tokenKey = 'kinglive_admin_token';

  const $ = (id) => document.getElementById(id);
  const authStatus = $('auth-status');
  const saveMsg = $('save-msg');
  const saveErr = $('save-err');
  const streamsBody = $('streams-body');

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
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
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
      await loadStreams();
    } catch (error) {
      saveErr.textContent = String(error.message || error);
    }
  }

  function logout() {
    setToken('');
    setAuthLabel();
    streamsBody.innerHTML = '<tr><td colspan="8">Logged out</td></tr>';
  }

  function streamFromForm() {
    return {
      match_id: Number($('match-id').value),
      label: $('stream-label').value.trim() || 'Live stream',
      url: $('stream-url').value.trim(),
      source_type: $('source-type').value,
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

  async function loadStreams() {
    if (!token()) {
      streamsBody.innerHTML = '<tr><td colspan="10">Login first</td></tr>';
      return;
    }
    try {
      const payload = await adminFetch('/api/admin/streams');
      const streams = Array.isArray(payload.streams) ? payload.streams : [];
      if (!streams.length) {
        streamsBody.innerHTML = '<tr><td colspan="10">No streams</td></tr>';
        return;
      }
      streamsBody.innerHTML = streams
        .map((stream) => {
          const url = escapeHtml(stream.url || '');
          return `
            <tr>
              <td>${escapeHtml(stream.id)}</td>
              <td>${escapeHtml(stream.match_id)}</td>
              <td>${escapeHtml(stream.source_type || '')}</td>
              <td>${escapeHtml(stream.label || '')}</td>
              <td class="mono">${url}</td>
              <td>${escapeHtml(stream.priority ?? '')}</td>
              <td>${stream.is_active === false ? 'false' : 'true'}</td>
              <td class="mono">${escapeHtml(stream.starts_at || '')}<br/>${escapeHtml(stream.ends_at || '')}</td>
              <td>${stream.is_live_now ? 'true' : 'false'}</td>
              <td>
                <div class="admin-actions">
                  <button class="button secondary" type="button" data-edit="${escapeHtml(stream.id)}">Edit</button>
                  <button class="button secondary" type="button" data-del="${escapeHtml(stream.id)}">Delete</button>
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
      streamsBody.innerHTML = `<tr><td colspan="10">${escapeHtml(String(error.message || error))}</td></tr>`;
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
  $('reload-streams').addEventListener('click', loadStreams);
  $('reset-form').addEventListener('click', resetForm);

  setAuthLabel();
  loadStreams();
})();
