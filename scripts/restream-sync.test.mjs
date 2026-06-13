import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { applyDesiredState, findPlaylistChannel, normalizeRestream, renderEnvFile, resolvePlaylistChannel } from './restream-sync.mjs';

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

test('finds a selected channel inside a full m3u playlist', async () => {
  const playlist = [
    '#EXTM3U',
    '#EXTINF:-1 tvg-name="Fox Sport 1 HD",Fox Sport 1 HD',
    'live/fox-sport-1-hd/index.m3u8',
    '#EXTINF:-1 tvg-name="Fox Soccer Plus",Fox Soccer Plus',
    'https://donor.test/live/fox-soccer-plus/index.m3u8',
  ].join('\n');

  const selected = findPlaylistChannel(playlist, 'fox soccer', 'https://donor.test/playlist/all.m3u8');
  assert.equal(selected.title, 'Fox Soccer Plus');
  assert.equal(selected.url, 'https://donor.test/live/fox-soccer-plus/index.m3u8');

  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(playlist, { status: 200 });
  try {
    const item = normalizeRestream(
      {
        match_id: 42,
        slug: 'fox-soccer-plus',
        donor_url: 'https://donor.test/playlist/all.m3u8',
        channel_name: 'Fox Soccer Plus',
      },
      {
        publicBaseUrl: 'https://hls.livekinglive.win/live',
        rtmpBaseUrl: 'rtmp://127.0.0.1:1935/live',
      },
    );
    await resolvePlaylistChannel(item);
    assert.equal(item.resolvedInputUrl, 'https://donor.test/live/fox-soccer-plus/index.m3u8');
    assert.match(renderEnvFile(item), /RESTREAM_CHANNEL_NAME='Fox Soccer Plus'/);
    assert.match(renderEnvFile(item), /RESTREAM_INPUT_URL='https:\/\/donor\.test\/live\/fox-soccer-plus\/index\.m3u8'/);
  } finally {
    globalThis.fetch = previousFetch;
  }
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
