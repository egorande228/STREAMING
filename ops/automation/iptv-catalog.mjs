import { createHash } from 'node:crypto';

// Private output includes credentials. Only catalogSummary may be logged.
export function parsePlaylist(text, accountId) {
  if (typeof text !== 'string' || text.length > 2_000_000 || !/^account[1-9]\d*$/.test(accountId)) throw Error('invalid_playlist');
  const entries = [], seen = new Set(), profiles = new Set();
  let label = null;
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/).map(l => l.trim())) {
    if (!line) continue;
    if (line.startsWith('#EXTINF:')) {
      if (label !== null) throw Error('missing_entry_url');
      label = line.slice(line.lastIndexOf(',') + 1);
      if (!label || label.length > 200) throw Error('invalid_label');
    } else if (!line.startsWith('#')) {
      if (!label) throw Error('missing_entry_label');
      let u; try { u = new URL(line); } catch { throw Error('invalid_source_url'); }
      if (!['http:', 'https:'].includes(u.protocol)) throw Error('invalid_source_protocol');
      const mac = u.searchParams.get('mac')?.toUpperCase();
      if (!/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac || '')) throw Error('missing_profile');
      profiles.add(mac);
      const normalized = label.normalize('NFKC').replaceAll('⚽', 'O').toUpperCase();
      const number = /BEIN\s+SPORTS\s+([1-4])(?:\s|$)/.exec(normalized)?.[1];
      const foreign = /^(?:US|TR|FR|UK)(?:\s|:|\|)/.test(normalized) || /\bMAX\b/.test(normalized);
      const candidateChannel = number && !foreign ? `bein-ar-${number}` : null;
      const sourceRef = 'src_' + createHash('sha256').update(accountId + '\0' + u.href).digest('hex').slice(0, 24);
      if (!seen.has(sourceRef)) {
        entries.push({ sourceRef, label, candidateChannel, url: u.href, identityConfirmed: false });
        seen.add(sourceRef);
      }
      label = null;
    }
    if (entries.length > 1000) throw Error('playlist_too_large');
  }
  if (label !== null || !entries.length || profiles.size !== 1) throw Error('invalid_profile_catalog');
  return { accountId, maxConcurrent: 1, profile: [...profiles][0], entries };
}

export function buildCatalog(inputs) {
  if (!Array.isArray(inputs) || !inputs.length || inputs.length > 32) throw Error('invalid_accounts');
  const accounts = inputs.map(x => parsePlaylist(x.text, x.accountId));
  if (new Set(accounts.map(a => a.accountId)).size !== accounts.length ||
      new Set(accounts.map(a => a.profile)).size !== accounts.length) throw Error('accounts_not_independent');
  return { schema: 1, mode: 'manual_hold', accounts };
}

export function catalogSummary(catalog) {
  return { schema: catalog.schema, mode: catalog.mode, accounts: catalog.accounts.map(a => ({
    accountId: a.accountId, maxConcurrent: a.maxConcurrent, entries: a.entries.length,
    candidates: Object.fromEntries([1, 2, 3, 4].map(n => [`bein-ar-${n}`, a.entries.filter(e => e.candidateChannel === `bein-ar-${n}`).length])),
    unclassified: a.entries.filter(e => !e.candidateChannel).length,
  })) };
}

// Called before any source connection. A hold applies to the entire subscription,
// not a single channel. No catalogue-name match constitutes identity verification.
export function candidatesForMatch(catalog, { accountId, channel, occupiedAccounts = [] }) {
  if (!Array.isArray(occupiedAccounts) || !/^bein-ar-[1-4]$/.test(channel)) throw Error('invalid_selection');
  if (occupiedAccounts.includes(accountId)) return { status: 'held', candidates: [] };
  const account = catalog.accounts.find(a => a.accountId === accountId);
  if (!account) throw Error('unknown_account');
  const candidates = account.entries.filter(e => e.candidateChannel === channel).map(e => ({
    sourceRef: e.sourceRef, label: e.label, requiresDestinationProbe: true,
    requiresIdentityCheck: e.identityConfirmed !== true,
  }));
  return { status: candidates.length ? 'needs_verification' : 'unavailable', candidates };
}
