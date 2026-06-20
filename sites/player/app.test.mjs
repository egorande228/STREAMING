import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const appSource = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const arabicTelegramUrl = 'https://t.me/worldcup_live2026arabia';
const arabicYoutubeUrl =
  'https://www.youtube.com/@%D8%A7%D9%84%D8%B9%D8%A7%D9%84%D9%85%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%D8%A8%D8%B7%D9%88%D9%84%D8%A9%D8%A7%D9%84%D8%B9%D8%A7%D9%84%D9%852026';

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
  const socialDockClasses = new Set(['social-dock']);
  const socialDock = {
    classList: {
      toggle(value) {
        if (socialDockClasses.has(value)) {
          socialDockClasses.delete(value);
          return false;
        }
        socialDockClasses.add(value);
        return true;
      },
    },
  };
  const socialPanel = { innerHTML: '' };
  const socialToggle = {
    attributes: {},
    addEventListener(type, handler) {
      elementListeners.set(`social-toggle:${type}`, handler);
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
  };
  const copyEmbed = {
    textContent: 'Copy iframe',
    addEventListener() {},
  };
  const viewerCount = {
    hidden: true,
    textContent: '',
  };
  const localStorageStore = new Map();
  const stageClasses = new Set(['stage']);
  const documentElementClasses = new Set();
  const managedIntervals = [];
  const defaultSetInterval = (handler, delay) => {
    const id = managedIntervals.length + 1;
    managedIntervals.push({ id, handler, delay });
    return id;
  };
  const defaultClearInterval = (id) => {
    const index = managedIntervals.findIndex((item) => item.id === id);
    if (index >= 0) managedIntervals.splice(index, 1);
  };
  const tgPopup = {
    hidden: true,
    innerHTML: '',
    addEventListener() {},
  };
  const stage = {
    get className() {
      return [...stageClasses].join(' ');
    },
    classList: {
      add(...values) {
        values.forEach((value) => stageClasses.add(value));
      },
      remove(...values) {
        values.forEach((value) => stageClasses.delete(value));
      },
      contains(value) {
        return stageClasses.has(value);
      },
    },
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
  if (!timers.disableStageFullscreen) {
    stage.requestFullscreen = () => {
      timers.stageFullscreenRequested = true;
      return Promise.resolve();
    };
  }
  const makeElement = (tagName) => ({
    tagName,
    className: '',
    hidden: false,
    innerHTML: '',
    textContent: '',
    style: {},
    dataset: {},
    listeners: new Map(),
    offsetHeight: timers.adProbeBlocked ? 0 : 12,
    clientHeight: timers.adProbeBlocked ? 0 : 12,
    remove() {},
    setAttribute(name, value) {
      this[name] = String(value);
    },
    addEventListener(type, handler) {
      this.listeners.set(type, handler);
      elementListeners.set(type, handler);
    },
    click() {
      const handler = this.listeners.get('click');
      if (handler) handler({ preventDefault() {}, stopPropagation() {} });
    },
  });

  const context = {
    URL,
    URLSearchParams,
    setTimeout: timers.setTimeout || setTimeout,
    setInterval: timers.setInterval || defaultSetInterval,
    clearInterval: timers.clearInterval || defaultClearInterval,
    window: {
      location: { href, search: new URL(href).search },
      KINGLIVE_PLAYER_CONFIG: {
        apiBase: '',
        defaultLang: 'en',
        defaultRegion: 'global',
        adSlots: {},
        ...config,
      },
      Hls: timers.Hls,
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
      videojs: timers.videojs,
    },
    navigator: {
      clipboard: {
        writeText: () => Promise.resolve(),
      },
      ...navigatorOverrides,
    },
    document: {
      documentElement: {
        classList: {
          add(...values) {
            values.forEach((value) => documentElementClasses.add(value));
          },
          contains(value) {
            return documentElementClasses.has(value);
          },
        },
      },
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
        if (id === 'viewer-count') return viewerCount;
        if (id === 'tg-popup') return tgPopup;
        return null;
      },
      querySelector(selector) {
        if (selector === '[data-social-dock]') return socialDock;
        if (selector === '[data-social-panel]') return socialPanel;
        if (selector === '[data-social-toggle]') return socialToggle;
        return null;
      },
      querySelectorAll() {
        return [];
      },
      exitFullscreen() {
        timers.stageFullscreenExited = true;
        return Promise.resolve();
      },
      createElement(tagName) {
        if (tagName === 'div' || tagName === 'button' || tagName === 'span') return makeElement(tagName);
        return {
          tagName,
          canPlayType: () => (timers.nativeHlsSupport ? 'probably' : ''),
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
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  return {
    appended,
    bodyChildren,
    controls,
    copyEmbed,
    elementListeners,
    getStageClassName: () => stage.className,
    hasDocumentClass: (value) => documentElementClasses.has(value),
    sourceSelect,
    socialPanel,
    socialToggle,
    stageClassName: stage.className,
    stageHtml,
    tgPopup,
    title: titleEl.textContent,
    viewerCount,
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

  const video = result.appended.find((element) => element.tagName === 'video');
  assert.ok(video);
  assert.equal(video.src, 'https://trusted.test/live.m3u8');
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

  const video = result.appended.find((element) => element.tagName === 'video');
  assert.ok(video);
  assert.equal(video.src, 'https://trusted.test/from-json.m3u8');
  assert.equal(result.title, 'JSON stream');
  assert.equal(result.copyEmbed.hidden, false);
});

test('uses Video.js only for streams explicitly marked as videojs', async () => {
  let videoJsCalled = false;
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843',
    config: {
      matchStreams: {
        1540843: {
          url: 'https://stream.test/live.m3u8',
          source_type: 'videojs',
          label: 'Video.js option',
        },
      },
    },
    timers: {
      videojs: (element, options) => {
        videoJsCalled = true;
        assert.equal(element.tagName, 'video');
        assert.equal(element.crossOrigin, 'anonymous');
        assert.equal(options.html5, undefined);
        assert.equal(options.sources[0].src, 'https://stream.test/live.m3u8');
        return {
          ready(handler) {
            handler();
          },
          play() {
            return Promise.resolve();
          },
          dispose() {},
        };
      },
    },
    fetchImpl: (url) => {
      if (String(url).endsWith('/streams.json') || String(url).endsWith('streams.json')) {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ home_team: { name_en: 'A' }, away_team: { name_en: 'B' } }),
      });
    },
  });

  assert.equal(videoJsCalled, true);
  assert.ok(result.appended.find((element) => element.className.includes('video-js')));
  assert.match(result.getStageClassName(), /stage-videojs/);
  assert.equal(result.appended.some((element) => String(element.className).includes('player-brand-overlay')), false);
  assert.ok(result.appended.find((element) => element.className === 'player-fullscreen-button'));
});

