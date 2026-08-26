import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSegmentCacheKey,
  getAwsUpstreamOrigin,
  normalizeAwsOrigin,
  resolveUpstream,
} from './livekinglive-hls-cdn-worker.js';

const CURRENT_ORIGIN = 'http://vast-origin.livekinglive.win:41799';

test('uses the current origin when no dynamic KV value exists', async () => {
  const origin = await getAwsUpstreamOrigin({ HLS_LOG_KV: { get: async () => null } });
  assert.equal(origin, CURRENT_ORIGIN);
});

test('accepts only the Vast DNS hostname over HTTP', () => {
  assert.equal(normalizeAwsOrigin('http://vast-origin.livekinglive.win:45636'), 'http://vast-origin.livekinglive.win:45636');
  assert.equal(normalizeAwsOrigin('https://vast-origin.livekinglive.win:45636'), null);
  assert.equal(normalizeAwsOrigin('http://example.com:45636'), null);
  assert.equal(normalizeAwsOrigin('http://vast-origin.livekinglive.win:45636/live'), null);
});

test('uses a valid dynamic AWS origin only for /aws paths', async () => {
  const env = { HLS_LOG_KV: { get: async () => 'http://vast-origin.livekinglive.win:45636' } };
  const aws = await resolveUpstream(new URL('https://cdn-hls.livekinglive.win/aws/live/demo/index.m3u8'), env);
  const legacy = await resolveUpstream(new URL('https://cdn-hls.livekinglive.win/live/demo/index.m3u8'), env);

  assert.deepEqual(aws, {
    origin: 'http://vast-origin.livekinglive.win:45636',
    pathname: '/live/demo/index.m3u8',
  });
  assert.deepEqual(legacy, {
    origin: 'https://hls.livekinglive.win',
    pathname: '/live/demo/index.m3u8',
  });
});

test('changes the segment cache key when the Vast origin changes', () => {
  const url = new URL('https://cdn-hls.livekinglive.win/aws/live/demo/segment1.ts');
  const oldKey = buildSegmentCacheKey(url, { origin: CURRENT_ORIGIN });
  const newKey = buildSegmentCacheKey(url, { origin: 'http://vast-origin.livekinglive.win:45636' });

  assert.notEqual(oldKey, newKey);
});
