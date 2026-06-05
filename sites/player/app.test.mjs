import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const appSource = readFileSync(new URL('./app.js', import.meta.url), 'utf8');

async function runPlayer({ href, config = {}, fetchImpl }) {
  const appended = [];
  let stageHtml = '';
  const controls = { hidden: false };
  const titleEl = { textContent: '' };
  const sourceSelect = {
    hidden: false,
    innerHTML: '',
    value: '0',
    addEventListener() {},
  };
  const copyEmbed = {
    textContent: 'Copy iframe',
    addEventListener() {},
  };
  let chatPinnedHtml = '';
  const chatPinned = {
    hidden: true,
    get innerHTML() {
      return chatPinnedHtml;
    },
    set innerHTML(value) {
      chatPinnedHtml = value;
    },
  };
  const chatPanel = {
    hidden: true,
    setAttribute() {},
  };
  const chatMessages = {
    innerHTML: '',
    scrollHeight: 0,
    scrollTop: 0,
  };
  const chatForm = {
    addEventListener() {},
    querySelector() {
      return null;
    },
  };
  const chatAuthor = {
    value: '',
  };
  const chatMessage = {
    value: '',
  };
  const chatStatus = {
    textContent: '',
  };
  const localStorageStore = new Map();
  const tgPopup = {
    hidden: true,
    innerHTML: '',
    addEventListener() {},
  };
  const stage = {
    get innerHTML() {
      return stageHtml;
    },
    set innerHTML(value) {
      stageHtml = value;
      appended.length = 0;
    },
    appendChild(element) {
      appended.push(element);
    },
  };

  const context = {
    URL,
    URLSearchParams,
    setTimeout,
    window: {
      location: { href, search: new URL(href).search },
      KINGLIVE_PLAYER_CONFIG: {
        apiBase: '',
        defaultLang: 'en',
        defaultRegion: 'global',
        adSlots: {},
        ...config,
      },
      Hls: undefined,
      localStorage: {
        getItem(key) {
          return localStorageStore.has(key) ? localStorageStore.get(key) : null;
        },
        setItem(key, value) {
          localStorageStore.set(key, String(value));
        },
      },
    },
    navigator: {
      clipboard: {
        writeText: () => Promise.resolve(),
      },
    },
    document: {
      getElementById(id) {
        if (id === 'stage') return stage;
        if (id === 'controls') return controls;
        if (id === 'title') return titleEl;
        if (id === 'source-select') return sourceSelect;
        if (id === 'copy-embed') return copyEmbed;
        if (id === 'tg-popup') return tgPopup;
        if (id === 'chat-pinned') return chatPinned;
        if (id === 'chat-panel') return chatPanel;
        if (id === 'chat-messages') return chatMessages;
        if (id === 'chat-form') return chatForm;
        if (id === 'chat-author') return chatAuthor;
        if (id === 'chat-message') return chatMessage;
        if (id === 'chat-status') return chatStatus;
        return null;
      },
      querySelectorAll() {
        return [];
      },
      createElement(tagName) {
        return {
          tagName,
          canPlayType: () => '',
          play: () => Promise.resolve(),
        };
      },
    },
    fetch: fetchImpl,
  };

  vm.runInNewContext(appSource, context);
  await new Promise((resolve) => setImmediate(resolve));

  return {
    appended,
    controls,
    copyEmbed,
    chatPinned,
    sourceSelect,
    stageHtml,
    tgPopup,
    title: titleEl.textContent,
  };
}

test('does not play stream URLs supplied by viewer query params', async () => {
  const result = await runPlayer({
    href: 'https://player.test/?src=https%3A%2F%2Funtrusted.test%2Flive.m3u8&type=hls',
    fetchImpl: () => {
      throw new Error('direct src playback must not fetch match data');
    },
  });

  assert.equal(result.appended.length, 0);
  assert.equal(result.stageHtml, '');
  assert.equal(result.controls.hidden, true);
});

test('plays a match stream configured in config.js', async () => {
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843&lang=en&region=global',
    config: {
      matchStreams: {
        1540843: 'https://trusted.test/live.m3u8',
      },
    },
    fetchImpl: (url) => {
      assert.equal(String(url), '/api/matches/1540843?lang=en&region=global');
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            home_team: { name_en: 'Arsenal' },
            away_team: { name_en: 'Atletico Madrid' },
            streams: [],
          }),
      });
    },
  });

  assert.equal(result.appended.length, 1);
  assert.equal(result.appended[0].tagName, 'video');
  assert.equal(result.appended[0].src, 'https://trusted.test/live.m3u8');
  assert.equal(result.title, 'Configured stream');
  assert.equal(result.copyEmbed.hidden, true);
});

