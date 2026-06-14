import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeRestream, renderEnvFile } from './restream-sync.mjs';

const options = {
  publicBaseUrl: 'https://hls.livekinglive.win/live',
  rtmpBaseUrl: 'rtmp://127.0.0.1:1935/live',
};

test('renders a restream transcode profile into the channel env', () => {
  const item = normalizeRestream({
    slug: '19609158-es-spanish',
    match_id: 19609158,
    donor_url: 'https://8.hls.gd/ch2222/index.m3u8?token=secret-token',
    transcode_profile: 'h264_720p25',
  }, options);

  assert.equal(item.transcodeProfile, 'h264_720p25');
  assert.match(renderEnvFile(item), /RESTREAM_TRANSCODE_PROFILE='h264_720p25'/);
});

test('ignores unsupported restream transcode profiles', () => {
  const item = normalizeRestream({
    slug: '19609158-es-spanish',
    match_id: 19609158,
    donor_url: 'https://8.hls.gd/ch2222/index.m3u8?token=secret-token',
    transcode_profile: 'bad-profile',
  }, options);

  assert.equal(item.transcodeProfile, '');
  assert.doesNotMatch(renderEnvFile(item), /RESTREAM_TRANSCODE_PROFILE/);
});
