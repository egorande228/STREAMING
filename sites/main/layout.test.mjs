import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { before, test } from 'node:test';

const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
const stylesheet = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const homepage = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const themePath = new URL('./theme.js', import.meta.url);

function runChrome(url, windowSize = '1366,900') {
  return new Promise((resolve, reject) => {
    const child = spawn(
      chromePath,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--dump-dom',
        '--virtual-time-budget=1500',
        `--window-size=${windowSize}`,
        url,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Chrome exited with ${code}: ${stderr}`));
        return;
      }
      resolve(stdout);
    });
  });
}

async function measureRtlMobileLayout() {
  const fixture = `<!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <header class="topbar">
          <div class="frame topbar-inner">
            <a class="brand" href="#"><span class="brand-mark"></span></a>
            <nav class="nav"><a href="#">المباريات</a><a href="#">الأخبار</a></nav>
            <div class="header-actions">
              <div class="theme-switch" data-theme-switch role="group" aria-label="المظهر">
                <button class="theme-option" type="button" data-theme-option="light">فاتح</button>
                <button class="theme-option" type="button" data-theme-option="dark">داكن</button>
              </div>
              <button class="locale" type="button">AR</button>
            </div>
          </div>
        </header>
        <main class="frame page-stack">
          <div class="schedule-controls">
            <div class="match-day-tabs" role="group" aria-label="يوم المباراة">
              <button class="match-day-tab" type="button">الأمس</button>
              <button class="match-day-tab active" type="button">اليوم</button>
              <button class="match-day-tab" type="button">الغد</button>
            </div>
          </div>
          <article class="match-card">
            <div class="match-time">
              <span class="bidi-datetime"><bdi class="bidi-auto" dir="auto">٢٦ أغسطس، ٢١:٠٠</bdi><bdi class="bidi-auto bidi-timezone" dir="auto">غرينتش+٣</bdi></span>
              <small><bdi class="bidi-auto" dir="auto">الدوري الإنجليزي الممتاز</bdi></small>
            </div>
            <div class="match-main">
              <div class="match-teams">
                <span class="team-side"><bdi class="bidi-auto" dir="auto">الهلال FC</bdi></span>
                <bdi class="match-vs match-score bidi-ltr" dir="ltr">2 : 1</bdi>
                <span class="team-side"><bdi class="bidi-auto" dir="auto">Al Nassr النصر</bdi></span>
              </div>
            </div>
          </article>
        </main>
        <pre id="result"></pre>
        <script>
          addEventListener('load', () => {
            const dateNode = document.querySelector('.bidi-datetime .bidi-auto');
            const zoneNode = document.querySelector('.bidi-timezone');
            const date = getComputedStyle(dateNode);
            const zone = getComputedStyle(zoneNode);
            const dateWrapper = getComputedStyle(document.querySelector('.bidi-datetime'));
            const dateRect = dateNode.getBoundingClientRect();
            const zoneRect = zoneNode.getBoundingClientRect();
            const team = getComputedStyle(document.querySelector('.team-side .bidi-auto'));
            const cardRect = document.querySelector('.match-card').getBoundingClientRect();
            const tabsRect = document.querySelector('.match-day-tabs').getBoundingClientRect();
            const tabRects = Array.from(document.querySelectorAll('.match-day-tab')).map((tab) => tab.getBoundingClientRect());
            const tabsStyle = getComputedStyle(document.querySelector('.match-day-tabs'));
            const headerActionsRect = document.querySelector('.header-actions').getBoundingClientRect();
            const themeRect = document.querySelector('.theme-switch').getBoundingClientRect();
            const localeRect = document.querySelector('.locale').getBoundingClientRect();
            const homeRect = document.querySelector('.team-side:first-child .bidi-auto').getBoundingClientRect();
            const scoreRect = document.querySelector('.match-score').getBoundingClientRect();
            const awayRect = document.querySelector('.team-side:last-child .bidi-auto').getBoundingClientRect();
            document.querySelector('#result').textContent = JSON.stringify({
              documentDirection: getComputedStyle(document.documentElement).direction,
              viewportWidth: innerWidth,
              dateDirection: date.direction,
              dateBidi: date.unicodeBidi,
              dateUsesFlexLayout: dateWrapper.display.includes('flex'),
              zoneDirection: zone.direction,
              zoneBidi: zone.unicodeBidi,
              zoneFollowsDateInRtl: zoneRect.right <= dateRect.left + 1,
              teamBidi: team.unicodeBidi,
              homeRightInset: cardRect.right - homeRect.right,
              awayRightInset: cardRect.right - awayRect.right,
              horizontalTeamOrder: homeRect.left >= scoreRect.right && scoreRect.left >= awayRect.right,
              tabsWidth: tabsRect.width,
              tabHeight: tabRects[1].height,
              tabGap: Number.parseFloat(tabsStyle.columnGap),
              tabsMatchCardWidth: Math.abs(tabsRect.width - cardRect.width) <= 1,
              headerContainsThemeAndLocale: themeRect.left >= headerActionsRect.left - 1 && localeRect.right <= headerActionsRect.right + 1,
              headerThemeNextToLocale: Math.abs(themeRect.top - localeRect.top) <= 2,
              horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
            });
          });
        </script>
      </body>
    </html>`;

  const server = createServer((request, response) => {
    if (request.url === '/styles.css') {
      response.writeHead(200, { 'content-type': 'text/css' });
      response.end(stylesheet);
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(fixture);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const { port } = server.address();
    const output = await runChrome(`http://127.0.0.1:${port}/`, '390,844');
    const match = output.match(/<pre id="result">([^<]+)<\/pre>/);
    assert.ok(match, 'browser RTL metrics should be present in dumped DOM');
    return JSON.parse(match[1]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function measureDesktopLayout() {
  const fixture = `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <header class="topbar">
          <div class="frame topbar-inner">
            <a class="brand" href="#"><span class="brand-mark"></span></a>
            <nav class="nav"><a href="#">Schedule</a><a href="#">News</a></nav>
            <div class="header-actions"><button class="locale" type="button">EN</button></div>
          </div>
        </header>
        <main class="frame page-stack">
          <section class="schedule-layout">
            <div class="match-column">
              <div class="match-day-tabs" role="group" aria-label="Match day">
                <button class="match-day-tab" type="button">Yesterday</button>
                <button class="match-day-tab active" type="button">Today</button>
                <button class="match-day-tab" type="button">Tomorrow</button>
              </div>
              <div class="match-list">
                <article class="match-card">
                  <div class="match-time"><span>26 Aug, 21:00</span><small>UEFA Champions League</small></div>
                  <div class="match-main">
                    <div class="match-teams">
                      <span class="team-side"><span class="team-logo empty"></span><span>AEK Athens</span></span>
                      <span class="match-vs">vs</span>
                      <span class="team-side"><span class="team-logo empty"></span><span>Levski Sofia</span></span>
                    </div>
                    <div class="match-meta">Regular season</div>
                  </div>
                  <div class="match-actions"><div class="match-status">Scheduled</div></div>
                </article>
              </div>
            </div>
          </section>
          <section class="news-panel">
            <div class="news-grid">
              <a class="news-card" href="#news-one">
                <span class="news-image empty"></span>
                <span><span class="news-meta">BBC Arabic</span><h3>خبر عربي تجريبي لاختبار عرض البطاقة</h3><p>ملخص قصير للخبر.</p></span>
              </a>
              <a class="news-card" href="#news-two"><span class="news-image empty"></span><span><h3>News two</h3></span></a>
              <a class="news-card" href="#news-three"><span class="news-image empty"></span><span><h3>News three</h3></span></a>
              <a class="sponsor-link" href="#sponsor"><article class="news-card sponsor-news-card"></article></a>
              <a class="news-card" href="#news-four"><span class="news-image empty"></span><span><h3>News four</h3></span></a>
              <a class="news-card" href="#news-five"><span class="news-image empty"></span><span><h3>News five</h3></span></a>
              <a class="news-card" href="#news-six"><span class="news-image empty"></span><span><h3>News six</h3></span></a>
            </div>
          </section>
          <a class="sponsor-link" href="#footer-sponsor">
            <aside class="sponsor-slot sponsor-footer" aria-label="Sponsored"></aside>
          </a>
        </main>
        <aside class="social-dock">
          <div class="social-dock-panel">
            <a class="social-link telegram" href="#telegram">
              <span class="social-mark telegram"><svg viewBox="0 0 24 24"><path d="M2 12h20"/></svg></span>
            </a>
            <button class="social-link disabled facebook social-link-placeholder" type="button" disabled>
              <span class="social-mark facebook"><svg viewBox="0 0 24 24"><path d="M12 2v20"/></svg></span>
            </button>
            <button class="social-link disabled whatsapp social-link-placeholder" type="button" disabled>
              <span class="social-mark whatsapp"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg></span>
            </button>
          </div>
        </aside>
        <pre id="result"></pre>
        <script>
          addEventListener('load', () => {
            const frame = document.querySelector('.frame').getBoundingClientRect();
            const headerFrame = document.querySelector('.topbar-inner').getBoundingClientRect();
            const feed = document.querySelector('.match-column').getBoundingClientRect();
            const tabs = document.querySelector('.match-day-tabs').getBoundingClientRect();
            const tab = document.querySelector('.match-day-tab').getBoundingClientRect();
            const tabsStyle = getComputedStyle(document.querySelector('.match-day-tabs'));
            const home = document.querySelector('.team-side:first-child > span:last-child').getBoundingClientRect();
            const away = document.querySelector('.team-side:last-child > span:last-child').getBoundingClientRect();
            const versus = document.querySelector('.match-vs').getBoundingClientRect();
            const newsCard = document.querySelector('.news-card:not(.sponsor-news-card)').getBoundingClientRect();
            const newsPanel = document.querySelector('.news-panel').getBoundingClientRect();
            const footer = document.querySelector('.sponsor-footer').getBoundingClientRect();
            const socialLinks = Array.from(document.querySelectorAll('.social-link')).map((item) => item.getBoundingClientRect());
            const socialMarks = Array.from(document.querySelectorAll('.social-mark')).map((item) => item.getBoundingClientRect());
            const socialIcons = Array.from(document.querySelectorAll('.social-mark svg')).map((item) => item.getBoundingClientRect());
            const socialStyle = getComputedStyle(document.querySelector('.social-link.telegram'));
            const socialRgb = socialStyle.backgroundColor.match(/[\\d.]+/g).map(Number);
            document.querySelector('#result').textContent = JSON.stringify({
              viewportWidth: innerWidth,
              frameWidth: frame.width,
              frameCenter: frame.left + frame.width / 2,
              headerFrameWidth: headerFrame.width,
              headerFrameCenter: headerFrame.left + headerFrame.width / 2,
              feedWidth: feed.width,
              feedCenter: feed.left + feed.width / 2,
              tabsWidth: tabs.width,
              tabHeight: tab.height,
              tabGap: Number.parseFloat(tabsStyle.columnGap),
              homeGap: versus.left - home.right,
              awayGap: away.left - versus.right,
              newsCardWidth: newsCard.width,
              newsPanelWidth: newsPanel.width,
              newsPanelCenter: newsPanel.left + newsPanel.width / 2,
              footerWidth: footer.width,
              footerCenter: footer.left + footer.width / 2,
              socialLinkWidths: socialLinks.map((item) => item.width),
              socialLinkHeights: socialLinks.map((item) => item.height),
              socialMarkWidths: socialMarks.map((item) => item.width),
              socialIconWidths: socialIcons.map((item) => item.width),
              socialIconHeights: socialIcons.map((item) => item.height),
              socialRed: socialRgb[0],
              socialBlue: socialRgb[2],
              horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
            });
          });
        </script>
      </body>
    </html>`;

  const server = createServer((request, response) => {
    if (request.url === '/styles.css') {
      response.writeHead(200, { 'content-type': 'text/css' });
      response.end(stylesheet);
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(fixture);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const { port } = server.address();
    const output = await runChrome(`http://127.0.0.1:${port}/`);
    const match = output.match(/<pre id="result">([^<]+)<\/pre>/);
    assert.ok(match, 'browser layout metrics should be present in dumped DOM');
    return JSON.parse(match[1]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function measureHomepageFirstScreen() {
  const kickoff = new Date();
  kickoff.setHours(18, 0, 0, 0);
  const configSource = `window.KINGLIVE_MAIN_CONFIG = ${JSON.stringify({
    apiBase: '',
    defaultLocale: 'en',
    adSlots: {},
    manualMatchesOnly: true,
    manualMatches: [
      {
        id: 9001,
        scheduled_at: kickoff.toISOString(),
        status: 'scheduled',
        stage: 'Premier League',
        league: { name: 'Premier League' },
        home_team: { name_en: 'Crystal Palace' },
        away_team: { name_en: 'Manchester City' },
      },
    ],
  })};`;
  const probe = `
    <pre id="first-screen-result"></pre>
    <script>
      addEventListener('load', () => {
        const card = document.querySelector('.match-card');
        const hero = document.querySelector('.hero-card');
        const heading = document.querySelector('.section-heading');
        const themeSwitch = document.querySelector('[data-theme-switch]');
        const headerActions = document.querySelector('.header-actions');
        const header = document.querySelector('.topbar');
        const brand = document.querySelector('.brand');
        const locale = document.querySelector('.locale');
        const themeOptions = Array.from(document.querySelectorAll('[data-theme-option]'));
        const tabs = document.querySelector('[data-match-day-tabs]');
        const cardRect = card?.getBoundingClientRect();
        const headingRect = heading?.getBoundingClientRect();
        const themeRect = themeSwitch?.getBoundingClientRect();
        const headerRect = header?.getBoundingClientRect();
        const headerActionsRect = headerActions?.getBoundingClientRect();
        const brandRect = brand?.getBoundingClientRect();
        const localeRect = locale?.getBoundingClientRect();
        const tabsRect = tabs?.getBoundingClientRect();
        document.querySelector('#first-screen-result').textContent = JSON.stringify({
          viewportHeight: innerHeight,
          viewportWidth: innerWidth,
          firstCardTop: cardRect?.top ?? null,
          firstCardVisible: Boolean(cardRect && cardRect.top < innerHeight),
          heroPresent: Boolean(hero),
          themeSwitchPresent: Boolean(themeSwitch),
          homeNavPresent: Boolean(document.querySelector('#nav-home')),
          themeInHeaderActions: Boolean(themeSwitch && headerActions?.contains(themeSwitch)),
          themeNextToLocale: Boolean(themeRect && localeRect && Math.abs(themeRect.top - localeRect.top) <= 2),
          headerContainsActions: Boolean(
            headerRect && headerActionsRect
            && headerActionsRect.left >= headerRect.left - 1
            && headerActionsRect.right <= headerRect.right + 1
          ),
          headerContainsBrand: Boolean(
            headerRect && brandRect
            && brandRect.left >= headerRect.left - 1
            && brandRect.right <= headerRect.right + 1
          ),
          themeOptionsUseIcons: themeOptions.length === 2 && themeOptions.every((button) => (
            button.textContent.trim() === '' && Boolean(button.querySelector('img.theme-icon'))
          )),
          themeInSchedule: Boolean(document.querySelector('.schedule-layout [data-theme-switch]')),
          tabsBelowHeading: Boolean(tabsRect && headingRect && tabsRect.top >= headingRect.bottom - 1),
          tabsMatchCardWidth: Boolean(tabsRect && cardRect && Math.abs(tabsRect.width - cardRect.width) <= 1),
          horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
        });
      });
    </script>`;
  const fixture = homepage
    .replace(/<script async src="https:\/\/www\.googletagmanager\.com[^>]+><\/script>/, '')
    .replace('</body>', `${probe}</body>`);
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xx4WAAAAAElFTkSuQmCC', 'base64');

  const server = createServer((request, response) => {
    const url = String(request.url || '/');
    if (url.startsWith('/styles.css')) {
      response.writeHead(200, { 'content-type': 'text/css' });
      response.end(stylesheet);
      return;
    }
    if (url.startsWith('/app.js')) {
      response.writeHead(200, { 'content-type': 'text/javascript' });
      response.end(appSource);
      return;
    }
    if (url.startsWith('/config.js')) {
      response.writeHead(200, { 'content-type': 'text/javascript' });
      response.end(configSource);
      return;
    }
    if (url.includes('/api/matches')) {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{"matches":[]}');
      return;
    }
    if (url.endsWith('stream.json') || url.includes('/api/')) {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{}');
      return;
    }
    if (/\.(?:png|jpe?g|svg|webp)(?:\?|$)/i.test(url)) {
      response.writeHead(200, { 'content-type': 'image/png' });
      response.end(image);
      return;
    }
    if (/\.(?:js)(?:\?|$)/i.test(url)) {
      response.writeHead(200, { 'content-type': 'text/javascript' });
      response.end('');
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(fixture);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const { port } = server.address();
    const desktopOutput = await runChrome(`http://127.0.0.1:${port}/`, '1280,720');
    const desktopMatch = desktopOutput.match(/<pre id="first-screen-result">([^<]+)<\/pre>/);
    assert.ok(desktopMatch, 'desktop homepage metrics should be present in dumped DOM');
    const mobileOutput = await runChrome(`http://127.0.0.1:${port}/?lang=ar`, '390,844');
    const mobileMatch = mobileOutput.match(/<pre id="first-screen-result">([^<]+)<\/pre>/);
    assert.ok(mobileMatch, 'mobile homepage metrics should be present in dumped DOM');
    return {
      ...JSON.parse(desktopMatch[1]),
      mobile: JSON.parse(mobileMatch[1]),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function measureThemeBehavior() {
  const fixture = `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script>localStorage.setItem('kinglive_theme', 'light');</script>
        <script src="/theme.js"></script>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <main class="frame page-stack">
          <section class="schedule-layout">
            <div class="match-column">
              <div class="section-heading">
                <div>
                  <h2><span>Upcoming</span> <span>matches</span></h2>
                  <div class="heading-line"></div>
                </div>
              </div>
              <div class="schedule-controls">
                <div class="theme-switch" data-theme-switch role="group" aria-label="Theme">
                  <button class="theme-option" type="button" data-theme-option="light" aria-pressed="false">Light</button>
                  <button class="theme-option" type="button" data-theme-option="dark" aria-pressed="false">Dark</button>
                </div>
                <div class="match-day-tabs" role="group" aria-label="Match day">
                  <button class="match-day-tab" type="button">Yesterday</button>
                  <button class="match-day-tab active" type="button">Today</button>
                  <button class="match-day-tab" type="button">Tomorrow</button>
                </div>
              </div>
              <article class="match-card">
                <div class="match-time">26 Aug, 21:00</div>
                <div class="match-main"><div class="match-teams">Crystal Palace <span class="match-vs">vs</span> Manchester City</div></div>
                <div class="match-actions"><div class="match-status">Scheduled</div></div>
              </article>
            </div>
          </section>
        </main>
        <pre id="result"></pre>
        <script>
          addEventListener('load', () => {
            const root = document.documentElement;
            const light = document.querySelector('[data-theme-option="light"]');
            const dark = document.querySelector('[data-theme-option="dark"]');
            const bodyStyle = getComputedStyle(document.body);
            const cardStyle = getComputedStyle(document.querySelector('.match-card'));
            const headingStyle = getComputedStyle(document.querySelector('.section-heading h2 span'));
            const initial = {
              theme: root.dataset.theme || null,
              lightPressed: light?.getAttribute('aria-pressed') || null,
              bodyBackground: bodyStyle.backgroundColor,
              bodyColor: bodyStyle.color,
              cardBackground: cardStyle.backgroundColor,
              headingColor: headingStyle.color,
            };
            dark?.click();
            document.querySelector('#result').textContent = JSON.stringify({
              initial,
              switchedTheme: root.dataset.theme || null,
              darkPressed: dark?.getAttribute('aria-pressed') || null,
              storedTheme: localStorage.getItem('kinglive_theme'),
            });
          });
        </script>
      </body>
    </html>`;

  const server = createServer((request, response) => {
    if (request.url === '/styles.css') {
      response.writeHead(200, { 'content-type': 'text/css' });
      response.end(stylesheet);
      return;
    }
    if (request.url === '/theme.js') {
      response.writeHead(200, { 'content-type': 'text/javascript' });
      response.end(existsSync(themePath) ? readFileSync(themePath, 'utf8') : '');
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(fixture);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const { port } = server.address();
    const output = await runChrome(`http://127.0.0.1:${port}/`, '1280,720');
    const match = output.match(/<pre id="result">([^<]+)<\/pre>/);
    assert.ok(match, 'theme behavior metrics should be present in dumped DOM');
    return JSON.parse(match[1]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function rgbChannels(value) {
  return (String(value).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
}

function contrastRatio(first, second) {
  const luminance = (channels) => {
    const [red, green, blue] = channels.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
  };
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

let layout;
let rtlLayout;
let homepageLayout;
let themeBehavior;

before(async () => {
  if (!chromePath) return;
  layout = await measureDesktopLayout();
  rtlLayout = await measureRtlMobileLayout();
  homepageLayout = await measureHomepageFirstScreen();
  themeBehavior = await measureThemeBehavior();
});

test('homepage exposes the first match card within a 720px desktop viewport', { skip: !chromePath }, () => {
  assert.equal(
    homepageLayout.firstCardVisible,
    true,
    `first match started at ${homepageLayout.firstCardTop}px in a ${homepageLayout.viewportHeight}px viewport`,
  );
});

test('public header removes Home and groups theme control beside language', { skip: !chromePath }, () => {
  assert.equal(homepageLayout.themeSwitchPresent, true, 'homepage should expose a public theme control');
  assert.equal(homepageLayout.homeNavPresent, false, 'Home should not duplicate the logo link');
  assert.equal(homepageLayout.themeInHeaderActions, true, 'theme control should live in the header action group');
  assert.equal(homepageLayout.themeNextToLocale, true, 'theme control should align beside language');
  assert.equal(homepageLayout.themeOptionsUseIcons, true, 'theme choices should use icons without visible text labels');
  assert.equal(homepageLayout.themeInSchedule, false, 'schedule should only contain its date controls');
  assert.equal(homepageLayout.tabsBelowHeading, true, 'date controls should remain below Upcoming matches');
  assert.equal(rtlLayout.headerContainsThemeAndLocale, true, 'RTL mobile header actions should stay inside the header');
  assert.equal(rtlLayout.headerThemeNextToLocale, true, 'RTL mobile theme control should align beside language');
});

test('desktop news feeds keep consistent compact card widths', { skip: !chromePath }, () => {
  assert.ok(
    layout.newsCardWidth >= 319.5 && layout.newsCardWidth <= 320.5,
    `desktop news card was ${layout.newsCardWidth}px wide`,
  );
});

test('stored light theme applies before interaction and a manual dark choice persists', { skip: !chromePath }, () => {
  const background = rgbChannels(themeBehavior.initial.bodyBackground);
  const foreground = rgbChannels(themeBehavior.initial.bodyColor);
  const card = rgbChannels(themeBehavior.initial.cardBackground);
  const heading = rgbChannels(themeBehavior.initial.headingColor);
  assert.equal(themeBehavior.initial.theme, 'light');
  assert.equal(themeBehavior.initial.lightPressed, 'true');
  assert.ok(background.every((channel) => channel >= 220), `light page background was ${themeBehavior.initial.bodyBackground}`);
  assert.ok(foreground.every((channel) => channel <= 70), `light page text was ${themeBehavior.initial.bodyColor}`);
  assert.ok(card.every((channel) => channel >= 220), `light card background was ${themeBehavior.initial.cardBackground}`);
  assert.ok(
    contrastRatio(heading, background) >= 4.5,
    `light gold text contrast was too low: ${themeBehavior.initial.headingColor} on ${themeBehavior.initial.bodyBackground}`,
  );
  assert.equal(themeBehavior.switchedTheme, 'dark');
  assert.equal(themeBehavior.darkPressed, 'true');
  assert.equal(themeBehavior.storedTheme, 'dark');
});

test('desktop match feed stays centered and no wider than 980px', { skip: !chromePath }, () => {
  assert.ok(layout.frameWidth > layout.feedWidth, 'hero shell should remain wider than the match feed');
  assert.ok(layout.feedWidth <= 980.5, `match feed was ${layout.feedWidth}px wide`);
  assert.ok(Math.abs(layout.frameCenter - layout.feedCenter) <= 1, 'match feed should stay centered in the shell');
});

test('desktop header, news, and footer stay inside the centered 1180px shell', { skip: !chromePath }, () => {
  for (const [label, width, center] of [
    ['header', layout.headerFrameWidth, layout.headerFrameCenter],
    ['news', layout.newsPanelWidth, layout.newsPanelCenter],
    ['footer', layout.footerWidth, layout.footerCenter],
  ]) {
    assert.ok(width <= 1180.5, `${label} block was ${width}px wide`);
    assert.ok(
      Math.abs(center - (layout.viewportWidth / 2)) <= 1,
      `${label} block was not centered: ${center}px in a ${layout.viewportWidth}px viewport`,
    );
  }
});

test('match day tabs use the compact Fabor spacing rhythm', { skip: !chromePath }, () => {
  assert.ok(layout.tabsWidth <= 360.5, `desktop tabs were ${layout.tabsWidth}px wide`);
  assert.ok(layout.tabHeight >= 33 && layout.tabHeight <= 35, `desktop tab height was ${layout.tabHeight}px`);
  assert.ok(layout.tabGap >= 5 && layout.tabGap <= 7, `desktop tab gap was ${layout.tabGap}px`);
  assert.equal(rtlLayout.tabsMatchCardWidth, true, 'mobile tabs should span the match column');
  assert.ok(rtlLayout.tabHeight >= 33 && rtlLayout.tabHeight <= 35, `mobile tab height was ${rtlLayout.tabHeight}px`);
  assert.ok(rtlLayout.tabGap >= 5 && rtlLayout.tabGap <= 7, `mobile tab gap was ${rtlLayout.tabGap}px`);
});

test('desktop team labels stay visually grouped around versus', { skip: !chromePath }, () => {
  assert.ok(layout.homeGap >= 0 && layout.homeGap <= 72, `home team gap was ${layout.homeGap}px`);
  assert.ok(layout.awayGap >= 0 && layout.awayGap <= 72, `away team gap was ${layout.awayGap}px`);
});

test('desktop Telegram action has a distinct blue surface', { skip: !chromePath }, () => {
  assert.ok(layout.socialBlue - layout.socialRed >= 60, 'Telegram surface did not have enough blue contrast');
});

test('desktop social actions are equal 48px icon-only buttons with 40px marks', { skip: !chromePath }, () => {
  assert.equal(layout.socialLinkWidths.length, 3);
  assert.ok(layout.socialLinkWidths.every((width) => width >= 47.5 && width <= 48.5), `social widths were ${layout.socialLinkWidths.join(', ')}`);
  assert.ok(layout.socialLinkHeights.every((height) => height >= 47.5 && height <= 48.5), `social heights were ${layout.socialLinkHeights.join(', ')}`);
  assert.ok(layout.socialMarkWidths.every((width) => width >= 39.5 && width <= 40.5), `social marks were ${layout.socialMarkWidths.join(', ')}`);
});

test('desktop social logos share one 26px size', { skip: !chromePath }, () => {
  assert.deepEqual(layout.socialIconWidths, [26, 26, 26]);
  assert.deepEqual(layout.socialIconHeights, [26, 26, 26]);
});

test('desktop layout does not introduce horizontal scrolling', { skip: !chromePath }, () => {
  assert.ok(layout.horizontalOverflow <= 0, `layout overflowed by ${layout.horizontalOverflow}px`);
});

test('Arabic mobile layout isolates mixed-direction values without horizontal scrolling', { skip: !chromePath }, () => {
  assert.equal(rtlLayout.documentDirection, 'rtl');
  assert.ok(rtlLayout.viewportWidth <= 500, `RTL test viewport was ${rtlLayout.viewportWidth}px wide`);
  assert.equal(rtlLayout.dateDirection, 'rtl');
  assert.equal(rtlLayout.dateBidi, 'isolate');
  assert.equal(rtlLayout.dateUsesFlexLayout, true);
  assert.equal(rtlLayout.zoneDirection, 'rtl');
  assert.equal(rtlLayout.zoneBidi, 'isolate');
  assert.equal(rtlLayout.zoneFollowsDateInRtl, true, 'Arabic timezone should follow the date without reordering it');
  assert.equal(rtlLayout.teamBidi, 'isolate');
  assert.ok(rtlLayout.homeRightInset >= 0, `RTL home team escaped the card by ${-rtlLayout.homeRightInset}px`);
  assert.ok(rtlLayout.awayRightInset > rtlLayout.homeRightInset, 'RTL away team should stay on the opposite side of the score');
  assert.equal(rtlLayout.horizontalTeamOrder, true, 'RTL mobile teams should flank the centered score');
  assert.ok(rtlLayout.horizontalOverflow <= 0, `RTL layout overflowed by ${rtlLayout.horizontalOverflow}px`);
  assert.ok(homepageLayout.mobile.viewportWidth <= 500, `mobile homepage viewport was ${homepageLayout.mobile.viewportWidth}px wide`);
  assert.equal(homepageLayout.mobile.headerContainsActions, true, 'mobile homepage should keep theme and language inside the header');
  assert.equal(homepageLayout.mobile.headerContainsBrand, true, 'mobile homepage should keep the logo inside the header');
  assert.equal(homepageLayout.mobile.tabsMatchCardWidth, true, 'mobile homepage date tabs should span the match card width');
  assert.ok(
    homepageLayout.mobile.horizontalOverflow <= 0,
    `mobile homepage overflowed by ${homepageLayout.mobile.horizontalOverflow}px`,
  );
});