test('uses hls.js without credentials for KingLive HLS streams marked as videojs', async () => {
  const calls = [];
  class MockHls {
    static Events = { MANIFEST_PARSED: 'manifest' };
    static isSupported() {
      return true;
    }
    constructor(options) {
      calls.push({ type: 'options', options });
    }
    loadSource(src) {
      calls.push({ type: 'source', src });
    }
    attachMedia(element) {
      calls.push({ type: 'media', element });
    }
    on() {}
    destroy() {}
  }

  let videoJsCalled = false;
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843',
    config: {
      matchStreams: {
        1540843: {
          url: 'https://hls.livekinglive.win/live/test/index.m3u8',
          source_type: 'videojs',
          label: 'KingLive HLS',
        },
      },
    },
    timers: {
      Hls: MockHls,
      nativeHlsSupport: true,
      videojs: () => {
        videoJsCalled = true;
      },
    },
    fetchImpl: (url) => {
      if (String(url).endsWith('/streams.json') || String(url).endsWith('streams.json')) {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ home_team: { name_en: 'A' }, away_team: { name_en: 'B' } }),
      });
    },
  });

  const video = result.appended.find((element) => element.tagName === 'video');
  assert.equal(videoJsCalled, false);
  assert.equal(video.crossOrigin, 'anonymous');
  assert.equal(video.muted, true);
  assert.equal(calls.find((call) => call.type === 'options').options.xhrSetup, undefined);
  assert.equal(calls.find((call) => call.type === 'source').src, 'https://hls.livekinglive.win/live/test/index.m3u8');
  assert.match(result.getStageClassName(), /stage-videojs/);
  assert.equal(result.appended.some((element) => String(element.className).includes('player-brand-overlay')), false);
  assert.ok(result.appended.find((element) => element.className === 'player-fullscreen-button'));
});

