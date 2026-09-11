import test from 'node:test';
import assert from 'node:assert/strict';
import { planGuideSubscriptions as plan } from './guide-subscription-plan.mjs';
const now = Date.parse('2026-09-12T13:00:00Z');
function fixture(n = 2) {
  return { now, accounts: Array.from({ length: n }, (_, i) => ({ id: `a${i}`, enabled: true, maxConcurrent: 1 })),
    sources: Array.from({ length: n }, (_, i) => ({ accountId: `a${i}`, channel: `bein-ar-${i + 1}`, sourceRef: `channel${i}`, confirmed: true, region: 'MENA' })),
    guide: { source: 'beIN official API', checked_at: now, stale: false, matches: Array.from({ length: n }, (_, i) => ({
      match_id: i + 1, status: 'bein_confirmed', channels: [`bein-ar-${i + 1}`],
      kickoff: '2026-09-12T14:00:00Z', programme_start: '2026-09-12T13:50:00Z', programme_end: '2026-09-12T16:00:00Z',
    })) } };
}
test('two matches select distinct subscriptions and opaque sources without execution', () => {
  const r = plan(fixture()); assert.equal(r.execution_allowed, false);
  assert.deepEqual(r.jobs.map(j => j.accountId), ['a0', 'a1']);
  assert.ok(r.jobs.every(j => j.sourceRef && !j.due));
});
test('four subscriptions support four concurrent matches', () => assert.equal(plan(fixture(4)).jobs.filter(j => j.status === 'planned').length, 4));
test('manual hold reserves subscription indefinitely', () => {
  const f = fixture(); f.reservations = [{ jobId: 'manual', accountId: 'a0', start: now, end: Infinity }];
  assert.equal(plan(f).jobs[0].reason, 'subscription_capacity');
});
test('missing, MAX or unconfirmed mappings never guess an account', () => {
  for (const change of [s => s.region = 'Turkey', s => s.confirmed = false]) {
    const f = fixture(); change(f.sources[0]); assert.equal(plan(f).jobs[0].reason, 'no_confirmed_source');
  }
  const f = fixture(); f.sources = []; assert.ok(plan(f).jobs.every(j => j.reason === 'no_confirmed_source'));
});
test('stale, future timestamp and failed guide cannot allocate', () => {
  for (const changes of [{ checked_at: now - 3600001 }, { checked_at: now + 1 }, { stale: true }, { primary_error: 'timeout' }]) {
    const f = fixture(); Object.assign(f.guide, changes); assert.ok(plan(f).jobs.every(j => j.reason === 'stale_or_failed_guide'));
  }
});
test('missing channel or missing end cannot allocate', () => {
  const f = fixture(); f.guide.matches[0].channels = []; delete f.guide.matches[1].programme_end;
  assert.ok(plan(f).jobs.every(j => j.status === 'blocked'));
});
test('same channel on overlapping games blocks both even with multiple accounts', () => {
  const f = fixture(); f.guide.matches[1].channels = ['bein-ar-1'];
  assert.ok(plan(f).jobs.every(j => j.reason === 'channel_overlap'));
});
test('duplicate identities and source bindings fail closed', () => {
  const f = fixture(); f.guide.matches[1].match_id = 1; assert.throws(() => plan(f), /duplicate_match/);
  const g = fixture(); g.sources.push(g.sources[0]); assert.throws(() => plan(g), /ambiguous_source/);
});
