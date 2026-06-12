import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const appSource = readFileSync(new URL('./app.js', import.meta.url), 'utf8');

async function runPlayer({ href, config = {}, fetchImpl, timers = {}, navigatorOverrides = {} }) {
  const appended = [];
  const bodyChildren = [];
  const elementListeners = new Map();
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
  const makeElement = (tagName) => ({
    tagName,
    className: '',
    hidden: false,
    innerHTML: '',
    style: {},
    dataset: {},
    offsetHeight: timers.adProbeBlocked ? 0 : 12,
    clientHeight: timers.adProbeBlocked ? 0 : 12,
    remove() {},
    setAttribute(name, value) {
      this[name] = String(value);
    },
    addEventListener(type, handler) {
      elementListeners.set(type, handler);
    },
  });

  const context = {
    URL,
    URLSearchParams,
    setTimeout: timers.setTimeout || setTimeout,
    setInterval: timers.setInterval || setInterval,
    clearInterval: timers.clearInterval || clearInterval,
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
      addEventListener: timers.addEventListener || (() => {}),
      getComputedStyle: timers.getComputedStyle || (() => ({
        display: timers.adProbeBlocked ? 'none' : 'block',
        visibility: timers.adProbeBlocked ? 'hidden' : 'visible',
      })),
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
      ...navigatorOverrides,
    },
    document: {
      body: {
        appendChild(element) {
          bodyChildren.push(element);
        },
      },
      getElementById(id) {
        if (id === 'stage') return stage;
        if (id === 'controls') return controls;
        if (id === 'title') return titleEl;
        if (id === 'source-select') return sourceSelect;
        if (id === 'copy-embed') return copyEmbed;
        if (id === 'tg-popup') return tgPopup;
        return null;
      },
      querySelectorAll() {
        return [];
      },
      createElement(tagName) {
        if (tagName === 'div') return makeElement(tagName);
        return {
          tagName,
          canPlayType: () => '',
          play: () => Promise.resolve(),
          setAttribute(name, value) {
            this[name] = String(value);
          },
        };
      },
    },
    fetch: fetchImpl,
  };

  vm.runInNewContext(appSource, context);
  await new Promise((resolve) => setImmediate(resolve));

  return {
    appended,
    bodyChildren,
    controls,
    copyEmbed,
    elementListeners,
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

test('merges configured player streams with match API streams', async () => {
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843&lang=en&region=global',
    fetchImpl: (url) => {
      if (String(url).endsWith('/streams.json') || String(url).endsWith('streams.json')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              1540843: {
                url: 'https://trusted.test/manual.m3u8',
                label: 'Manual stream',
              },
            }),
        });
      }
      assert.equal(String(url), '/api/matches/1540843?lang=en&region=global');
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            home_team: { name_en: 'Korea Republic' },
            away_team: { name_en: 'Czech Republic' },
            streams: [
              {
                url: 'https://dami-tv.pro/embed/?id=wc/2026-06-12/kor-cze&ch=101',
                source_type: 'iframe',
                label: 'DAMI tv s1',
                priority: 90,
                is_active: true,
              },
            ],
          }),
      });
    },
  });

  assert.equal(result.appended.length, 1);
  assert.match(result.sourceSelect.innerHTML, /Manual stream/);
  assert.match(result.sourceSelect.innerHTML, /DAMI tv s1/);
  assert.equal(result.sourceSelect.hidden, false);
});

test('sandboxes iframe streams to block popup and top navigation redirects', async () => {
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843',
    config: {
      matchStreams: {
        1540843: {
          url: 'https://third-party.test/embed',
          source_type: 'iframe',
          label: 'Third-party iframe',
        },
      },
    },
    fetchImpl: (url) => {
      if (String(url).endsWith('/streams.json') || String(url).endsWith('streams.json')) {
        return Promise.resolve({ ok: false });
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

  const iframe = result.appended.find((element) => element.tagName === 'iframe');
  assert.ok(iframe);
  assert.match(iframe.sandbox, /allow-scripts/);
  assert.match(iframe.sandbox, /allow-same-origin/);
  assert.doesNotMatch(iframe.sandbox, /allow-popups/);
  assert.doesNotMatch(iframe.sandbox, /allow-top-navigation/);
});

test('keeps DAMI resolver working while click shield blocks ad redirects', async () => {
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843',
    config: {
      matchStreams: {
        1540843: {
          url: 'https://dami-tv.pro/embed/?id=wc/2026-06-12/kor-cze&ch=101',
          source_type: 'iframe',
          label: 'DAMI source',
        },
      },
    },
    fetchImpl: (url) => {
      if (String(url).endsWith('/streams.json') || String(url).endsWith('streams.json')) {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            home_team: { name_en: 'Korea Republic' },
            away_team: { name_en: 'Czech Republic' },
            streams: [],
          }),
      });
    },
  });

  const iframe = result.appended.find((element) => element.tagName === 'iframe');
  const shield = result.appended.find((element) => element.className === 'iframe-click-shield');
  assert.ok(iframe);
  assert.ok(shield);
  assert.match(iframe.sandbox, /allow-scripts/);
  assert.match(iframe.sandbox, /allow-same-origin/);
  assert.doesNotMatch(iframe.sandbox, /allow-popups/);
  assert.doesNotMatch(iframe.sandbox, /allow-top-navigation/);
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