test('uses native iOS HLS master playlist for KingLive HLS streams marked as videojs', async () => {
  let videoJsCalled = false;
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843',
    config: {
      matchStreams: {
        1540843: {
          url: 'https://hls.livekinglive.win/live/test/index.m3u8',
          source_type: 'videojs',
          label: 'KingLive HLS',
        },
      },
    },
    timers: {
      nativeHlsSupport: true,
      videojs: () => {
        videoJsCalled = true;
      },
    },
    navigatorOverrides: {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.0.0 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
    },
    fetchImpl: (url) => {
      if (String(url).startsWith('https://hls.livekinglive.win/')) {
        throw new Error(`unexpected native iOS manifest fetch: ${url}`);
      }
      if (String(url).endsWith('/streams.json') || String(url).endsWith('streams.json')) {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ home_team: { name_en: 'A' }, away_team: { name_en: 'B' } }),
      });
    },
  });

  const video = result.appended.find((element) => element.tagName === 'video');
  assert.equal(videoJsCalled, false);
  assert.equal(video.src, 'https://hls.livekinglive.win/live/test/index.m3u8?cookieCheck=1');
  assert.equal(video.crossOrigin, undefined);
  assert.equal(video.autoplay, true);
  assert.equal(video.muted, true);
  assert.equal(video.playsInline, true);
  assert.equal(video.playsinline, '');
  assert.equal(video['webkit-playsinline'], '');
  assert.match(result.getStageClassName(), /stage-videojs/);
  assert.equal(result.appended.some((element) => String(element.className).includes('player-brand-overlay')), false);
  assert.ok(result.appended.find((element) => element.className === 'player-fullscreen-button'));
});

test('uses native iOS HLS fallback when managed playlist cannot be resolved', async () => {
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843',
    config: {
      matchStreams: {
        1540843: {
          url: 'https://hls.livekinglive.win/live/test/index.m3u8',
          source_type: 'videojs',
          label: 'KingLive HLS',
        },
      },
    },
    timers: {
      nativeHlsSupport: false,
    },
    navigatorOverrides: {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/320.0.0.0 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
    },
    fetchImpl: (url) => {
      if (String(url).startsWith('https://hls.livekinglive.win/')) {
        return Promise.resolve({ ok: false });
      }
      if (String(url).endsWith('/streams.json') || String(url).endsWith('streams.json')) {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ home_team: { name_en: 'A' }, away_team: { name_en: 'B' } }),
      });
    },
  });

  const video = result.appended.find((element) => element.tagName === 'video');
  assert.equal(video.src, 'https://hls.livekinglive.win/live/test/index.m3u8?cookieCheck=1');
  assert.equal(video.crossOrigin, undefined);
  assert.equal(video.muted, true);
  assert.equal(video.playsinline, '');
  assert.equal(video['webkit-playsinline'], '');
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

  assert.ok(result.appended.find((element) => element.tagName === 'video'));
  assert.match(result.sourceSelect.innerHTML, /Manual stream/);
  assert.match(result.sourceSelect.innerHTML, /DAMI tv s1/);
  assert.equal(result.sourceSelect.hidden, false);
});

