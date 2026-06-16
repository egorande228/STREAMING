import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { normalizeRestream, renderEnvFile, syncOverlayAssets } from './restream-sync.mjs';

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
    overlay: {
      enabled: true,
      image: 'kinglive_player_leaderboard.png',
      position: 'top-right',
      width: 420,
      height: 120,
      margin: 24,
      x_percent: 72,
      y_percent: 35,
    },
  }, options);

  assert.equal(item.transcodeProfile, 'h264_720p25');
  assert.equal(item.overlayKey, JSON.stringify(item.overlays));
  assert.match(renderEnvFile(item), /RESTREAM_TRANSCODE_PROFILE='h264_720p25'/);
  assert.match(renderEnvFile(item), /RESTREAM_OVERLAY_ENABLED='true'/);
  assert.match(renderEnvFile(item), /RESTREAM_OVERLAY_IMAGE='kinglive_player_leaderboard\.png'/);
  assert.match(renderEnvFile(item), /RESTREAM_OVERLAY_POSITION='top-right'/);
  assert.match(renderEnvFile(item), /RESTREAM_OVERLAY_WIDTH='420'/);
  assert.match(renderEnvFile(item), /RESTREAM_OVERLAY_HEIGHT='120'/);
  assert.match(renderEnvFile(item), /RESTREAM_OVERLAY_MARGIN='24'/);
  assert.match(renderEnvFile(item), /RESTREAM_OVERLAY_X_PERCENT='72'/);
  assert.match(renderEnvFile(item), /RESTREAM_OVERLAY_Y_PERCENT='35'/);
  assert.match(renderEnvFile(item), /RESTREAM_OVERLAY_COUNT='1'/);
  assert.match(renderEnvFile(item), /RESTREAM_OVERLAY_1_IMAGE='kinglive_player_leaderboard\.png'/);
});

test('renders multiple restream overlays into numbered env values', () => {
  const item = normalizeRestream({
    slug: '19609158-es-spanish',
    match_id: 19609158,
    donor_url: 'https://8.hls.gd/ch2222/index.m3u8?token=secret-token',
    overlays: [
      {
        enabled: true,
        image: 'kinglive_player_leaderboard.png',
        position: 'top-right',
        width: 420,
        margin: 24,
      },
      {
        enabled: true,
        image: 'kinglive_top_banner_1554x192.png',
        position: 'bottom-center',
        width: 640,
        height: 80,
        margin: 18,
      },
    ],
  }, options);

  assert.equal(item.overlays.length, 2);
  assert.equal(item.overlay.image, 'kinglive_player_leaderboard.png');
  const envFile = renderEnvFile(item);
  assert.match(envFile, /RESTREAM_OVERLAY_COUNT='2'/);
  assert.match(envFile, /RESTREAM_OVERLAY_1_IMAGE='kinglive_player_leaderboard\.png'/);
  assert.match(envFile, /RESTREAM_OVERLAY_2_IMAGE='kinglive_top_banner_1554x192\.png'/);
  assert.match(envFile, /RESTREAM_OVERLAY_2_POSITION='bottom-center'/);
  assert.match(envFile, /RESTREAM_OVERLAY_2_WIDTH='640'/);
  assert.match(envFile, /RESTREAM_OVERLAY_2_HEIGHT='80'/);
  assert.match(envFile, /RESTREAM_OVERLAY_2_MARGIN='18'/);
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

test('ignores unsupported overlay images', () => {
  const item = normalizeRestream({
    slug: '19609158-es-spanish',
    match_id: 19609158,
    donor_url: 'https://8.hls.gd/ch2222/index.m3u8?token=secret-token',
    overlay: {
      enabled: true,
      image: '../../bad.png',
      position: 'top-right',
    },
  }, options);

  assert.equal(item.overlay, null);
  assert.doesNotMatch(renderEnvFile(item), /RESTREAM_OVERLAY_/);
});

test('syncs uploaded custom overlay PNGs from the API', async () => {
  const previousFetch = globalThis.fetch;
  const overlayDir = await mkdtemp(join(tmpdir(), 'kinglive-overlays-'));
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p94AAAAASUVORK5CYII=';

  globalThis.fetch = async (url, init = {}) => {
    assert.equal(String(url), 'https://kinglive.test/api/restream-overlays');
    assert.equal(init.headers.Authorization, 'Bearer sync-token');
    return new Response(
      JSON.stringify({
        overlays: [
          {
            id: 'custom-match-banner-abc12345.png',
            name: 'Match banner',
            data_base64: pngBase64,
          },
          {
            id: '../../bad.png',
            name: 'Bad',
            data_base64: pngBase64,
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const actions = await syncOverlayAssets({
      overlayApiUrl: 'https://kinglive.test/api/restream-overlays',
      token: 'sync-token',
      overlayDir,
    });
    assert.deepEqual(actions, ['synced overlay custom-match-banner-abc12345.png']);
    const saved = await readFile(join(overlayDir, 'custom-match-banner-abc12345.png'));
    assert.equal(saved[0], 0x89);
    assert.equal(saved[1], 0x50);
    assert.equal(saved[2], 0x4e);
    assert.equal(saved[3], 0x47);
  } finally {
    globalThis.fetch = previousFetch;
    await rm(overlayDir, { recursive: true, force: true });
  }
});
