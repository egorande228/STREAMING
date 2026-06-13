import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { applyDesiredState, normalizeRestream, renderEnvFile } from './restream-sync.mjs';

test('normalizes admin restream into server-side FFmpeg target', () => {
  const item = normalizeRestream(
    {
      match_id: 42,
      slug: 'Fox Sport 1 HD',
      label: 'Fox Sport 1 HD',
      donor_url: 'https://donor.test/live/index.m3u8?token=secret',
      output_url: 'https://hls.livekinglive.win/live/fox-sport-1-hd/index.m3u8',
    },
    {
      publicBaseUrl: 'https://hls.livekinglive.win/live',
      rtmpBaseUrl: 'rtmp://127.0.0.1:1935/live',
    },
  );

  assert.equal(item.slug, 'fox-sport-1-hd');
  assert.equal(item.matchId, 42);
  assert.equal(item.rtmpUrl, 'rtmp://127.0.0.1:1935/live/fox-sport-1-hd');
  assert.equal(item.outputUrl, 'https://hls.livekinglive.win/live/fox-sport-1-hd/index.m3u8');
});

test('renders systemd EnvironmentFile without leaking donor URL in state', () => {
  const item = normalizeRestream(
    {
      match_id: 42,
      slug: 'fox-sport-1-hd',
      label: 'Fox Sport 1 HD',
      donor_url: "https://donor.test/live/index.m3u8?token=a'b",
    },
    {
      publicBaseUrl: 'https://hls.livekinglive.win/live',
      rtmpBaseUrl: 'rtmp://127.0.0.1:1935/live',
    },
  );
  const envFile = renderEnvFile(item);

  assert.match(envFile, /RESTREAM_SLUG='fox-sport-1-hd'/);
  assert.match(envFile, /RESTREAM_INPUT_URL='https:\/\/donor\.test\/live\/index\.m3u8\?token=a'\\''b'/);
  assert.equal(item.donorHash.length, 8);
});

test('applies desired restream state with generated env files and no real systemd calls', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kinglive-restream-test-'));
  const options = {
    configDir: join(root, 'config'),
    stateFile: join(root, 'state.json'),
    systemdPrefix: 'kinglive-restream@',
    publicBaseUrl: 'https://hls.livekinglive.win/live',
    rtmpBaseUrl: 'rtmp://127.0.0.1:1935/live',
    dryRun: false,
    noSystemd: true,
  };
  const state = { managed: {} };

  try {
    const firstActions = await applyDesiredState(
      [
        {
          match_id: 42,
          slug: 'fox-sport-1-hd',
          donor_url: 'https://donor.test/live/fox.m3u8',
          output_url: 'https://hls.livekinglive.win/live/fox-sport-1-hd/index.m3u8',
        },
      ],
      state,
      options,
    );
    assert.deepEqual(firstActions, ['started fox-sport-1-hd']);
    assert.equal(state.managed['fox-sport-1-hd'].donorHash.length, 8);
    const envFile = await readFile(join(root, 'config', 'fox-sport-1-hd.env'), 'utf8');
    assert.match(envFile, /RESTREAM_INPUT_URL='https:\/\/donor\.test\/live\/fox\.m3u8'/);

    const stoppedActions = await applyDesiredState(
      [
        {
          match_id: 42,
          slug: 'fox-sport-1-hd',
          donor_url: 'https://donor.test/live/fox.m3u8',
          desired_state: 'stopped',
        },
      ],
      state,
      options,
    );
    assert.deepEqual(stoppedActions, ['stopped fox-sport-1-hd']);

    const removedActions = await applyDesiredState([], state, options);
    assert.deepEqual(removedActions, ['removed fox-sport-1-hd']);
    assert.deepEqual(state.managed, {});
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