test('selects requested stream source and enables compact preview mode', async () => {
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843&lang=en&source=11&preview=1',
    config: {
      matchStreams: {
        1540843: [
          {
            id: 10,
            url: 'https://trusted.test/english.m3u8',
            source_type: 'hls',
            label: 'English',
            language_code: 'en',
            priority: 100,
          },
          {
            id: 11,
            url: 'https://trusted.test/spanish.m3u8',
            source_type: 'hls',
            label: 'Spanish',
            language_code: 'es',
            priority: 90,
          },
        ],
      },
    },
    fetchImpl: (url) => {
      assert.equal(String(url), '/api/matches/1540843?lang=en&region=global');
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            home_team: { name_en: 'A' },
            away_team: { name_en: 'B' },
            streams: [],
          }),
      });
    },
  });

  const video = result.appended.find((element) => element.tagName === 'video');
  assert.equal(video.src, 'https://trusted.test/spanish.m3u8');
  assert.equal(result.sourceSelect.value, '1');
  assert.equal(result.hasDocumentClass('player-preview-mode'), true);
});

test('filters source list to the language selected on main', async () => {
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843&lang=es',
    config: {
      matchStreams: {
        1540843: [
          {
            id: 'en-stream',
            url: 'https://trusted.test/english.m3u8',
            source_type: 'hls',
            label: 'English',
            language_code: 'en',
            priority: 100,
          },
          {
            id: 'es-stream',
            url: 'https://trusted.test/spanish.m3u8',
            source_type: 'hls',
            label: 'Spanish',
            language_code: 'es',
            priority: 90,
          },
          {
            id: 'ar-stream',
            url: 'https://trusted.test/arabic.m3u8',
            source_type: 'hls',
            label: 'Arabic',
            language_code: 'ar',
            priority: 80,
          },
        ],
      },
    },
    fetchImpl: (url) => {
      assert.equal(String(url), '/api/matches/1540843?lang=es&region=global');
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            home_team: { name_en: 'A' },
            away_team: { name_en: 'B' },
            streams: [],
          }),
      });
    },
  });

  const video = result.appended.find((element) => element.tagName === 'video');
  assert.equal(video.src, 'https://trusted.test/spanish.m3u8');
  assert.match(result.sourceSelect.innerHTML, /Spanish/);
  assert.doesNotMatch(result.sourceSelect.innerHTML, /English/);
  assert.doesNotMatch(result.sourceSelect.innerHTML, /Arabic/);
  assert.equal(result.sourceSelect.hidden, true);
});

test('renders social contacts for the selected player language', async () => {
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843&lang=ar',
    config: {
      socialLinksByLang: {
        ar: [
          { brand: 'telegram', label: 'Telegram', url: arabicTelegramUrl },
          { brand: 'youtube', label: 'YouTube', url: arabicYoutubeUrl },
        ],
        en: [
          { brand: 'telegram', label: 'Telegram', url: 'https://t.me/worldcuplive_international' },
        ],
      },
      matchStreams: {
        1540843: {
          url: 'https://trusted.test/arabic.m3u8',
          source_type: 'hls',
          label: 'Arabic',
          language_code: 'ar',
        },
      },
    },
    fetchImpl: (url) => {
      assert.equal(String(url), '/api/matches/1540843?lang=ar&region=global');
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            home_team: { name_en: 'A' },
            away_team: { name_en: 'B' },
            streams: [],
          }),
      });
    },
  });

  assert.match(result.socialPanel.innerHTML, /worldcup_live2026arabia/);
  assert.match(result.socialPanel.innerHTML, /%D8%A7%D9%84%D8%B9%D8%A7%D9%84%D9%85/);
  assert.doesNotMatch(result.socialPanel.innerHTML, /worldcuplive_international/);
});

test('renders iframe streams with browser sandbox restrictions', async () => {
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
  assert.equal(iframe.sandbox, 'allow-scripts allow-same-origin allow-forms allow-presentation');
});

test('renders KingLive text overlays above iframe streams', async () => {
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

  const overlays = result.appended.filter((element) => String(element.className).includes('player-brand-overlay'));
  assert.equal(overlays.length, 2);
  assert.equal(overlays[0].textContent, 'KINGLIVE');
  assert.equal(overlays[1].textContent, 'KINGLIVE');
  assert.equal(overlays.every((element) => element['aria-hidden'] === 'true'), true);
});