test('sends stable viewer heartbeat for an active match stream', async () => {
  const requests = [];
  const intervals = [];
  const listeners = new Map();
  const beacons = [];
  await runPlayer({
    href: 'https://player.test/?match=1540843&lang=en&region=global',
    config: {
      apiBase: 'https://kinglive-football-api.test',
      matchStreams: {
        1540843: 'https://trusted.test/live.m3u8',
      },
    },
    timers: {
      setInterval(handler, delay) {
        const id = intervals.length + 1;
        intervals.push({ id, handler, delay });
        return id;
      },
      clearInterval() {},
      addEventListener(type, handler) {
        listeners.set(type, handler);
      },
    },
    navigatorOverrides: {
      sendBeacon(url, blob) {
        beacons.push({ url: String(url), blob });
        return true;
      },
    },
    fetchImpl: (url, init = {}) => {
      requests.push({ url: String(url), init });
      if (String(url).endsWith('/streams.json') || String(url).endsWith('streams.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 1540843: 'https://trusted.test/live.m3u8' }),
        });
      }
      if (String(url).includes('/api/viewers/1540843/heartbeat')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, viewers: 1 }),
        });
      }
      if (String(url).includes('/api/streams/active')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ streams: {} }),
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

  const heartbeatRequests = requests.filter((request) => request.url === 'https://kinglive-football-api.test/api/viewers/1540843/heartbeat');
  assert.equal(heartbeatRequests.length, 1);
  assert.equal(heartbeatRequests[0].init.method, 'POST');
  assert.equal(heartbeatRequests[0].init.keepalive, true);
  const firstBody = JSON.parse(heartbeatRequests[0].init.body);
  assert.equal(firstBody.page, 'player');
  assert.equal(typeof firstBody.client_id, 'string');
  assert.equal(firstBody.client_id.length > 0, true);

  const heartbeatTimer = intervals.find((item) => item.delay === 25_000);
  assert.ok(heartbeatTimer);
  await heartbeatTimer.handler();
  const secondHeartbeat = requests.filter((request) => request.url === 'https://kinglive-football-api.test/api/viewers/1540843/heartbeat')[1];
  assert.equal(JSON.parse(secondHeartbeat.init.body).client_id, firstBody.client_id);

  listeners.get('pagehide')();
  assert.equal(beacons.length, 1);
  assert.equal(beacons[0].url, 'https://kinglive-football-api.test/api/viewers/1540843/heartbeat');
});

test('shows adblock modal without clearing the active player stage', async () => {
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843',
    timers: {
      adProbeBlocked: true,
      setInterval() {
        return 1;
      },
      clearInterval() {},
      setTimeout(callback) {
        callback();
        return 1;
      },
    },
    config: {
      matchStreams: {
        1540843: 'https://trusted.test/live.m3u8',
      },
    },
    fetchImpl: (url) => {
      if (String(url).endsWith('streams.json')) {
        return Promise.resolve({ ok: false });
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
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(result.appended.length, 1);
  assert.equal(result.appended[0].tagName, 'video');
  const adblockModal = result.bodyChildren.find((element) => String(element.className).includes('adblock-modal'));
  assert.ok(adblockModal);
  assert.match(adblockModal.innerHTML, /Ad blocker detected/);

  result.elementListeners.get('click')({
    target: {
      closest(selector) {
        return selector === '[data-adblock-close]' ? {} : null;
      },
    },
  });
  assert.equal(adblockModal.hidden, true);
  assert.equal(result.appended.length, 1);
});
