(function () {
  const config = window.KINGLIVE_MAIN_CONFIG || {};
  const apiBase = String(config.apiBase || '').replace(/\/$/, '');
  const apiVersion = 'sportmonks-upcoming-v1';
  const scheduleLookaheadDays = 14;
  const playerBase = String(config.playerBase || '../player').replace(/\/$/, '');
  const streamConfigUrl = config.streamConfigUrl || './stream.json';
  const activeStreamsApiUrl = config.activeStreamsApiUrl || `${apiBase}/api/streams/active`;
  const newsApiUrl = config.newsApiUrl || `${apiBase}/api/news?limit=6`;
  const defaultLocale = config.defaultLocale || 'en';
  const dailyCachePrefix = 'kinglive.daily.v2.no-cyrillic';
  const localeButton = typeof document.querySelector === 'function' ? document.querySelector('.locale') : null;
  const i18n = {
    en: {
      brandTitle: 'Matchday Hub',
      navHome: 'Home',
      navSchedule: 'Schedule',
      navGroups: 'News',
      heroKicker: 'Road to glory',
      heroLine1: 'Follow every',
      heroHighlight: 'World Cup 26',
      heroLine2: 'matchday',
      heroText: 'KingLive keeps fixtures, live entry points, scores and match details in one sharp matchday hub.',
      heroActionMain: 'Match center',
      heroActionGroups: 'News',
      tournamentTitle: 'KingLive World Cup 26',
      tournamentDates: 'June 11 - July 19, 2026',
      scheduleTitlePrefix: 'Upcoming',
      scheduleTitleAccent: 'matches',
      newsKicker: 'Football pulse',
      newsTitlePrefix: 'Latest',
      newsTitleAccent: 'news',
      followBandKicker: 'Legal notice',
      followBandTitle: 'Independent informational website',
      followBandDisclaimer: 'KingLive is operated independently and is not affiliated with, endorsed by, or operated by Melbet. Any trademarks, brand names, logos, advertisements or third-party materials displayed on this website remain the property of their respective owners.',
      carouselPrev: 'Previous news',
      carouselNext: 'Next news',
      carouselControls: 'News carousel controls',
      loadingMatches: 'Loading matches',
      loadingNews: 'Loading football news',
      matchesUnavailable: 'Could not load matches. Check that the backend API is running.',
      newsUnavailable: 'Football news is not available right now.',
      statsAfterKickoff: 'Statistics will appear after kickoff.',
      statsUnavailable: 'Statistics are not available from the API yet.',
      matchEvents: 'Match events',
      teamStatistics: 'Team statistics',
      matchFacts: 'Match facts',
      noMatchEvents: 'Events will appear during the match.',
      possession: 'Possession',
      shotsOnGoal: 'Shots on goal',
      shots: 'Shots',
      corners: 'Corners',
      fouls: 'Fouls',
      yellowCards: 'Yellow cards',
      redCards: 'Red cards',
      wins: 'Wins',
      draws: 'Draws',
      goals: 'Goals',
      worldCup: 'World Cup 26',
      football: 'Football',
      footballNews: 'Football news',
      matchDetails: 'Match details',
      closeMatchDetails: 'Close match details',
      refreshNow: 'Refresh now',
      refreshDetails: 'Refresh details',
      kickoff: 'Kickoff',
      venue: 'Venue',
      city: 'City',
      stage: 'Stage',
      updatedAt: 'Updated',
      watchStream: 'Open player',
      sponsored: 'Sponsored',
      status_live: 'live',
      status_half_time: 'half time',
      status_scheduled: 'scheduled',
      status_finished: 'finished',
      status_postponed: 'postponed',
      localeCode: 'EN',
      localeFlag: '🇬🇧',
    },
    es: {
      brandTitle: 'Centro de partidos',
      navHome: 'Inicio',
      navSchedule: 'Partidos',
      navGroups: 'Noticias',
      heroKicker: 'Camino a la gloria',
      heroLine1: 'Sigue cada',
      heroHighlight: 'Mundial 26',
      heroLine2: 'jornada',
      heroText: 'KingLive reúne calendario, accesos en vivo, marcadores y detalles en un solo hub claro.',
      heroActionMain: 'Centro de partidos',
      heroActionGroups: 'Noticias',
      tournamentTitle: 'KingLive Mundial 26',
      tournamentDates: '11 de junio - 19 de julio, 2026',
      scheduleTitlePrefix: 'Próximos',
      scheduleTitleAccent: 'partidos',
      newsKicker: 'Pulso del fútbol',
      newsTitlePrefix: 'Últimas',
      newsTitleAccent: 'noticias',
      followBandKicker: 'Aviso legal',
      followBandTitle: 'Sitio informativo independiente',
      followBandDisclaimer: 'KingLive opera de forma independiente y no está afiliado, respaldado ni operado por Melbet. Cualquier marca comercial, nombre de marca, logotipo, anuncio o material de terceros mostrado en este sitio pertenece a sus respectivos propietarios.',
      carouselPrev: 'Noticias anteriores',
      carouselNext: 'Noticias siguientes',
      carouselControls: 'Controles del carrusel de noticias',
      loadingMatches: 'Cargando partidos',
      loadingNews: 'Cargando noticias de fútbol',
      matchesUnavailable: 'No se pudieron cargar los partidos. Verifica que el backend API esté activo.',
      newsUnavailable: 'Las noticias de fútbol no están disponibles ahora.',
      statsAfterKickoff: 'Las estadísticas aparecerán tras el inicio del partido.',
      statsUnavailable: 'Las estadísticas aún no están disponibles en la API.',
      matchEvents: 'Eventos del partido',
      teamStatistics: 'Estadísticas del equipo',
      matchFacts: 'Datos del partido',
      noMatchEvents: 'Los eventos aparecerán durante el partido.',
      possession: 'Posesión',
      shotsOnGoal: 'Tiros a puerta',
      shots: 'Tiros',
      corners: 'Córners',
      fouls: 'Faltas',
      yellowCards: 'Tarjetas amarillas',
      redCards: 'Tarjetas rojas',
      wins: 'Victorias',
      draws: 'Empates',
      goals: 'Goles',
      worldCup: 'Mundial 26',
      football: 'Fútbol',
      footballNews: 'Noticias de fútbol',
      matchDetails: 'Detalles del partido',
      closeMatchDetails: 'Cerrar detalles del partido',
      refreshNow: 'Actualizar',
      refreshDetails: 'Actualizar detalles',
      kickoff: 'Inicio',
      venue: 'Estadio',
      city: 'Ciudad',
      stage: 'Fase',
      updatedAt: 'Actualizado',
      watchStream: 'Abrir player',
      status_live: 'en vivo',
      status_half_time: 'descanso',
      status_scheduled: 'programado',
      status_finished: 'finalizado',
      status_postponed: 'pospuesto',
      localeCode: 'ES',
      localeFlag: '🇪🇸',
    },
    fr: {
      brandTitle: 'Centre des matchs',
      navHome: 'Accueil',
      navSchedule: 'Calendrier',
      navGroups: 'Actualités',
      heroKicker: 'Route vers la gloire',
      heroLine1: 'Suivez chaque',
      heroHighlight: 'Coupe du monde 26',
      heroLine2: 'journée',
      heroText: 'KingLive rassemble les calendriers, accès en direct, scores et détails des matchs dans un hub clair.',
      heroActionMain: 'Centre des matchs',
      heroActionGroups: 'Actualités',
      tournamentTitle: 'KingLive Coupe du monde 26',
      tournamentDates: '11 juin - 19 juillet 2026',
      scheduleTitlePrefix: 'Matchs',
      scheduleTitleAccent: 'à venir',
      newsKicker: 'Pouls du football',
      newsTitlePrefix: 'Dernières',
      newsTitleAccent: 'actualités',
      followBandKicker: 'Mention légale',
      followBandTitle: 'Site d’information indépendant',
      followBandDisclaimer: 'KingLive fonctionne de manière indépendante et n’est ni affilié, ni approuvé, ni exploité par Melbet. Les marques, noms, logos, publicités et contenus tiers affichés sur ce site restent la propriété de leurs détenteurs respectifs.',
      carouselPrev: 'Actualités précédentes',
      carouselNext: 'Actualités suivantes',
      carouselControls: 'Contrôles du carrousel d’actualités',
      loadingMatches: 'Chargement des matchs',
      loadingNews: 'Chargement des actualités football',
      matchesUnavailable: 'Impossible de charger les matchs. Vérifiez que l’API backend fonctionne.',
      newsUnavailable: 'Les actualités football ne sont pas disponibles pour le moment.',
      statsAfterKickoff: 'Les statistiques apparaîtront après le coup d’envoi.',
      statsUnavailable: 'Les statistiques ne sont pas encore disponibles depuis l’API.',
      matchEvents: 'Événements du match',
      teamStatistics: 'Statistiques d’équipe',
      matchFacts: 'Faits du match',
      noMatchEvents: 'Les événements apparaîtront pendant le match.',
      possession: 'Possession',
      shotsOnGoal: 'Tirs cadrés',
      shots: 'Tirs',
      corners: 'Corners',
      fouls: 'Fautes',
      yellowCards: 'Cartons jaunes',
      redCards: 'Cartons rouges',
      wins: 'Victoires',
      draws: 'Nuls',
      goals: 'Buts',
      worldCup: 'Coupe du monde 26',
      football: 'Football',
      footballNews: 'Actualités football',
      matchDetails: 'Détails du match',
      closeMatchDetails: 'Fermer les détails du match',
      refreshNow: 'Actualiser',
      refreshDetails: 'Actualiser les détails',
      kickoff: 'Coup d’envoi',
      venue: 'Stade',
      city: 'Ville',
      stage: 'Phase',
      updatedAt: 'Mis à jour',
      watchStream: 'Ouvrir le player',
      status_live: 'en direct',
      status_half_time: 'mi-temps',
      status_scheduled: 'programmé',
      status_finished: 'terminé',
      status_postponed: 'reporté',
      localeCode: 'FR',
      localeFlag: '🇫🇷',
    },
    ar: {
      brandTitle: 'مركز المباريات',
      navHome: 'الرئيسية',
      navSchedule: 'المباريات',
      navGroups: 'الأخبار',
      heroKicker: 'طريق المجد',
      heroLine1: 'تابع كل',
      heroHighlight: 'مباراة في كأس العالم 26',
      heroLine2: 'لحظة بلحظة',
      heroText: 'KingLive يجمع المواعيد، روابط البث، النتائج وتفاصيل المباريات في صفحة واحدة واضحة.',
      heroActionMain: 'مركز المباريات',
      heroActionGroups: 'الأخبار',
      tournamentTitle: 'KingLive كأس العالم 26',
      tournamentDates: '11 يونيو - 19 يوليو 2026',
      scheduleTitlePrefix: 'المباريات',
      scheduleTitleAccent: 'القادمة',
      newsKicker: 'نبض الكرة',
      newsTitlePrefix: 'آخر',
      newsTitleAccent: 'الأخبار',
      followBandKicker: 'إشعار قانوني',
      followBandTitle: 'موقع معلومات مستقل',
      followBandDisclaimer: 'يعمل KingLive بشكل مستقل ولا يرتبط بـ Melbet ولا يتم اعتماده أو تشغيله من قبلها. جميع العلامات التجارية وأسماء العلامات والشعارات والإعلانات ومواد الأطراف الثالثة المعروضة على هذا الموقع مملوكة لأصحابها المعنيين.',
      carouselPrev: 'الأخبار السابقة',
      carouselNext: 'الأخبار التالية',
      carouselControls: 'التحكم في شريط الأخبار',
      loadingMatches: 'جارٍ تحميل المباريات',
      loadingNews: 'جارٍ تحميل أخبار كرة القدم',
      matchesUnavailable: 'تعذر تحميل المباريات. تأكد من تشغيل backend API.',
      newsUnavailable: 'أخبار كرة القدم غير متاحة الآن.',
      statsAfterKickoff: 'ستظهر الإحصاءات بعد بداية المباراة.',
      statsUnavailable: 'الإحصاءات غير متاحة حالياً من الـ API.',
      matchEvents: 'أحداث المباراة',
      teamStatistics: 'إحصاءات الفريقين',
      matchFacts: 'حقائق المباراة',
      noMatchEvents: 'ستظهر الأحداث أثناء المباراة.',
      possession: 'الاستحواذ',
      shotsOnGoal: 'تسديدات على المرمى',
      shots: 'التسديدات',
      corners: 'الركنيات',
      fouls: 'الأخطاء',
      yellowCards: 'بطاقات صفراء',
      redCards: 'بطاقات حمراء',
      wins: 'الانتصارات',
      draws: 'التعادلات',
      goals: 'الأهداف',
      worldCup: 'كأس العالم 26',
      football: 'كرة القدم',
      footballNews: 'أخبار كرة القدم',
      matchDetails: 'تفاصيل المباراة',
      closeMatchDetails: 'إغلاق تفاصيل المباراة',
      refreshNow: 'تحديث',
      refreshDetails: 'تحديث التفاصيل',
      kickoff: 'البداية',
      venue: 'الملعب',
      city: 'المدينة',
      stage: 'المرحلة',
      updatedAt: 'آخر تحديث',
      watchStream: 'فتح المشغل',
      status_live: 'مباشر',
      status_half_time: 'استراحة',
      status_scheduled: 'مجدولة',
      status_finished: 'منتهية',
      status_postponed: 'مؤجلة',
      localeCode: 'AR',
      localeFlag: '🇸🇦',
    },
    mn: {
      brandTitle: 'Тоглолтын төв',
      navHome: 'Нүүр',
      navSchedule: 'Хуваарь',
      navGroups: 'Мэдээ',
      heroKicker: 'Алдрын зам',
      heroLine1: 'Бүх',
      heroHighlight: 'World Cup 26',
      heroLine2: 'тоглолтын өдрийг дага',
      heroText: 'KingLive нь хуваарь, шууд үзэх холбоос, оноо болон тоглолтын дэлгэрэнгүйг нэг тодорхой төвд нэгтгэнэ.',
      heroActionMain: 'Тоглолтын төв',
      heroActionGroups: 'Мэдээ',
      tournamentTitle: 'KingLive World Cup 26',
      tournamentDates: '2026 оны 6 сарын 11 - 7 сарын 19',
      scheduleTitlePrefix: 'Удахгүй болох',
      scheduleTitleAccent: 'тоглолтууд',
      newsKicker: 'Хөлбөмбөгийн хэмнэл',
      newsTitlePrefix: 'Сүүлийн',
      newsTitleAccent: 'мэдээ',
      followBandKicker: 'Хууль эрх зүйн мэдэгдэл',
      followBandTitle: 'Бие даасан мэдээллийн сайт',
      followBandDisclaimer: 'KingLive нь бие даан ажилладаг бөгөөд Melbet-тэй холбоогүй, дэмжигдээгүй, тэдгээрийн ажиллуулдаг сайт биш. Энэ сайтад харагдах аливаа барааны тэмдэг, брэндийн нэр, лого, сурталчилгаа болон гуравдагч талын материал нь тухайн эзэмшигчдийн өмч хэвээр байна.',
      carouselPrev: 'Өмнөх мэдээ',
      carouselNext: 'Дараагийн мэдээ',
      carouselControls: 'Мэдээний каруселийн удирдлага',
      loadingMatches: 'Тоглолтуудыг ачаалж байна',
      loadingNews: 'Хөлбөмбөгийн мэдээ ачаалж байна',
      matchesUnavailable: 'Тоглолтуудыг ачаалж чадсангүй. Backend API ажиллаж байгаа эсэхийг шалгана уу.',
      newsUnavailable: 'Хөлбөмбөгийн мэдээ одоогоор боломжгүй байна.',
      statsAfterKickoff: 'Статистик тоглолт эхэлсний дараа гарна.',
      statsUnavailable: 'Статистик API-аас одоогоор боломжгүй байна.',
      matchEvents: 'Тоглолтын үйл явдал',
      teamStatistics: 'Багийн статистик',
      matchFacts: 'Тоглолтын факт',
      noMatchEvents: 'Үйл явдал тоглолтын үеэр гарна.',
      possession: 'Бөмбөг эзэмшилт',
      shotsOnGoal: 'Хаалга руу цохилт',
      shots: 'Цохилт',
      corners: 'Булангийн цохилт',
      fouls: 'Алдаа',
      yellowCards: 'Шар карт',
      redCards: 'Улаан карт',
      wins: 'Ялалт',
      draws: 'Тэнцээ',
      goals: 'Гоол',
      worldCup: 'World Cup 26',
      football: 'Хөлбөмбөг',
      footballNews: 'Хөлбөмбөгийн мэдээ',
      matchDetails: 'Тоглолтын дэлгэрэнгүй',
      closeMatchDetails: 'Тоглолтын дэлгэрэнгүйг хаах',
      refreshNow: 'Шинэчлэх',
      refreshDetails: 'Дэлгэрэнгүйг шинэчлэх',
      kickoff: 'Эхлэх цаг',
      venue: 'Цэнгэлдэх',
      city: 'Хот',
      stage: 'Шат',
      updatedAt: 'Шинэчлэгдсэн',
      watchStream: 'Тоглуулагч нээх',
      sponsored: 'Ивээн тэтгэсэн',
      status_live: 'шууд',
      status_half_time: 'завсарлага',
      status_scheduled: 'товлогдсон',
      status_finished: 'дууссан',
      status_postponed: 'хойшлогдсон',
      localeCode: 'MN',
      localeFlag: '🇲🇳',
    },
  };
  const uiLocale = resolveLocale();
  const grid = document.getElementById('match-grid');
  const newsGrid = document.getElementById('news-grid');
  const adSlots = config.adSlots || {};
  const sponsorUrl = config.sponsorUrl || 'https://refpa3665.com/L?tag=d_5517121m_66329c_worldcuplive';
  const manualMatches = Array.isArray(config.manualMatches) ? config.manualMatches : [];
  const manualMatchesOnly = config.manualMatchesOnly === true;
  const adSlotKeys = {
    'main-top': 'mainTop',
    'main-hero': 'mainHero',
    'main-hero-mobile': 'mainHeroMobile',
    'main-rail-top': 'mainRailTop',
    'main-rail-tall': 'mainRailTall',
    'main-bottom': 'mainBottom',
  };
  let currentMatches = [];
  let activeStreamMatchIds = new Set();
  const modal = document.createElement('div');
  modal.className = 'match-modal';
  modal.hidden = true;
  document.body.appendChild(modal);

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

  function readDailyCacheEntry(scope) {
    const key = buildCacheKey(scope);
    try {
      const raw = window.localStorage?.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.day !== todayLocalKey()) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function readDailyCache(scope) {
    return readDailyCacheEntry(scope)?.data ?? null;
  }

  function writeDailyCache(scope, data) {
    const key = buildCacheKey(scope);
    try {
      window.localStorage?.setItem(
        key,
        JSON.stringify({
          day: todayLocalKey(),
          data,
          fetched_at: Date.now(),
        }),
      );
    } catch {}
  }

  function clearDailyCacheStartsWith(fragment) {
    try {
      const prefix = `${dailyCachePrefix}:${fragment}`;
      for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(prefix)) window.localStorage.removeItem(key);
      }
    } catch {}
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return response.json();
  }

  async function fetchJsonDaily(scope, url, options = {}) {
    const force = options.force === true;
    const maxAgeMs = Number.isFinite(Number(options.maxAgeMs)) ? Number(options.maxAgeMs) : Infinity;
    const cachedEntry = readDailyCacheEntry(scope);
    const ageMs = cachedEntry?.fetched_at ? Date.now() - Number(cachedEntry.fetched_at) : Infinity;
    if (!force && cachedEntry?.data != null && ageMs <= maxAgeMs) return cachedEntry.data;
    const data = await fetchJson(url);
    writeDailyCache(scope, data);
    return data;
  }

  function addUtcDays(date, days) {
    const next = new Date(`${date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + days);
    return next.toISOString().slice(0, 10);
  }

  function matchCacheMaxAge(matches) {
    const live = Array.isArray(matches) && matches.some((item) => item?.status === 'live' || item?.status === 'half_time');
    return live ? 45_000 : 24 * 60 * 60 * 1000;
  }

  async function fetchMatchesForDate(date, options = {}) {
    const scope = `matches:${date}:${apiVersion}`;
    const cachedEntry = readDailyCacheEntry(scope);
    const cachedMatches = Array.isArray(cachedEntry?.data?.matches) ? cachedEntry.data.matches : [];
    const url = `${apiBase}/api/matches?date=${date}&v=${apiVersion}`;
    const data = await fetchJsonDaily(scope, url, {
      force: options.force,
      maxAgeMs: matchCacheMaxAge(cachedMatches),
    });
    return {
      matches: Array.isArray(data.matches) ? data.matches : [],
      cachedMatches,
    };
  }

  async function fetchScheduleMatches(today, options = {}) {
    const todayResult = await fetchMatchesForDate(today, options);
    if (todayResult.matches.length) return todayResult;

    const upcomingDates = Array.from({ length: scheduleLookaheadDays }, (_, index) => addUtcDays(today, index + 1));
    const upcomingResults = await Promise.all(upcomingDates.map((date) => fetchMatchesForDate(date, options)));
    const upcomingMatches = upcomingResults.flatMap((result) => result.matches);
    const cachedMatches = [
      ...todayResult.cachedMatches,
      ...upcomingResults.flatMap((result) => result.cachedMatches),
    ];

    return {
      matches: upcomingMatches.sort((left, right) => String(left?.scheduled_at || '').localeCompare(String(right?.scheduled_at || ''))),
      cachedMatches,
    };
  }

  function localizedNewsUrl() {
    try {
      const url = new URL(String(newsApiUrl), window.location.href);
      url.searchParams.set('lang', uiLocale === 'ar' ? 'ar' : 'en');
      return url.toString();
    } catch {
      const fallback = `${apiBase}/api/news?limit=6`;
      return `${fallback}&lang=${uiLocale === 'ar' ? 'ar' : 'en'}`;
    }
  }

  function resolveLocale() {
    const fromQuery = new URLSearchParams(window.location.search).get('lang');
    if (fromQuery === 'en' || fromQuery === 'ar' || fromQuery === 'es' || fromQuery === 'fr' || fromQuery === 'mn') return fromQuery;
    try {
      const stored = window.localStorage?.getItem('kinglive_locale');
      if (stored === 'en' || stored === 'ar' || stored === 'es' || stored === 'fr' || stored === 'mn') return stored;
    } catch {}
    const normalizedDefault = String(defaultLocale || 'en').toLowerCase();
    if (normalizedDefault === 'en' || normalizedDefault === 'ar' || normalizedDefault === 'es' || normalizedDefault === 'fr' || normalizedDefault === 'mn') {
      return normalizedDefault;
    }
    const language = String((window.navigator && window.navigator.language) || '').toLowerCase();
    if (language.startsWith('fr')) return 'fr';
    if (language.startsWith('es')) return 'es';
    if (language.startsWith('ar')) return 'ar';
    if (language.startsWith('mn')) return 'mn';
    return 'en';
  }

  function translateStatus(value) {
    return t(`status_${String(value || 'scheduled').toLowerCase()}`);
  }

  function statusBadgeClass(value) {
    const normalized = String(value || 'scheduled').toLowerCase();
    if (normalized === 'half_time') return 'half';
    return normalized;
  }

  function setupLocaleButton() {
    if (!localeButton) return;
    const locales = [
      { code: 'en', flag: '🇬🇧', label: 'English' },
      { code: 'es', flag: '🇪🇸', label: 'Español' },
      { code: 'fr', flag: '🇫🇷', label: 'Français' },
      { code: 'ar', flag: '🇸🇦', label: 'العربية' },
      { code: 'mn', flag: '🇲🇳', label: 'Монгол' },
    ];
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
            <span>${item.flag}</span>
            <span>${item.label}</span>
          </button>
        `,
      )
      .join('');

    anchor.appendChild(menu);

    localeButton.setAttribute('aria-haspopup', 'menu');
    localeButton.setAttribute('aria-expanded', 'false');
    localeButton.innerHTML = `<span>${t('localeFlag')}</span><span>${t('localeCode')}</span><span aria-hidden="true">⌄</span>`;
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
  }

  function localizeInitialCards() {
    if (document.documentElement) {
      document.documentElement.lang = uiLocale;
      document.documentElement.dir = uiLocale === 'ar' ? 'rtl' : 'ltr';
    }
    const setText = (id, value) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    };
    setText('brand-title', t('brandTitle'));
    setText('nav-home', t('navHome'));
    setText('nav-schedule', t('navSchedule'));
    setText('nav-groups', t('navGroups'));
    setText('hero-kicker', t('heroKicker'));
    setText('hero-line-1', t('heroLine1'));
    setText('hero-highlight', t('heroHighlight'));
    setText('hero-line-2', t('heroLine2'));
    setText('hero-text', t('heroText'));
    setText('hero-action-main', t('heroActionMain'));
    setText('hero-action-groups', t('heroActionGroups'));
    setText('tournament-title', t('tournamentTitle'));
    setText('tournament-dates', t('tournamentDates'));
    setText('schedule-title-prefix', t('scheduleTitlePrefix'));
    setText('schedule-title-accent', t('scheduleTitleAccent'));
    setText('news-kicker', t('newsKicker'));
    setText('news-title-prefix', t('newsTitlePrefix'));
    setText('news-title-accent', t('newsTitleAccent'));
    setText('follow-band-kicker', t('followBandKicker'));
    setText('follow-band-title', t('followBandTitle'));
    setText('follow-band-disclaimer', t('followBandDisclaimer'));
    setText('refresh-matches', t('refreshNow'));

    const controls = typeof document.querySelector === 'function' ? document.querySelector('.carousel-controls') : null;
    if (controls) controls.setAttribute('aria-label', t('carouselControls'));
    const prevButton = typeof document.querySelector === 'function' ? document.querySelector('[data-news-scroll="-1"]') : null;
    if (prevButton) prevButton.setAttribute('aria-label', t('carouselPrev'));
    const nextButton = typeof document.querySelector === 'function' ? document.querySelector('[data-news-scroll="1"]') : null;
    if (nextButton) nextButton.setAttribute('aria-label', t('carouselNext'));

    const matchLoadingCard = typeof grid?.querySelector === 'function' ? grid.querySelector('.empty-card') : null;
    if (matchLoadingCard) matchLoadingCard.textContent = t('loadingMatches');
    const newsLoadingCard = typeof newsGrid?.querySelector === 'function' ? newsGrid.querySelector('.empty-card') : null;
    if (newsLoadingCard) newsLoadingCard.textContent = t('loadingNews');
  }

  function playerUrl(params = {}) {
    const url = new URL(playerBase + '/', window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    if (!url.searchParams.has('lang')) url.searchParams.set('lang', defaultLocale);
    return url.toString();
  }

  function setupActiveNav() {
    if (typeof document.querySelectorAll !== 'function') return;
    const links = Array.from(document.querySelectorAll('.nav a[href]'));
    if (!links.length) return;
    const sectionLinks = links
      .map((link) => {
        const hash = link.getAttribute('href') || '';
        return hash.startsWith('#') ? { link, section: document.querySelector(hash) } : null;
      })
      .filter((item) => item?.section);

    const setActive = (activeLink) => {
      links.forEach((link) => {
        const isActive = link === activeLink;
        link.classList.toggle('active', isActive);
        if (isActive) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    };

    const updateFromScroll = () => {
      let activeLink = links[0];
      const threshold = 130;
      sectionLinks.forEach(({ link, section }) => {
        if (section.getBoundingClientRect().top <= threshold) activeLink = link;
      });
      setActive(activeLink);
    };

    links.forEach((link) => {
      link.addEventListener('click', () => setActive(link));
    });

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        updateFromScroll();
      });
    }, { passive: true });
    window.addEventListener('hashchange', updateFromScroll);
    updateFromScroll();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function sponsorLink(content, className = '') {
    const classAttr = className ? ` class="${escapeHtml(className)}"` : '';
    return `<a${classAttr} href="${escapeHtml(sponsorUrl)}" target="_blank" rel="nofollow sponsored noopener">${content}</a>`;
  }

  function hasCyrillic(value) {
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
    if (uiLocale === 'mn') return;
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

  function teamName(team) {
    if (!team) return 'TBD';
    return cleanText(team.name_en, cleanText(team.code, 'TBD'));
  }

  function leagueName(match) {
    return cleanText(match?.league?.name, t('football'));
  }

  function stageName(match) {
    return cleanText(match?.stage, t('worldCup'));
  }

  function placeName(value) {
    return cleanText(value, 'TBD');
  }

  function teamLogo(team) {
    return team?.flag_url || '';
  }

  function renderTeamLogo(team, alt) {
    const logo = teamLogo(team);
    if (!logo) return '<span class="team-logo empty"></span>';
    return `<img class="team-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
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
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/New_York',
        timeZoneName: 'short',
      }).format(new Date(value));
    } catch {
      return value || 'TBD';
    }
  }

  function isStreamActiveNow(stream) {
    if (!stream || stream.is_active === false || stream.isActive === false) return false;
    const startsAt = Date.parse(stream.starts_at || stream.startsAt || '');
    const endsAt = Date.parse(stream.ends_at || stream.endsAt || '');
    const now = Date.now();
    if (!Number.isNaN(startsAt) && now < startsAt) return false;
    if (!Number.isNaN(endsAt) && now > endsAt) return false;
    return true;
  }

  async function fetchLegacyStreamConfigMatchIds() {
    try {
      const data = await fetchJson(streamConfigUrl);
      if (!data || typeof data !== 'object') return new Set();
      if (data.match_id != null && data.is_active !== false) return new Set([String(data.match_id)]);
      const ids = Object.entries(data)
        .filter(([, stream]) => {
          const list = Array.isArray(stream) ? stream : [stream];
          return list.some((item) => (typeof item === 'string' ? Boolean(item) : isStreamActiveNow(item)));
        })
        .map(([matchId]) => String(matchId));
      return new Set(ids);
    } catch {
      return new Set();
    }
  }

  async function fetchActiveStreamMatchIds(options = {}) {
    const scope = `stream-active:${activeStreamsApiUrl}`;
    try {
      const payload = await fetchJsonDaily(scope, activeStreamsApiUrl, {
        force: options.force,
        maxAgeMs: 30_000,
      });
      const idsFromList = Array.isArray(payload?.match_ids) ? payload.match_ids.map((id) => String(id)) : [];
      if (idsFromList.length) return new Set(idsFromList);
      if (payload && typeof payload.streams === 'object' && payload.streams !== null) {
        return new Set(Object.keys(payload.streams));
      }
      throw new Error('invalid_active_streams_payload');
    } catch {
      return fetchLegacyStreamConfigMatchIds();
    }
  }

  function streamEnabledForMatch(match) {
    const matchId = typeof match === 'object' ? match?.id : match;
    if (matchId == null) return false;
    if (activeStreamMatchIds.has(String(matchId))) return true;
    if (match && Array.isArray(match.streams) && match.streams.some((stream) => stream && stream.url)) return true;
    return false;
  }

  function mergeManualMatches(matches) {
    const normalized = manualMatchesOnly ? [] : (Array.isArray(matches) ? [...matches] : []);
    const seenIds = new Set(normalized.map((match) => String(match?.id)));
    manualMatches.forEach((match) => {
      if (!match || match.id == null || seenIds.has(String(match.id))) return;
      normalized.unshift(match);
      seenIds.add(String(match.id));
    });
    return normalized;
  }

  function renderStatsText(stats) {
    const teams = Array.isArray(stats?.team_stats) ? stats.team_stats : (Array.isArray(stats?.teams) ? stats.teams : []);
    if (teams.length < 2) return '';
    const home = teams[0]?.stats || {};
    const away = teams[1]?.stats || {};
    const parts = [];

    if (home.possession && away.possession) parts.push(`${t('possession')} ${displayStatValue('possession', home.possession)} - ${displayStatValue('possession', away.possession)}`);
    if (home.shots_on_goal != null && away.shots_on_goal != null) {
      parts.push(`${t('shotsOnGoal')} ${home.shots_on_goal} - ${away.shots_on_goal}`);
    }
    if (home.total_shots != null && away.total_shots != null) parts.push(`${t('shots')} ${home.total_shots} - ${away.total_shots}`);
    if (home.corners != null && away.corners != null) parts.push(`${t('corners')} ${home.corners} - ${away.corners}`);

    return parts.join(' | ');
  }

  function statValue(value) {
    if (value == null || value === '') return null;
    return String(value);
  }

  function displayStatValue(key, value) {
    const normalized = statValue(value);
    if (normalized == null) return null;
    if (key === 'possession' && !normalized.includes('%')) return `${normalized}%`;
    return normalized;
  }

  function eventIcon(type) {
    const normalized = String(type || '').toLowerCase();
    if (normalized === 'goal' || normalized === 'own_goal') return '⚽';
    if (normalized === 'yellow_card') return 'YC';
    if (normalized === 'red_card') return 'RC';
    if (normalized === 'substitution') return '↔';
    return '•';
  }

  function eventMinute(event) {
    const minute = Number(event?.minute) || 0;
    const extra = Number(event?.extra_minute);
    return Number.isFinite(extra) && extra > 0 ? `${minute}+${extra}'` : `${minute}'`;
  }

  function renderMatchEvents(stats) {
    const events = Array.isArray(stats?.events) ? stats.events : [];
    if (!events.length) {
      return `
        <section class="detail-panel">
          <h4>${escapeHtml(t('matchEvents'))}</h4>
          <p class="detail-empty">${escapeHtml(t('noMatchEvents'))}</p>
        </section>
      `;
    }

    return `
      <section class="detail-panel">
        <h4>${escapeHtml(t('matchEvents'))}</h4>
        <div class="event-list">
          ${events.map((event) => `
            <div class="event-row ${escapeHtml(String(event.team || ''))}">
              <span class="event-minute">${escapeHtml(eventMinute(event))}</span>
              <span class="event-icon">${escapeHtml(eventIcon(event.type))}</span>
              <span class="event-body">
                <strong>${escapeHtml(cleanText(event.player_name, t('football')))}</strong>
                ${event.detail ? `<em>${escapeHtml(cleanText(event.detail, ''))}</em>` : ''}
              </span>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderTeamStats(stats) {
    const teams = Array.isArray(stats?.team_stats) ? stats.team_stats : (Array.isArray(stats?.teams) ? stats.teams : []);
    if (teams.length < 2) return '';
    const home = teams[0]?.stats || {};
    const away = teams[1]?.stats || {};
    const rows = [
      ['possession', t('possession')],
      ['shots_on_goal', t('shotsOnGoal')],
      ['total_shots', t('shots')],
      ['corners', t('corners')],
      ['fouls', t('fouls')],
      ['yellow_cards', t('yellowCards')],
      ['red_cards', t('redCards')],
    ]
      .map(([key, label]) => {
        const homeValue = displayStatValue(key, home[key]);
        const awayValue = displayStatValue(key, away[key]);
        if (homeValue == null && awayValue == null) return '';
        return `
          <div class="stat-row">
            <strong>${escapeHtml(homeValue ?? '0')}</strong>
            <span>${escapeHtml(label)} ${escapeHtml(homeValue ?? '0')} - ${escapeHtml(awayValue ?? '0')}</span>
            <strong>${escapeHtml(awayValue ?? '0')}</strong>
          </div>
        `;
      })
      .filter(Boolean)
      .join('');
    if (!rows) return '';
    return `
      <section class="detail-panel">
        <h4>${escapeHtml(t('teamStatistics'))}</h4>
        <div class="stat-list">${rows}</div>
      </section>
    `;
  }

  function renderMatchFacts(stats) {
    const facts = Array.isArray(stats?.facts) ? stats.facts : [];
    if (!facts.length) return '';
    return `
      <section class="detail-panel">
        <h4>${escapeHtml(t('matchFacts'))}</h4>
        <div class="fact-list">
          ${facts.map((fact) => `
            <article class="fact-row">
              <strong>${escapeHtml(cleanText(fact.title, t('matchFacts')))}</strong>
              <span>${escapeHtml(cleanText(fact.text, ''))}</span>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderMatchDetailPanels(stats) {
    return [
      renderMatchEvents(stats),
      renderTeamStats(stats),
      renderMatchFacts(stats),
    ].filter(Boolean).join('');
  }

  function renderPrematchText(stats) {
    if (!stats || !stats.sample_size) return '';
    return [
      cleanText(stats.label, ''),
      `${t('wins')} ${stats.home?.wins ?? 0} - ${stats.away?.wins ?? 0}`,
      `${t('draws')} ${stats.draws ?? 0}`,
      `${t('goals')} ${stats.home?.goals ?? 0} - ${stats.away?.goals ?? 0}`,
    ].filter(Boolean).join(' | ');
  }

  async function fetchMatchStatsPayload(matchId, options = {}) {
    const scope = `match-stats:${matchId}`;
    const url = `${apiBase}/api/matches/${matchId}/stats`;
    try {
      return await fetchJsonDaily(scope, url, {
        force: options.force,
        maxAgeMs: options.maxAgeMs,
      });
    } catch {
      return null;
    }
  }

  async function fetchMatchStats(matchId, options = {}) {
    const payload = await fetchMatchStatsPayload(matchId, options);
    return renderStatsText(payload);
  }

  async function fetchPrematchStats(match, options = {}) {
    const home = match.home_team?.id || match.home_team?.external_id;
    const away = match.away_team?.id || match.away_team?.external_id;
    if (!home || !away) return '';

    const scope = `match-prematch:${match.id}:${home}:${away}`;
    try {
      const params = new URLSearchParams({ home: String(home), away: String(away) });
      const payload = await fetchJsonDaily(scope, `${apiBase}/api/matches/${match.id}/prematch?${params}`, {
        force: options.force,
        maxAgeMs: options.maxAgeMs,
      });
      return renderPrematchText(payload);
    } catch {
      return '';
    }
  }

  function emptyStatsMessage(match) {
    if (match.status === 'scheduled') return t('statsAfterKickoff');
    return t('statsUnavailable');
  }

  function renderNews(items) {
    if (!newsGrid) return;
    const visibleItems = items.filter((item) => !hasRussianNews(item));
    if (!visibleItems.length) {
      newsGrid.innerHTML = `<article class="empty-card news-empty">${escapeHtml(t('newsUnavailable'))}</article>`;
      sanitizeCyrillic(newsGrid);
      return;
    }

    const cards = visibleItems.map((item) => {
        const image = item.image_url
          ? `<img src="${escapeHtml(item.image_url)}" alt="" loading="lazy" />`
          : '<span class="news-image empty"></span>';
        const href = `./news.html?url=${encodeURIComponent(item.url || item.id || '')}`;
        return `
          <a class="news-card" href="${escapeHtml(href)}">
            <div class="news-image">${image}</div>
            <div>
              <div class="news-meta">
                <time>${escapeHtml(formatDate(item.published_at))}</time>
              </div>
              <h3>${escapeHtml(cleanText(item.title, t('footballNews')))}</h3>
              <p>${escapeHtml(cleanText(item.summary, ''))}</p>
            </div>
          </a>
        `;
      });

    if (cards.length > 2) {
      cards.splice(2, 0, renderNewsSponsorCard());
    } else {
      cards.push(renderNewsSponsorCard());
    }

    newsGrid.innerHTML = cards.join('');
    sanitizeCyrillic(newsGrid);
  }

  function renderNewsSponsorCard() {
    return sponsorLink(`
      <article class="news-card sponsor-news-card" aria-label="${escapeHtml(t('sponsored'))}">
        <picture>
          <source media="(max-width: 760px)" srcset="../banners/news_card_280x180_mockup_original.png" />
          <source media="(max-width: 1100px)" srcset="../banners/news_card_320x200_mockup_original.png" />
          <img src="../banners/news_card_360x220_mockup_original.png" width="358" height="213" alt="${escapeHtml(t('sponsored'))}" loading="lazy" />
        </picture>
      </article>
    `, 'sponsor-link');
  }

  function renderNewsSkeleton(count = 3) {
    if (!newsGrid) return;
    newsGrid.innerHTML = Array.from({ length: count })
      .map(
        () => `
          <article class="news-card skeleton-card" aria-hidden="true">
            <div class="news-image skeleton-block"></div>
            <div>
              <div class="news-meta skeleton-meta">
                <span class="skeleton-inline w-40"></span>
              </div>
              <h3 class="skeleton-text"><span class="skeleton-inline w-92"></span></h3>
              <p class="skeleton-text"><span class="skeleton-inline w-84"></span></p>
            </div>
          </article>
        `,
      )
      .join('');
  }

  async function loadNews() {
    if (!newsGrid) return;
    renderNewsSkeleton();
    const scope = `news:${uiLocale}:${localizedNewsUrl()}`;
    try {
      const data = await fetchJsonDaily(scope, localizedNewsUrl());
      renderNews(Array.isArray(data.news) ? data.news : []);
    } catch {
      renderNews([]);
    }
  }

  function renderMatches(matches) {
    if (!grid) return;
    currentMatches = matches;
    if (!matches.length) {
      grid.innerHTML = `<article class="empty-card">${escapeHtml(t('matchesUnavailable'))}</article>`;
      return;
    }

    const cards = matches.map((match) => {
        const home = teamName(match.home_team);
        const away = teamName(match.away_team);
        const title = `${home} vs ${away}`;
        const status = String(match.status || 'scheduled');
        const hasStream = streamEnabledForMatch(match);
        const displayStatus = hasStream && status !== 'finished' ? 'live' : status;
        const isLive = displayStatus === 'live' || displayStatus === 'half_time';
        const isFinished = status === 'finished';
        const badgeClass = statusBadgeClass(displayStatus);
        const centerLabel = isFinished ? `${match.home_score ?? 0} : ${match.away_score ?? 0}` : 'vs';
        const href = hasStream ? playerUrl({ match: match.id, title }) : '';
        return `
          <article class="match-card" data-match-id="${escapeHtml(match.id)}" role="button" tabindex="0">
            <div class="match-time">
              <span>${escapeHtml(formatDate(match.scheduled_at))}</span>
              <small>${escapeHtml(leagueName(match))}</small>
            </div>
            <div class="match-main">
              <div class="match-teams" aria-label="${escapeHtml(title)}">
                <span class="team-side">${renderTeamLogo(match.home_team, home)}<span>${escapeHtml(home)}</span></span>
                <span class="match-vs${isFinished ? ' match-score' : ''}">${escapeHtml(centerLabel)}</span>
                <span class="team-side">${renderTeamLogo(match.away_team, away)}<span>${escapeHtml(away)}</span></span>
              </div>
              <div class="match-title">${escapeHtml(title)}</div>
              <div class="match-meta">${escapeHtml(stageName(match))}</div>
            </div>
            <div class="match-actions">
              <div class="match-status ${isLive ? 'live' : ''} ${badgeClass}">${escapeHtml(translateStatus(displayStatus))}</div>
              ${href ? `<a class="stream-button match-stream-button" href="${href}">${escapeHtml(t('watchStream'))}</a>` : ''}
            </div>
          </article>
        `;
      });

    if (cards.length > 5) {
      cards.splice(5, 0, renderMatchSponsorCard());
    }

    grid.innerHTML = cards.join('');
    sanitizeCyrillic(grid);
  }

  function renderMatchSponsorCard() {
    return sponsorLink(`
      <aside class="match-sponsor sponsor-slot" aria-label="${escapeHtml(t('sponsored'))}">
        <picture>
          <img src="../banners/melbet_banner_1870x245_safe_player.png" width="1870" height="245" alt="${escapeHtml(t('sponsored'))}" loading="lazy" />
        </picture>
      </aside>
    `, 'sponsor-link match-sponsor-link');
  }

  function renderMatchSkeleton(count = 5) {
    if (!grid) return;
    currentMatches = [];
    grid.innerHTML = Array.from({ length: count })
      .map(
        () => `
          <article class="match-card skeleton-card" aria-hidden="true">
            <div class="match-time"><span class="skeleton-inline w-84"></span><small class="skeleton-inline w-52"></small></div>
            <div class="match-main">
              <div class="match-teams skeleton-text"><span class="skeleton-inline w-88"></span></div>
              <div class="match-title skeleton-inline w-40"></div>
              <div class="match-meta skeleton-inline w-52"></div>
            </div>
            <div class="match-actions">
              <div class="match-status skeleton-pill"></div>
            </div>
          </article>
        `,
      )
      .join('');
  }

  async function openMatchDetails(matchId, options = {}) {
    const match = currentMatches.find((item) => String(item.id) === String(matchId));
    if (!match) return;

    const home = teamName(match.home_team);
    const away = teamName(match.away_team);
    const title = `${home} vs ${away}`;
    const status = String(match.status || 'scheduled');
    const hasStream = streamEnabledForMatch(match);
    const displayStatus = hasStream && status !== 'finished' ? 'live' : status;
    const isLive = displayStatus === 'live' || displayStatus === 'half_time';
    const badgeClass = statusBadgeClass(displayStatus);
    const href = hasStream ? playerUrl({ match: match.id, title }) : '';
    const isLiveStatus = displayStatus === 'live' || displayStatus === 'half_time';
    const matchStats = await fetchMatchStatsPayload(match.id, {
      force: options.force,
      maxAgeMs: isLiveStatus ? 30_000 : 24 * 60 * 60 * 1000,
    });
    const liveStatsText = renderStatsText(matchStats);
    const statsText = liveStatsText || (match.status === 'scheduled'
      ? await fetchPrematchStats(match, { force: options.force, maxAgeMs: 24 * 60 * 60 * 1000 })
      : '');

    modal.hidden = false;
    modal.innerHTML = `
      <div class="match-modal-backdrop" data-modal-close></div>
      <article class="match-detail" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <button class="detail-close" type="button" data-modal-close aria-label="${escapeHtml(t('closeMatchDetails'))}">×</button>
        <p class="section-kicker">${escapeHtml(t('matchDetails'))}</p>
        <div class="detail-head">
          <div>
            <div class="match-time">${escapeHtml(formatDate(match.scheduled_at))}</div>
            <h3>
              ${renderTeamLogo(match.home_team, home)}
              <span>${escapeHtml(title)}</span>
              ${renderTeamLogo(match.away_team, away)}
            </h3>
            <div class="match-meta">${escapeHtml(cleanText(match.league?.name, cleanText(match.stage, t('football'))))}</div>
          </div>
          <div class="match-status ${isLive ? 'live' : ''} ${badgeClass}">${escapeHtml(translateStatus(displayStatus))}</div>
        </div>
        <div class="detail-scoreboard" aria-label="${escapeHtml(title)} score">
          <div class="detail-team">
            ${renderTeamLogo(match.home_team, home)}
            <span>${escapeHtml(home)}</span>
          </div>
          <div class="detail-score">${escapeHtml(match.home_score ?? 0)} : ${escapeHtml(match.away_score ?? 0)}</div>
          <div class="detail-team away">
            <span>${escapeHtml(away)}</span>
            ${renderTeamLogo(match.away_team, away)}
          </div>
        </div>
        <div class="match-stats detail-meta-lines">
          <div>${escapeHtml(t('kickoff'))}: ${escapeHtml(formatDate(match.scheduled_at))}</div>
          <div>${escapeHtml(t('stage'))}: ${escapeHtml(stageName(match))}</div>
          <div>${escapeHtml(t('venue'))}: ${escapeHtml(placeName(match.venue))}</div>
          <div>${escapeHtml(t('city'))}: ${escapeHtml(placeName(match.city))}</div>
        </div>
        <div class="detail-statline">${escapeHtml(statsText || emptyStatsMessage(match))}</div>
        ${renderMatchDetailPanels(matchStats)}
        <div class="detail-footer">
          <div class="match-meta">${escapeHtml(t('updatedAt'))}: ${escapeHtml(formatDate(new Date().toISOString()))}</div>
          <div class="detail-actions">
            <button class="button secondary detail-refresh" type="button" data-refresh-match="${escapeHtml(match.id)}">${escapeHtml(t('refreshDetails'))}</button>
            ${
              href
                ? `<a class="stream-button detail-stream" href="${href}">${escapeHtml(t('watchStream'))}</a>`
                : ''
            }
          </div>
        </div>
        ${sponsorLink(`
        <aside class="detail-sponsor sponsor-slot" aria-label="${escapeHtml(t('sponsored'))}">
          <picture>
            <source media="(max-width: 760px)" srcset="../banners/popup_300x80_mockup_original.png" />
            <img src="../banners/popup_320x80_mockup_original.png" width="335" height="46" alt="${escapeHtml(t('sponsored'))}" loading="lazy" />
          </picture>
        </aside>
        `, 'sponsor-link')}
      </article>
    `;
    sanitizeCyrillic(modal);
  }

  function closeMatchDetails() {
    modal.hidden = true;
    modal.innerHTML = '';
  }

  async function loadMatches(options = {}) {
    if (!grid) return;
    renderMatchSkeleton();
    const today = new Date().toISOString().slice(0, 10);

    try {
      const schedule = await fetchScheduleMatches(today, options);
      fetchActiveStreamMatchIds({ force: options.force }).then((activeIds) => {
        activeStreamMatchIds = activeIds;
        renderMatches(currentMatches);
      });
      const matches = mergeManualMatches(schedule.matches);
      if (schedule.cachedMatches.length) {
        const previousStatus = new Map(schedule.cachedMatches.map((item) => [String(item.id), String(item.status || '')]));
        matches.forEach((item) => {
          const id = String(item.id);
          if (!previousStatus.has(id)) return;
          if (previousStatus.get(id) === String(item.status || '')) return;
          clearDailyCacheStartsWith(`match-stats:${id}`);
          clearDailyCacheStartsWith(`match-prematch:${id}:`);
        });
      }
      renderMatches(matches);
      // Warm daily cache for details to avoid extra API calls on modal open.
      matches.forEach((match) => {
        if (match.status === 'scheduled') {
          void fetchPrematchStats(match, { maxAgeMs: 24 * 60 * 60 * 1000 });
          return;
        }
        void fetchMatchStats(match.id, { maxAgeMs: 30_000 });
      });
    } catch {
      renderMatches([]);
    }
  }

  document.querySelectorAll('[data-ad-slot]').forEach((slot) => {
    const key = adSlotKeys[slot.dataset.adSlot];
    if (key && adSlots[key]) slot.innerHTML = adSlots[key];
  });

  if (grid) {
    grid.addEventListener('click', (event) => {
      if (event.target.closest('a')) return;
      const card = event.target.closest('[data-match-id]');
      if (card) openMatchDetails(card.dataset.matchId);
    });
    grid.addEventListener('keydown', (event) => {
      if (event.target.closest('a')) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const card = event.target.closest('[data-match-id]');
      if (!card) return;
      event.preventDefault();
      openMatchDetails(card.dataset.matchId);
    });
  }

  const refreshMatchesButton = document.getElementById('refresh-matches');
  if (refreshMatchesButton) {
    refreshMatchesButton.addEventListener('click', () => {
      const todayUtc = new Date().toISOString().slice(0, 10);
      clearDailyCacheStartsWith(`matches:${todayUtc}:${apiVersion}`);
      clearDailyCacheStartsWith(`news:${uiLocale}:`);
      loadMatches({ force: true });
      loadNews();
    });
  }

  document.querySelectorAll('[data-news-scroll]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!newsGrid) return;
      const direction = Number(button.dataset.newsScroll) || 1;
      const isRtl = document.documentElement?.dir === 'rtl';
      const scrollDirection = isRtl ? -direction : direction;
      const maxScroll = Math.max(0, newsGrid.scrollWidth - newsGrid.clientWidth);
      if (maxScroll <= 1) return;
      const delta = scrollDirection * Math.max(280, newsGrid.clientWidth * 0.85);
      const nextLeft = Math.max(0, Math.min(maxScroll, newsGrid.scrollLeft + delta));
      if (typeof newsGrid.scrollTo === 'function') {
        newsGrid.scrollTo({ left: nextLeft, behavior: 'smooth' });
      } else {
        newsGrid.scrollLeft = nextLeft;
      }
    });
  });

  modal.addEventListener('click', (event) => {
    const refreshButton = event.target.closest('[data-refresh-match]');
    if (refreshButton) {
      const matchId = refreshButton.getAttribute('data-refresh-match');
      if (matchId) openMatchDetails(matchId, { force: true });
      return;
    }
    if (event.target.closest('[data-modal-close]')) closeMatchDetails();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeMatchDetails();
  });

  setupLocaleButton();
  localizeInitialCards();
  installCyrillicGuard();
  setupActiveNav();
  loadMatches();
  loadNews();
  if (typeof setInterval === 'function') {
    setInterval(() => {
      fetchActiveStreamMatchIds().then((ids) => {
        activeStreamMatchIds = ids;
      });
    }, 30_000);
  }
})();