test('plays a match stream configured in streams.json', async () => {
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843&admin=1',
    fetchImpl: (url) => {
      if (String(url).endsWith('/streams.json') || String(url).endsWith('streams.json')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              1540843: {
                url: 'https://trusted.test/from-json.m3u8',
                label: 'JSON stream',
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            home_team: { name_en: 'Arsenal' },
            away_team: { name_en: 'Atletico Madrid' },
            streams: [],
          }),
      });
    },
  });

  assert.equal(result.appended.length, 1);
  assert.equal(result.appended[0].src, 'https://trusted.test/from-json.m3u8');
  assert.equal(result.title, 'JSON stream');
  assert.equal(result.copyEmbed.hidden, false);
});

test('auto-plays the only active stream when no match query is present', async () => {
  const result = await runPlayer({
    href: 'https://player.test/',
    fetchImpl: (url) => {
      if (String(url).endsWith('/streams.json') || String(url).endsWith('streams.json')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              1379275: {
                url: 'https://trusted.test/only-active.m3u8',
                label: 'Only active',
              },
            }),
        });
      }
      assert.equal(String(url), '/api/matches/1379275?lang=en&region=global');
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            home_team: { name_en: 'Manchester City' },
            away_team: { name_en: 'Crystal Palace' },
            streams: [],
          }),
      });
    },
  });

  assert.equal(result.appended.length, 1);
  assert.equal(result.appended[0].src, 'https://trusted.test/only-active.m3u8');
  assert.equal(result.title, 'Only active');
});

test('does not auto-play when multiple active streams are configured without match query', async () => {
  const result = await runPlayer({
    href: 'https://player.test/',
    fetchImpl: (url) => {
      if (String(url).endsWith('/streams.json') || String(url).endsWith('streams.json')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              1: 'https://trusted.test/one.m3u8',
              2: 'https://trusted.test/two.m3u8',
            }),
        });
      }
      throw new Error('match API must not be called without a selected match');
    },
  });

  assert.equal(result.appended.length, 0);
  assert.equal(result.stageHtml, '');
  assert.equal(result.controls.hidden, true);
});

test('renders no public message when a match has no active stream yet', async () => {
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843',
    fetchImpl: () =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            home_team: { name_en: 'Arsenal' },
            away_team: { name_en: 'Atletico Madrid' },
            streams: [],
          }),
      }),
  });

  assert.equal(result.appended.length, 0);
  assert.equal(result.stageHtml, '');
  assert.equal(result.controls.hidden, true);
});

test('rotates Telegram popup channels when tgPopup config is enabled', async () => {
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843',
    config: {
      tgPopup: {
        enabled: true,
        title: 'World Cup Telegram',
        message: 'Join our Telegram channels.',
        buttonLabel: 'Open Telegram',
        urls: ['https://t.me/worldcuppart', 'https://t.me/wolrdcuplive'],
        delayMs: 0,
      },
    },
    fetchImpl: () =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            home_team: { name_en: 'Arsenal' },
            away_team: { name_en: 'Atletico Madrid' },
            streams: [],
          }),
      }),
  });

  assert.equal(result.tgPopup.hidden, false);
  assert.match(result.tgPopup.innerHTML, /World Cup Telegram/);
  assert.match(result.tgPopup.innerHTML, /https:\/\/t\.me\/worldcuppart/);
  assert.doesNotMatch(result.tgPopup.innerHTML, /kinglive_test/);
});

test('renders configured pinned chat message above match chat', async () => {
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843',
    config: {
      chatApiBase: 'https://chat.test/api/chat',
      chatPinned: {
        enabled: true,
        title: 'Pinned offer',
        message: 'Join the match bonus before kickoff.',
        ctaLabel: 'Open bonus',
        url: 'https://offer.test/bonus',
      },
    },
    fetchImpl: (url) => {
      if (String(url).endsWith('/streams.json') || String(url).endsWith('streams.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      }
      if (String(url).startsWith('https://chat.test/api/chat/1540843')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ messages: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            home_team: { name_en: 'Arsenal' },
            away_team: { name_en: 'Atletico Madrid' },
            streams: [],
          }),
      });
    },
  });

  assert.equal(result.chatPinned.hidden, false);
  assert.match(result.chatPinned.innerHTML, /Pinned offer/);
  assert.match(result.chatPinned.innerHTML, /Join the match bonus before kickoff\./);
  assert.match(result.chatPinned.innerHTML, /href="https:\/\/offer\.test\/bonus"/);
  assert.match(result.chatPinned.innerHTML, /Open bonus/);
});
