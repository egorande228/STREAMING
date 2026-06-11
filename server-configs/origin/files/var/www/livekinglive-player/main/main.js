const card = document.getElementById('match-card');
const params = new URLSearchParams(window.location.search);
const requestedMatch = params.get('match') || '';
const STATUS_URL = 'https://hls.livekinglive.win/lb/stream-status';
const REFRESH_MS = 10000;
let lastConfig = null;
let lastStatus = null;

function normalizeStreams(configured) {
  const streams = Array.isArray(configured) ? configured : [configured];
  return streams.filter((stream) => stream && stream.url && stream.is_active !== false && stream.isActive !== false);
}

function labelFor(stream) {
  const lang = String(stream.language_code || stream.languageCode || '').toLowerCase();
  if (stream.label) return stream.label;
  if (lang === 'es') return 'Spanish';
  if (lang === 'en') return 'English';
  if (lang === 'ar') return 'Arabic';
  if ((stream.source_type || stream.sourceType) === 'iframe') return 'Iframe';
  return 'Source';
}

function sourceUrl(matchId, stream) {
  const lang = stream.language_code || stream.languageCode || '';
  const source = stream.id || labelFor(stream).toLowerCase();
  const q = new URLSearchParams({ match: matchId });
  if (lang) q.set('lang', lang);
  if (source) q.set('source', source);
  return `../?${q.toString()}`;
}

function streamKey(stream) {
  return String(stream.id || stream.language_code || stream.languageCode || labelFor(stream)).toLowerCase();
}

function statusFor(matchId, stream) {
  const statusStreams = lastStatus?.matches?.[matchId] || [];
  const key = streamKey(stream);
  return statusStreams.find((item) => String(item.id || item.language_code || '').toLowerCase() === key)
    || statusStreams.find((item) => String(item.language_code || '').toLowerCase() === String(stream.language_code || stream.languageCode || '').toLowerCase());
}

function isStreamLive(matchId, stream) {
  const sourceType = String(stream.source_type || stream.sourceType || 'hls').toLowerCase();
  if (sourceType === 'iframe') return true;
  return statusFor(matchId, stream)?.is_live === true;
}

function render(matchId, streams) {
  const title = streams[0]?.match_title || streams[0]?.matchTitle || streams[0]?.title || 'KingLive broadcast';
  const liveStreams = streams.filter((stream) => isStreamLive(matchId, stream));
  const hasConfigured = streams.length > 0;
  const statusText = liveStreams.length ? 'LIVE' : hasConfigured ? 'WAITING' : 'OFFLINE';
  const sourceCards = liveStreams.map((stream) => `
    <a class="source-card" href="${sourceUrl(matchId, stream)}">
      <div class="source-label">${labelFor(stream)}</div>
      <div class="source-type">${stream.source_type || stream.sourceType || 'hls'}</div>
      <div class="source-action">Open stream</div>
    </a>
  `).join('');

  card.innerHTML = `
    <div class="match-head">
      <div>
        <div class="kicker">${liveStreams.length ? 'Live match' : 'Match stream'}</div>
        <div class="match-title">${title}</div>
      </div>
      <div class="status ${liveStreams.length ? 'status-live' : 'status-waiting'}">${statusText}</div>
    </div>
    ${liveStreams.length ? `<div class="source-grid">${sourceCards}</div>` : '<div class="empty">Stream will appear automatically when OBS starts.</div>'}
  `;
}

function selectEntry(data) {
  const entries = Object.entries(data)
    .map(([matchId, configured]) => [matchId, normalizeStreams(configured)])
    .filter(([, streams]) => streams.length);
  return requestedMatch
    ? entries.find(([matchId]) => matchId === requestedMatch)
    : entries[0];
}

async function loadConfig() {
  const response = await fetch('../streams.json', { cache: 'no-store' });
  lastConfig = await response.json();
}

async function loadStatus() {
  const response = await fetch(STATUS_URL, { cache: 'no-store' });
  lastStatus = await response.json();
}

async function update() {
  if (!lastConfig) await loadConfig();
  await loadStatus();
  const selected = selectEntry(lastConfig);
  if (!selected) {
    card.innerHTML = '<div class="empty">No active streams configured yet.</div>';
    return;
  }
  render(selected[0], selected[1]);
}

async function boot() {
  await loadConfig();
  await update();
  setInterval(() => {
    loadConfig().then(update).catch(() => {
      if (lastConfig) update().catch(() => {});
    });
  }, REFRESH_MS);
}

boot().catch(() => {
  card.innerHTML = '<div class="empty">Could not load stream list.</div>';
});
