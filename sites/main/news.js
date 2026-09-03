(function () {
  const config = window.KINGLIVE_MAIN_CONFIG || {};
  const apiBase = String(config.apiBase || '').replace(/\/$/, '');
  const newsApiUrl = withLimit(config.newsApiUrl || `${apiBase}/api/news?limit=12`, 12);
  const dailyCachePrefix = 'kinglive.daily.v2.no-cyrillic';
  const newsStoryCachePrefix = 'kinglive.news.story.v1';
  const params = new URLSearchParams(window.location.search);
  const article = document.getElementById('news-article');
  const requestedUrl = params.get('url') || '';
  const localeButton = typeof document.querySelector === 'function' ? document.querySelector('.locale') : null;
  const i18n = {
    en: {
      brandTitle: 'News',
      navHome: 'Home',
      navSchedule: 'Schedule',
      navNews: 'News',
      loadingNews: 'Loading news',
      kicker: 'Football pulse',
      notFoundTitle: 'News story not found',
      notFoundLead: 'The story may have moved or expired from the RSS feed.',
      backToNews: 'Back to news',
      fallbackSource: 'Football news',
      fallbackTitle: 'Football news',
      fallbackMetaSource: 'Football',
      noText: 'News text is not available right now.',
      localeCode: 'EN',
      primaryNavigation: 'Primary navigation',
      colorTheme: 'Color theme',
      lightTheme: 'Light',
      darkTheme: 'Dark',
      language: 'Language',
    },
    es: {
      brandTitle: 'Noticias',
      navHome: 'Inicio',
      navSchedule: 'Partidos',
      navNews: 'Noticias',
      loadingNews: 'Cargando noticias',
      kicker: 'Pulso del fútbol',
      notFoundTitle: 'Noticia no encontrada',
      notFoundLead: 'La noticia pudo moverse o expirar en el RSS.',
      backToNews: 'Volver a noticias',
      fallbackSource: 'Noticias de fútbol',
      fallbackTitle: 'Noticias de fútbol',
      fallbackMetaSource: 'Fútbol',
      noText: 'El texto de la noticia no está disponible ahora.',
      localeCode: 'ES',
      primaryNavigation: 'Navegación principal',
      colorTheme: 'Tema de color',
      lightTheme: 'Claro',
      darkTheme: 'Oscuro',
      language: 'Idioma',
    },
    fr: {
      brandTitle: 'Actualités',
      navHome: 'Accueil',
      navSchedule: 'Calendrier',
      navNews: 'Actualités',
      loadingNews: 'Chargement des actualités',
      kicker: 'Pouls du football',
      notFoundTitle: 'Article introuvable',
      notFoundLead: 'L’article a peut-être été déplacé ou a expiré dans le flux RSS.',
      backToNews: 'Retour aux actualités',
      fallbackSource: 'Actualités football',
      fallbackTitle: 'Actualités football',
      fallbackMetaSource: 'Football',
      noText: 'Le texte de l’article n’est pas disponible pour le moment.',
      localeCode: 'FR',
      primaryNavigation: 'Navigation principale',
      colorTheme: 'Thème de couleur',
      lightTheme: 'Clair',
      darkTheme: 'Sombre',
      language: 'Langue',
    },
    ar: {
      brandTitle: 'الأخبار',
      navHome: 'الرئيسية',
      navSchedule: 'المباريات',
      navNews: 'الأخبار',
      loadingNews: 'جارٍ تحميل الأخبار',
      kicker: 'نبض الكرة',
      notFoundTitle: 'الخبر غير موجود',
      notFoundLead: 'قد يكون الخبر نُقل أو انتهت صلاحيته في الـ RSS.',
      backToNews: 'العودة للأخبار',
      fallbackSource: 'أخبار كرة القدم',
      fallbackTitle: 'أخبار كرة القدم',
      fallbackMetaSource: 'كرة القدم',
      noText: 'نص الخبر غير متاح حالياً.',
      localeCode: 'AR',
      primaryNavigation: 'التنقل الرئيسي',
      colorTheme: 'نمط الألوان',
      lightTheme: 'فاتح',
      darkTheme: 'داكن',
      language: 'اللغة',
    },
    mn: {
      brandTitle: 'Мэдээ',
      navHome: 'Нүүр',
      navSchedule: 'Хуваарь',
      navNews: 'Мэдээ',
      loadingNews: 'Мэдээ ачаалж байна',
      kicker: 'Хөлбөмбөгийн хэмнэл',
      notFoundTitle: 'Мэдээ олдсонгүй',
      notFoundLead: 'Мэдээ шилжсэн эсвэл RSS сувгаас устсан байж болзошгүй.',
      backToNews: 'Мэдээ рүү буцах',
      fallbackSource: 'Хөлбөмбөгийн мэдээ',
      fallbackTitle: 'Хөлбөмбөгийн мэдээ',
      fallbackMetaSource: 'Хөлбөмбөг',
      noText: 'Мэдээний текст одоогоор боломжгүй байна.',
      localeCode: 'MN',
      primaryNavigation: 'Үндсэн цэс',
      colorTheme: 'Өнгөний горим',
      lightTheme: 'Цайвар',
      darkTheme: 'Бараан',
      language: 'Хэл',
    },
  };
  const uiLocale = resolveLocale();

  function withLimit(url, limit) {
    try {
      const normalized = new URL(String(url), window.location.href);
      const current = Number(normalized.searchParams.get('limit')) || 0;
      if (current < limit) normalized.searchParams.set('limit', String(limit));
      return normalized.toString();
    } catch {
      return `${apiBase}/api/news?limit=${limit}`;
    }
  }

  function t(key) {
    return i18n[uiLocale]?.[key] ?? i18n.en[key] ?? key;
  }

  function todayLocalKey() {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function buildCacheKey(scope) {
    return `${dailyCachePrefix}:${scope}:${todayLocalKey()}`;
  }

  function readDailyCache(scope) {
    try {
      const raw = window.localStorage?.getItem(buildCacheKey(scope));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.day !== todayLocalKey()) return null;
      return parsed.data ?? null;
    } catch {
      return null;
    }
  }

  function writeDailyCache(scope, data) {
    try {
      window.localStorage?.setItem(
        buildCacheKey(scope),
        JSON.stringify({
          day: todayLocalKey(),
          data,
        }),
      );
    } catch {}
  }

  function readNewsStoryCache(identifier) {
    if (!identifier) return null;
    try {
      const raw = window.localStorage?.getItem(`${newsStoryCachePrefix}:${identifier}`);
      const item = raw ? JSON.parse(raw) : null;
      if (!item || hasRussianNews(item)) return null;
      return item;
    } catch {
      return null;
    }
  }

  function writeNewsStoryCache(item) {
    if (!item || hasRussianNews(item)) return;
    const identifiers = [item.url, item.id].filter(Boolean);
    if (!identifiers.length) return;
    try {
      const payload = JSON.stringify(item);
      identifiers.forEach((identifier) => {
        window.localStorage?.setItem(`${newsStoryCachePrefix}:${identifier}`, payload);
      });
    } catch {}
  }

  function localizedNewsUrl() {
    try {
      const url = new URL(String(newsApiUrl), window.location.href);
      url.searchParams.set('lang', uiLocale);
      return url.toString();
    } catch {
      const fallback = `${apiBase}/api/news?limit=12`;
      return `${fallback}&lang=${encodeURIComponent(uiLocale)}`;
    }
  }

  function resolveLocale() {
    const fromQuery = params.get('lang');
    if (fromQuery === 'en' || fromQuery === 'ar' || fromQuery === 'es' || fromQuery === 'fr' || fromQuery === 'mn') return fromQuery;
    try {
      const stored = window.localStorage?.getItem('kinglive_locale');
      if (stored === 'en' || stored === 'ar' || stored === 'es' || stored === 'fr' || stored === 'mn') return stored;
    } catch {}
    const defaultLocale = String(config.defaultLocale || 'en').toLowerCase();
    if (defaultLocale === 'en' || defaultLocale === 'ar' || defaultLocale === 'es' || defaultLocale === 'fr' || defaultLocale === 'mn') {
      return defaultLocale;
    }
    const language = String((window.navigator && window.navigator.language) || '').toLowerCase();
    if (language.startsWith('fr')) return 'fr';
    if (language.startsWith('es')) return 'es';
    if (language.startsWith('ar')) return 'ar';
    if (language.startsWith('mn')) return 'mn';
    return 'en';
  }

  function setupLocaleButton() {
    if (!localeButton) return;
    const locales = [
      { code: 'en', label: 'ENGLISH', lang: 'en' },
      { code: 'es', label: 'ESPAÑOL', lang: 'es' },
      { code: 'fr', label: 'FRANÇAIS', lang: 'fr' },
      { code: 'ar', label: 'العربية', lang: 'ar', dir: 'rtl' },
      { code: 'mn', label: 'Монгол', lang: 'mn' },
    ];
    const localeFlag = (code) => `<span class="locale-flag locale-flag-${escapeHtml(code)}" aria-hidden="true"></span>`;
    const localeLabel = (item) => `<span class="locale-label" lang="${escapeHtml(item.lang || item.code)}" dir="${escapeHtml(item.dir || 'auto')}">${escapeHtml(item.label)}</span>`;
    const container = localeButton.parentElement;
    const picker = document.createElement('div');
    picker.className = 'locale-picker';
    if (container) {
      container.insertBefore(picker, localeButton);
      picker.appendChild(localeButton);
    }
    const anchor = container ? picker : localeButton.parentElement || localeButton;
    const menu = document.createElement('div');
    menu.className = 'locale-menu';
    menu.hidden = true;
    menu.innerHTML = locales
      .map(
        (item) => `
          <button
            type="button"
            class="locale-option${item.code === uiLocale ? ' active' : ''}"
            data-locale="${item.code}"
            ${item.code === uiLocale ? 'aria-current="true"' : ''}
          >
            ${localeFlag(item.code)}
            ${localeLabel(item)}
          </button>
        `,
      )
      .join('');

    anchor.appendChild(menu);

    localeButton.setAttribute('aria-haspopup', 'menu');
    localeButton.setAttribute('aria-expanded', 'false');
    localeButton.innerHTML = `${localeFlag(uiLocale)}<span>${t('localeCode')}</span><span aria-hidden="true">⌄</span>`;
    const closeMenu = () => {
      menu.hidden = true;
      localeButton.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
      menu.hidden = false;
      localeButton.setAttribute('aria-expanded', 'true');
    };

    localeButton.addEventListener('click', () => {
      if (menu.hidden) openMenu();
      else closeMenu();
    });

    const closestFromTarget = (target, selector) => {
      if (!target) return null;
      if (typeof target.closest === 'function') return target.closest(selector);
      if (target.parentElement && typeof target.parentElement.closest === 'function') {
        return target.parentElement.closest(selector);
      }
      return null;
    };

    menu.addEventListener('click', (event) => {
      const option = closestFromTarget(event.target, '[data-locale]');
      if (!option) return;
      const next = option.dataset.locale;
      closeMenu();
      if (!next || next === uiLocale) return;
      try {
        window.localStorage?.setItem('kinglive_locale', next);
      } catch {}
      const url = new URL(window.location.href);
      url.searchParams.set('lang', next);
      window.location.href = url.toString();
    });

    document.addEventListener('click', (event) => {
      if (menu.hidden) return;
      const insidePicker = closestFromTarget(event.target, '.locale-picker');
      if (insidePicker) return;
      closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
    if (document.documentElement) {
      document.documentElement.lang = uiLocale;
      document.documentElement.dir = uiLocale === 'ar' ? 'rtl' : 'ltr';
    }

    const setText = (id, value) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    };
    setText('brand-title-news', t('brandTitle'));
    setText('nav-home-news', t('navHome'));
    setText('nav-schedule-news', t('navSchedule'));
    setText('nav-news-news', t('navNews'));
    setText('news-kicker', t('kicker'));
    setText('news-loading-title', t('loadingNews'));
    const nav = typeof document.querySelector === 'function' ? document.querySelector('.nav') : null;
    nav?.setAttribute?.('aria-label', t('primaryNavigation'));
    const themeSwitch = typeof document.querySelector === 'function' ? document.querySelector('[data-theme-switch]') : null;
    themeSwitch?.setAttribute?.('aria-label', t('colorTheme'));
    const lightTheme = typeof document.querySelector === 'function' ? document.querySelector('[data-theme-option="light"]') : null;
    lightTheme?.setAttribute?.('aria-label', t('lightTheme'));
    lightTheme?.setAttribute?.('title', t('lightTheme'));
    const darkTheme = typeof document.querySelector === 'function' ? document.querySelector('[data-theme-option="dark"]') : null;
    darkTheme?.setAttribute?.('aria-label', t('darkTheme'));
    darkTheme?.setAttribute?.('title', t('darkTheme'));
    localeButton?.setAttribute?.('aria-label', t('language'));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function hasCyrillic(value) {
    if (uiLocale === 'mn') return false;
    return /[\u0400-\u04FF]/.test(String(value || ''));
  }

  function cleanText(value, fallback = '') {
    if (value == null) return fallback;
    const text = String(value).trim();
    if (!text || hasCyrillic(text)) return fallback;
    return text;
  }

  function sanitizeCyrillic(root = document.body) {
    if (!root) return;
    const textNodes = [];
    if (typeof document.createTreeWalker === 'function') {
      const nodeFilter = window.NodeFilter || { SHOW_TEXT: 4 };
      const textWalker = document.createTreeWalker(root, nodeFilter.SHOW_TEXT);
      while (textWalker.nextNode()) textNodes.push(textWalker.currentNode);
    } else {
      const collectTextNodes = (node) => {
        if (!node) return;
        if (node.nodeType === 3) {
          textNodes.push(node);
          return;
        }
        Array.from(node.childNodes || []).forEach(collectTextNodes);
      };
      collectTextNodes(root);
    }
    textNodes.forEach((node) => {
      if (hasCyrillic(node.nodeValue)) node.nodeValue = '';
    });

    const attrs = ['alt', 'aria-label', 'title', 'placeholder'];
    const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    elements.forEach((element) => {
      attrs.forEach((attr) => {
        const value = element.getAttribute(attr);
        if (hasCyrillic(value)) element.setAttribute(attr, '');
      });
    });
  }

  function installCyrillicGuard() {
    sanitizeCyrillic();
    if (typeof MutationObserver !== 'function') return;
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      const schedule = window.requestAnimationFrame || ((callback) => setTimeout(callback, 0));
      schedule(() => {
        scheduled = false;
        sanitizeCyrillic();
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['alt', 'aria-label', 'title', 'placeholder'],
    });
  }

  function hasRussianNews(item) {
    return hasCyrillic([
      item?.title,
      item?.summary,
      item?.full_text,
      item?.source,
    ].filter(Boolean).join(' '));
  }

  function formatDate(value) {
    try {
      const dateLocales = {
        en: 'en-GB',
        es: 'es-ES',
        fr: 'fr-FR',
        ar: 'ar-SA',
        mn: 'mn-MN',
      };
      return new Intl.DateTimeFormat(dateLocales[uiLocale] || 'en-GB', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/New_York',
        timeZoneName: 'short',
      }).format(new Date(value));
    } catch {
      return value || '';
    }
  }

  function renderMissing() {
    if (!article) return;
    article.innerHTML = `
      <p class="section-kicker">${escapeHtml(t('kicker'))}</p>
      <h1>${escapeHtml(t('notFoundTitle'))}</h1>
      <p class="story-lead">${escapeHtml(t('notFoundLead'))}</p>
      <a class="button primary" href="./#news-title">${escapeHtml(t('backToNews'))}</a>
    `;
    sanitizeCyrillic(article);
  }

  function renderStoryText(item) {
    const sourceText = String(item.full_text || item.summary || '').trim();
    if (!sourceText || hasCyrillic(sourceText)) return `<p class="story-lead">${escapeHtml(t('noText'))}</p>`;

    const parts = sourceText
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return `<p class="story-lead">${escapeHtml(t('noText'))}</p>`;

    const [lead, ...rest] = parts;
    return `
      <p class="story-lead">${escapeHtml(lead)}</p>
      ${rest.map((part) => `<p class="story-paragraph">${escapeHtml(part)}</p>`).join('')}
    `;
  }

  function renderStory(item) {
    if (!article) return;
    const image = item.image_url
      ? `<img class="story-image" src="${escapeHtml(item.image_url)}" alt="" loading="lazy" />`
      : '';
    const title = cleanText(item.title, t('fallbackTitle'));
    document.title = `${title} | KingLive`;
    article.innerHTML = `
      <a class="story-back" href="./#news-title">← ${escapeHtml(t('backToNews'))}</a>
      <p class="section-kicker">${escapeHtml(cleanText(item.source, t('fallbackSource')))}</p>
      <h1>${escapeHtml(title)}</h1>
      <div class="news-meta story-meta">
        <time>${escapeHtml(formatDate(item.published_at))}</time>
      </div>
      ${image}
      ${renderStoryText(item)}
    `;
    sanitizeCyrillic(article);
  }

  async function loadStory() {
    if (!article) return;
    const newsUrl = localizedNewsUrl();
    const scope = `news:${uiLocale}:${newsUrl}`;
    const cachedStory = readNewsStoryCache(requestedUrl);
    try {
      let data = readDailyCache(scope);
      if (!data) {
        const response = await fetch(newsUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error(`News API returned ${response.status}`);
        data = await response.json();
        writeDailyCache(scope, data);
      }
      const news = Array.isArray(data.news) ? data.news : [];
      news.forEach(writeNewsStoryCache);
      const item = news.find((entry) => (entry.url === requestedUrl || entry.id === requestedUrl) && !hasRussianNews(entry)) || cachedStory;
      if (!item) {
        renderMissing();
        return;
      }
      renderStory(item);
    } catch {
      if (cachedStory) {
        renderStory(cachedStory);
        return;
      }
      renderMissing();
    }
  }

  setupLocaleButton();
  installCyrillicGuard();
  loadStory();
})();
