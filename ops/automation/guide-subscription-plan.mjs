import { allocateSubscriptions } from './subscription-pool.mjs';

// Read-only bridge. Plans are NOT durable reservations or execution permission.
// sources contain opaque references, never upstream URLs or credentials.
export function planGuideSubscriptions({ guide, accounts, sources, reservations = [], now = Date.now() }) {
  if (!Number.isFinite(now) || !Array.isArray(guide?.matches) || guide.matches.length > 100 ||
      !Array.isArray(sources) || sources.length > 256 || !Array.isArray(accounts)) throw Error('invalid_guide_plan');
  const accountIds = new Set(accounts.map(a => a.id));
  const bindings = new Map();
  for (const s of sources) {
    if (!s || !accountIds.has(s.accountId) || !/^bein-ar-[1-4]$/.test(s.channel) ||
        !/^[a-zA-Z0-9_-]{1,100}$/.test(s.sourceRef)) throw Error('invalid_source_binding');
    const key = `${s.accountId}:${s.channel}`;
    if (bindings.has(key)) throw Error('ambiguous_source_binding');
    bindings.set(key, s);
  }
  const pool = accounts.map(a => ({ ...a, channels: sources.filter(s =>
    s.accountId === a.id && s.confirmed === true && s.region === 'MENA').map(s => s.channel) }));
  const fresh = guide.source === 'beIN official API' && guide.stale === false &&
    !guide.primary_error && Number.isFinite(guide.checked_at) &&
    guide.checked_at <= now && now - guide.checked_at <= 3600000;
  const rejected = [], requests = [], ids = new Set();
  for (const m of guide.matches) {
    const id = String(m.match_id ?? '');
    if (!/^\d+$/.test(id) || ids.has(id)) throw Error('invalid_or_duplicate_match');
    ids.add(id);
    const kickoff = Date.parse(m.kickoff), start = Date.parse(m.programme_start), end = Date.parse(m.programme_end);
    let reason;
    if (!fresh) reason = 'stale_or_failed_guide';
    else if (m.status !== 'bein_confirmed' || m.channels?.length !== 1 || !/^bein-ar-[1-4]$/.test(m.channels[0])) reason = 'unconfirmed_guide_channel';
    else if (![kickoff, start, end].every(Number.isFinite) || start > kickoff || end <= kickoff ||
             kickoff - start > 3600000 || end - start > 6 * 3600000) reason = 'invalid_programme_window';
    else if (end <= now) reason = 'programme_ended';
    if (reason) rejected.push({ id, status: 'blocked', reason });
    else requests.push({ id, channel: m.channels[0], start, end, scheduleFresh: true, channelConfirmed: true });
  }
  // One linear channel cannot carry two different matches concurrently.
  const conflicts = new Set();
  for (const a of requests) for (const b of requests) {
    if (a.id !== b.id && a.channel === b.channel && a.start < b.end && b.start < a.end) conflicts.add(a.id);
  }
  for (const id of conflicts) rejected.push({ id, status: 'blocked', reason: 'channel_overlap' });
  const allocation = allocateSubscriptions(pool, requests.filter(r => !conflicts.has(r.id)), reservations);
  return { mode: 'plan_only', execution_allowed: false, checked_at: now, jobs: [
    ...rejected,
    ...allocation.jobs.map(j => j.status === 'planned' ? {
      ...j, sourceRef: bindings.get(`${j.accountId}:${j.channel}`).sourceRef,
      due: j.start <= now,
    } : j),
  ] };
}