test('stage fullscreen button keeps player overlays inside fullscreen surface', async () => {
  const timers = {};
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843',
    timers,
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

  const fullscreenButton = result.appended.find((element) => element.className === 'player-fullscreen-button');

  assert.ok(fullscreenButton);
  assert.equal(fullscreenButton.type, 'button');
  assert.equal(fullscreenButton['aria-label'], 'Fullscreen');

  fullscreenButton.click();

  assert.equal(timers.stageFullscreenRequested, true);
});

test('stage fullscreen button falls back to viewport mode when native fullscreen is unavailable', async () => {
  const timers = { disableStageFullscreen: true };
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843',
    timers,
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

  const fullscreenButton = result.appended.find((element) => element.className === 'player-fullscreen-button');
  fullscreenButton.click();

  assert.match(result.getStageClassName(), /stage-pseudo-fullscreen/);
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
  assert.equal(iframe.src, 'https://dami-tv.pro/embed/?id=wc/2026-06-12/kor-cze&ch=101');
  assert.equal(iframe.sandbox, 'allow-scripts allow-same-origin allow-forms allow-presentation');
});

test('routes DAMI iframe through embed proxy only when enabled', async () => {
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843',
    config: {
      apiBase: 'https://kinglive-football-api.test',
      damiEmbedProxyEnabled: true,
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
  assert.equal(iframe.src, 'https://kinglive-football-api.test/api/embed-proxy/dami?ch=101');
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

  const video = result.appended.find((element) => element.tagName === 'video');
  assert.ok(video);
  assert.equal(video.src, 'https://trusted.test/only-active.m3u8');
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

test('uses Arabic Telegram channel for Arabic popup language', async () => {
  const result = await runPlayer({
    href: 'https://player.test/?match=1540843&lang=ar',
    config: {
      socialLinksByLang: {
        ar: [
          { brand: 'telegram', label: 'Telegram', url: arabicTelegramUrl },
        ],
        en: [
          { brand: 'telegram', label: 'Telegram', url: 'https://t.me/worldcuplive_international' },
        ],
      },
      tgPopup: {
        enabled: true,
        title: 'World Cup Telegram',
        message: 'Join our Telegram channels.',
        buttonLabel: 'Open Telegram',
        urls: ['https://t.me/worldcuplive_international'],
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
  assert.match(result.tgPopup.innerHTML, /https:\/\/t\.me\/worldcup_live2026arabia/);
  assert.doesNotMatch(result.tgPopup.innerHTML, /worldcuplive_international/);
});

test('sends stable viewer heartbeat for an active match stream', async () => {
  const requests = [];
  const intervals = [];
  const listeners = new Map();
  const beacons = [];
  let heartbeatCount = 0;
  const result = await runPlayer({
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
        heartbeatCount += 1;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, viewers: heartbeatCount }),
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
  assert.equal(result.viewerCount.hidden, false);
  assert.equal(result.viewerCount.textContent, '1 watching');

  const heartbeatTimer = intervals.find((item) => item.delay === 25_000);
  assert.ok(heartbeatTimer);
  await heartbeatTimer.handler();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  const secondHeartbeat = requests.filter((request) => request.url === 'https://kinglive-football-api.test/api/viewers/1540843/heartbeat')[1];
  assert.equal(JSON.parse(secondHeartbeat.init.body).client_id, firstBody.client_id);
  assert.equal(result.viewerCount.textContent, '2 watching');

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

  assert.ok(result.appended.find((element) => element.tagName === 'video'));
  const adblockModal = result.bodyChildren.find((element) => String(element.className).includes('adblock-modal'));
  assert.ok(adblockModal);
  assert.match(adblockModal.innerHTML, /Ad blocker detected/);

  adblockModal.listeners.get('click')({
    target: {
      closest(selector) {
        return selector === '[data-adblock-close]' ? {} : null;
      },
    },
  });
  assert.equal(adblockModal.hidden, true);
  assert.ok(result.appended.find((element) => element.tagName === 'video'));
});
