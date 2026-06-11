(function () {
  const config = window.KINGLIVE_MAIN_CONFIG || {};
  const apiBase = String(config.apiBase || '').replace(/\/$/, '');
  const apiVersion = 'sportmonks-facts-v2';
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
      startingLineups: 'Starting lineups',
      melbetOdds: 'MelBet odds',
      homeWin: 'Home',
      awayWin: 'Away',
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
      startingLineups: 'Alineaciones iniciales',
      melbetOdds: 'Cuotas MelBet',
      homeWin: 'Local',
      awayWin: 'Visitante',
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
      startingLineups: 'Compositions de départ',
      melbetOdds: 'Cotes MelBet',
      homeWin: 'Domicile',
      awayWin: 'Extérieur',
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
      startingLineups: 'التشكيلات الأساسية',
      melbetOdds: 'احتمالات MelBet',
      homeWin: 'المضيف',
      awayWin: 'الضيف',
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
      startingLineups: 'Гарааны бүрэлдэхүүн',
      melbetOdds: 'MelBet коэффициент',
      homeWin: 'Эзэн',
      awayWin: 'Зочин',
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
  let openMatchId = '';
  let liveDetailTimer = null;
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
    if (!shouldWriteDailyCache(scope, data)) return;
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

  function shouldWriteDailyCache(scope, data) {
    if (String(scope).startsWith(`matches:${uiLocale}:`)) {
      return Array.isArray(data?.matches) && data.matches.length > 0;
    }
    if (String(scope).startsWith(`news:${uiLocale}:`)) {
      return Array.isArray(data?.news) && data.news.length > 0;
    }
    return true;
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

  function localizedApiUrl(path, params = {}) {
    const origin = (() => {
      try {
        return new URL(window.location.href).origin;
      } catch {
        return 'https://kinglive.local';
      }
    })();
    const url = new URL(path, `${apiBase || origin}/`);
    Object.entries(params).forEach(([key, value]) => {
      if (value == null || value === '') return;
      url.searchParams.set(key, String(value));
    });
    url.searchParams.set('lang', uiLocale);
    return url.toString();
  }

  async function fetchMatchesForDate(date, options = {}) {
    const scope = `matches:${uiLocale}:${date}:${apiVersion}`;
    const cachedEntry = readDailyCacheEntry(scope);
    const cachedMatches = Array.isArray(cachedEntry?.data?.matches) ? cachedEntry.data.matches : [];
    const url = localizedApiUrl('/api/matches', { date, v: apiVersion });
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
      url.searchParams.set('lang', uiLocale);
      return url.toString();
    } catch {
      const fallback = `${apiBase}/api/news?limit=6`;
      return `${fallback}&lang=${encodeURIComponent(uiLocale)}`;
    }
  }

  function resolveLocale() {
    const fromQuery = (() => {
      try {
        return new URL(window.location.href).searchParams.get('lang') || new URLSearchParams(window.location.search).get('lang');
      } catch {
        return new URLSearchParams(window.location.search).get('lang');
      }
    })();
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

  function shortStatusLabel(value, minute) {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'live') return `LIVE${minute ? ` ${minute}'` : ''}`;
    if (normalized === 'half_time') return 'HT';
    if (normalized === 'finished') return 'FT';
    return translateStatus(normalized || 'scheduled').toUpperCase();
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

  function lastMatchEvent(stats) {
    const events = Array.isArray(stats?.events) ? stats.events : [];
    if (!events.length) return null;
    return [...events].sort((a, b) => {
      const minuteDelta = (Number(a.minute) || 0) - (Number(b.minute) || 0);
      if (minuteDelta !== 0) return minuteDelta;
      return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
    }).at(-1);
  }

  function renderLiveStatusBar(match, stats, displayStatus) {
    const normalized = String(displayStatus || match?.status || '').toLowerCase();
    if (!['live', 'half_time', 'finished'].includes(normalized)) return '';
    const latestEvent = lastMatchEvent(stats);
    const latestText = latestEvent
      ? `${eventMinute(latestEvent)} ${eventIcon(latestEvent.type)} ${cleanText(latestEvent.player_name, t('football'))}`
      : '';
    return `
      <div class="live-status-bar ${escapeHtml(normalized)}">
        <strong>${escapeHtml(shortStatusLabel(normalized, Number(match?.minute) || 0))}</strong>
        ${latestText ? `<span>${escapeHtml(latestText)}</span>` : ''}
      </div>
    `;
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

  function renderDetailAccordion(title, body, className, options = {}) {
    if (!body) return '';
    return `
      <details class="detail-accordion ${escapeHtml(className || '')}"${options.open ? ' open' : ''}>
        <summary>
          <span>${escapeHtml(title)}</span>
          <span class="detail-accordion-icon" aria-hidden="true">⌄</span>
        </summary>
        <div class="detail-accordion-body">${body}</div>
      </details>
    `;
  }

  function renderMatchEvents(stats) {
    const events = Array.isArray(stats?.events) ? stats.events : [];
    if (!events.length) {
      return renderDetailAccordion(
        t('matchEvents'),
        `<p class="detail-empty">${escapeHtml(t('noMatchEvents'))}</p>`,
        'events-accordion',
        { open: true },
      );
    }

    return renderDetailAccordion(
      t('matchEvents'),
      `
          <div class="event-timeline">
            ${events.map((event) => `
              <div class="timeline-event ${escapeHtml(String(event.team || ''))}">
                <span class="timeline-minute">${escapeHtml(eventMinute(event))}</span>
                <span class="timeline-marker">${escapeHtml(eventIcon(event.type))}</span>
                <span class="event-body">
                  <strong>${escapeHtml(cleanText(event.player_name, t('football')))}</strong>
                  ${event.detail ? `<em>${escapeHtml(cleanText(event.detail, ''))}</em>` : ''}
                </span>
              </div>
            `).join('')}
          </div>
        `,
      'events-accordion',
      { open: true },
    );
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
    return renderDetailAccordion(t('teamStatistics'), `<div class="stat-list">${rows}</div>`, 'stats-accordion', { open: true });
  }

  function numericFormationSlot(item) {
    const direct = Number(item?.formation_position);
    if (Number.isInteger(direct) && direct >= 1 && direct <= 11) return direct;
    const fallback = Number(item?.position);
    if (Number.isInteger(fallback) && fallback >= 1 && fallback <= 11) return fallback;
    return 0;
  }

  function formationClass(item, index) {
    const slot = numericFormationSlot(item);
    if (slot) return `formation-slot-${slot}`;
    return `formation-fallback-${Math.min(11, index + 1)}`;
  }

  function renderFormationPitch(items, title) {
    const sorted = [...items].sort((a, b) => {
      const slotA = numericFormationSlot(a);
      const slotB = numericFormationSlot(b);
      if (slotA && slotB) return slotA - slotB;
      if (slotA) return -1;
      if (slotB) return 1;
      return cleanText(a.player_name, '').localeCompare(cleanText(b.player_name, ''));
    });

    const players = sorted.map((item, index) => {
      const slotClass = formationClass(item, index);
      const number = item.number ? escapeHtml(item.number) : '-';
      const fullName = cleanText(item.player_name, 'TBD');
      const name = escapeHtml(fullName);
      const photo = item.image_url
        ? `<img class="formation-avatar" src="${escapeHtml(item.image_url)}" alt="" loading="lazy" />`
        : `<span class="formation-number">${number}</span>`;
      return `
        <span class="formation-player ${slotClass}" title="${escapeHtml(fullName)}">
          <span class="formation-photo">${photo}</span>
          <span class="formation-caption"><b>${number}</b><span>${name}</span></span>
        </span>
      `;
    }).join('');

    return `
      <div class="formation-team">
        <strong class="formation-title">${escapeHtml(cleanText(title, t('football')))}</strong>
        <div class="formation-pitch">${players}</div>
      </div>
    `;
  }

  function renderLineups(stats) {
    const starters = Array.isArray(stats?.lineups) ? stats.lineups.filter((item) => item?.is_starter !== false) : [];
    if (!starters.length) return '';
    const home = starters.filter((item) => item.team === 'home');
    const away = starters.filter((item) => item.team === 'away');
    if (!home.length && !away.length) return '';
    const teams = Array.isArray(stats?.team_stats) ? stats.team_stats : (Array.isArray(stats?.teams) ? stats.teams : []);
    const homeTitle = teams[0]?.team?.name || 'Home';
    const awayTitle = teams[1]?.team?.name || 'Away';
    return renderDetailAccordion(
      t('startingLineups'),
      `
        <div class="formation-grid">
          ${renderFormationPitch(home, homeTitle)}
          ${renderFormationPitch(away, awayTitle)}
        </div>
      `,
      'lineup-accordion',
    );
  }

  function renderMatchFacts(stats) {
    const facts = Array.isArray(stats?.facts) ? stats.facts : [];
    if (!facts.length) return '';
    return renderDetailAccordion(
      t('matchFacts'),
      `
        <div class="fact-card-grid">
          ${facts.map((fact) => {
            const insight = factInsight(fact);
            return `
              <article class="fact-card ${escapeHtml(insight.key)}">
                <span>${escapeHtml(insight.label)}</span>
                <strong>${escapeHtml(cleanText(fact.title, t('matchFacts')))}</strong>
                <p>${escapeHtml(cleanText(fact.text, ''))}</p>
              </article>
            `;
          }).join('')}
        </div>
      `,
      'facts-accordion',
    );
  }

  function factInsight(fact) {
    const value = `${fact?.title || ''} ${fact?.text || ''}`.toLowerCase();
    if (value.includes('h2h') || value.includes('head-to-head') || value.includes('head to head')) return { key: 'h2h', label: 'H2H' };
    if (value.includes('first') && value.includes('score')) return { key: 'first-score', label: 'First score' };
    if (value.includes('goal')) return { key: 'goals', label: 'Goals' };
    if (value.includes('streak') || value.includes('unbeaten') || value.includes('win ')) return { key: 'streak', label: 'Streak' };
    return { key: 'general', label: 'Fact' };
  }

  function renderMatchDetailPanels(stats) {
    return [
      renderMatchEvents(stats),
      renderTeamStats(stats),
      renderLineups(stats),
      renderMatchFacts(stats),
    ].filter(Boolean).join('');
  }

  function renderMelbetOdds(stats, homeName, awayName) {
    const odds = stats?.odds;
    const markets = Array.isArray(odds?.markets) && odds.markets.length
      ? odds.markets
      : [{ key: 'fulltime', label: odds?.market, outcomes: odds?.outcomes }];
    if (!odds || !markets.length) return '';
    const body = markets.map((market) => {
          const outcomes = market?.outcomes || {};
          const items = melbetMarketItems(market, outcomes, homeName, awayName);
          if (!items.length) return '';
          return `
            <div class="melbet-odds-market">${escapeHtml(cleanText(market.label, '1X2'))}</div>
            <div class="melbet-odds-grid">
              ${items.map(([label, item]) => `
                <a class="melbet-odd" href="${escapeHtml(sponsorUrl)}" target="_blank" rel="nofollow sponsored noopener">
                  <span>${escapeHtml(cleanText(label, ''))}</span>
                  <strong>${escapeHtml(cleanText(item.value, '-'))}</strong>
                </a>
              `).join('')}
            </div>
          `;
        }).filter(Boolean).join('');
    if (!body) return '';
    return renderDetailAccordion(t('melbetOdds'), `<div class="melbet-odds">${body}</div>`, 'odds-accordion', { open: true });
  }

  function melbetMarketItems(market, outcomes, homeName, awayName) {
    if (market?.key === 'total_goals') {
      return [
        [`Over ${outcomes.over?.total || ''}`.trim(), outcomes.over],
        [`Under ${outcomes.under?.total || ''}`.trim(), outcomes.under],
      ].filter(([, item]) => item);
    }
    if (market?.key === 'asian_handicap') {
      return [
        [`${homeName || t('homeWin')} ${outcomes.home?.handicap || ''}`.trim(), outcomes.home],
        [`${awayName || t('awayWin')} ${outcomes.away?.handicap || ''}`.trim(), outcomes.away],
      ].filter(([, item]) => item);
    }
    return [
      [homeName || t('homeWin'), outcomes.home],
      [t('draw'), outcomes.draw],
      [awayName || t('awayWin'), outcomes.away],
    ].filter(([, item]) => item);
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

  function kickoffCountdown(value) {
    const kickoff = Date.parse(value || '');
    if (Number.isNaN(kickoff)) return '';
    const delta = kickoff - Date.now();
    if (delta <= 0) return 'Kickoff soon';
    const minutes = Math.ceil(delta / 60_000);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  function renderPrematchPanel(match, statsText) {
    if (String(match?.status || '') !== 'scheduled') return '';
    const countdown = kickoffCountdown(match.scheduled_at);
    const items = [
      [t('kickoff'), formatDate(match.scheduled_at)],
      ['Countdown', countdown],
      [t('stage'), stageName(match)],
      [t('venue'), placeName(match.venue)],
      [t('city'), placeName(match.city)],
    ].filter(([, value]) => value);
    return `
      <section class="prematch-panel" aria-label="${escapeHtml(t('matchDetails'))}">
        <div class="prematch-countdown">
          <span>${escapeHtml(t('kickoff'))}</span>
          <strong>${escapeHtml(countdown || formatDate(match.scheduled_at))}</strong>
        </div>
        <div class="prematch-grid">
          ${items.map(([label, value]) => `
            <div>
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value)}</strong>
            </div>
          `).join('')}
        </div>
        ${statsText ? `<p>${escapeHtml(statsText)}</p>` : ''}
      </section>
    `;
  }

  async function fetchMatchStatsPayload(matchId, options = {}) {
    const scope = `match-stats:${uiLocale}:${matchId}:${apiVersion}:${options.live ? 'live' : 'default'}`;
    const url = localizedApiUrl(`/api/matches/${matchId}/stats`, {
      v: apiVersion,
      live: options.live ? '1' : '',
    });
    try {
      return await fetchJsonDaily(scope, url, {
        force: options.force,
        maxAgeMs: options.maxAgeMs,
      });
    } catch {
      return null;
    }
  }

  async function fetchMatchDetailPayload(matchId, options = {}) {
    const url = localizedApiUrl(`/api/matches/${matchId}`, {
      live: options.live ? '1' : '',
      v: apiVersion,
    });
    try {
      return await fetchJson(url);
    } catch {
      return null;
    }
  }

  function updateCurrentMatch(nextMatch) {
    if (!nextMatch || nextMatch.error || nextMatch.id == null) return null;
    const index = currentMatches.findIndex((item) => String(item.id) === String(nextMatch.id));
    if (index < 0) return nextMatch;
    const merged = {
      ...currentMatches[index],
      ...nextMatch,
      home_team: nextMatch.home_team || currentMatches[index].home_team,
      away_team: nextMatch.away_team || currentMatches[index].away_team,
      streams: Array.isArray(nextMatch.streams) ? nextMatch.streams : currentMatches[index].streams,
    };
    currentMatches[index] = merged;
    return merged;
  }

  async function fetchMatchStats(matchId, options = {}) {
    const payload = await fetchMatchStatsPayload(matchId, options);
    return renderStatsText(payload);
  }

  async function fetchPrematchStats(match, options = {}) {
    const home = match.home_team?.id || match.home_team?.external_id;
    const away = match.away_team?.id || match.away_team?.external_id;
    if (!home || !away) return '';

    const scope = `match-prematch:${uiLocale}:${match.id}:${home}:${away}`;
    try {
      const params = new URLSearchParams({ home: String(home), away: String(away) });
      const payload = await fetchJsonDaily(scope, localizedApiUrl(`/api/matches/${match.id}/prematch`, Object.fromEntries(params)), {
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
          : '<span class="news-football-fallback" aria-hidden="true"><b>KL</b><span></span></span>';
        const href = `./news.html?url=${encodeURIComponent(item.url || item.id || '')}`;
        const badges = [
          cleanText(item.source, t('footballNews')),
          cleanText(item.type, ''),
          item.fixture_id ? `#${item.fixture_id}` : '',
        ].filter(Boolean);
        return `
          <a class="news-card" href="${escapeHtml(href)}">
            <div class="news-image">${image}</div>
            <div>
              <div class="news-meta">
                <time>${escapeHtml(formatDate(item.published_at))}</time>
                ${badges.map((badge) => `<span>${escapeHtml(badge)}</span>`).join('')}
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

    grid.innerHTML = cards.join('');
    sanitizeCyrillic(grid);
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

  function isAdElementHidden(element) {
    if (!element) return false;
    const style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(element) : null;
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return true;
    const height = Number(element.offsetHeight ?? element.clientHeight ?? 1);
    const width = Number(element.offsetWidth ?? element.clientWidth ?? 1);
    return height <= 0 || width <= 0 || element.hidden === true;
  }

  function showAdblockModal() {
    if (!document.body || document.querySelector?.('.adblock-modal')) return;
    const notice = document.createElement('div');
    notice.className = 'adblock-modal';
    notice.innerHTML = `
      <div class="adblock-modal-backdrop" data-adblock-close></div>
      <section class="adblock-dialog" role="dialog" aria-modal="true" aria-label="Ad blocker detected">
        <h2>Ad blocker detected</h2>
        <p>KingLive is supported by sponsor banners. Please disable your ad blocker for this site to keep streams and match updates available.</p>
        <button class="button primary" type="button" data-adblock-close>Continue</button>
      </section>
    `;
    notice.addEventListener('click', (event) => {
      if (!event.target?.closest?.('[data-adblock-close]')) return;
      notice.hidden = true;
      if (typeof notice.remove === 'function') notice.remove();
    });
    document.body.appendChild(notice);
  }

  function detectAdblock() {
    if (!document.body || typeof document.createElement !== 'function') return;
    const probe = document.createElement('div');
    probe.className = 'adsbox ad-banner ad-unit pub_300x250 text-ad';
    probe.setAttribute?.('aria-hidden', 'true');
    probe.textContent = 'Advertisement';
    if (probe.style) {
      probe.style.cssText = 'position:absolute;left:-10000px;top:-10000px;width:1px;height:1px;pointer-events:none;';
    }
    document.body.appendChild(probe);

    const check = () => {
      const adSlots = Array.from(document.querySelectorAll?.('[data-ad-slot], .sponsor-slot, .ad-shell') || []);
      const slotsBlocked = adSlots.length > 0 && adSlots.every((slot) => isAdElementHidden(slot));
      const blocked = isAdElementHidden(probe) || slotsBlocked;
      if (typeof probe.remove === 'function') probe.remove();
      if (blocked) showAdblockModal();
    };
    if (typeof setTimeout === 'function') setTimeout(check, 80);
    else check();
  }

  function setMatchUrlParam(matchId) {
    if (!window.history || typeof window.history.replaceState !== 'function') return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('match', String(matchId));
      window.history.replaceState({}, '', url.toString());
    } catch {}
  }

  function clearMatchUrlParam() {
    if (!window.history || typeof window.history.replaceState !== 'function') return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('match');
      if (/^#match=\d+$/i.test(url.hash)) url.hash = '';
      window.history.replaceState({}, '', url.toString());
    } catch {}
  }

  function deeplinkMatchId() {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('match') || String(url.hash || '').match(/^#match=(\d+)$/)?.[1] || '';
    } catch {
      return new URLSearchParams(window.location.search).get('match') || '';
    }
  }

  function stopLiveDetailRefresh() {
    if (!liveDetailTimer) return;
    clearInterval(liveDetailTimer);
    liveDetailTimer = null;
  }

  function startLiveDetailRefresh(matchId) {
    stopLiveDetailRefresh();
    if (typeof setInterval !== 'function') return;
    liveDetailTimer = setInterval(() => {
      void refreshOpenLiveMatch(matchId);
    }, 25_000);
  }

  async function refreshOpenLiveMatch(matchId) {
    if (modal.hidden || String(openMatchId) !== String(matchId)) return;
    const nextMatch = await fetchMatchDetailPayload(matchId, { live: true });
    if (nextMatch) updateCurrentMatch(nextMatch);
    await openMatchDetails(matchId, { force: true, updateUrl: false });
  }

  async function openMatchDetails(matchId, options = {}) {
    const match = currentMatches.find((item) => String(item.id) === String(matchId));
    if (!match) return;
    openMatchId = String(matchId);
    stopLiveDetailRefresh();
    if (options.updateUrl !== false) setMatchUrlParam(matchId);

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
      live: isLiveStatus,
      maxAgeMs: isLiveStatus ? 30_000 : 24 * 60 * 60 * 1000,
    });
    const liveStatsText = renderStatsText(matchStats);
    const statsText = liveStatsText || (match.status === 'scheduled'
      ? await fetchPrematchStats(match, { force: options.force, maxAgeMs: 24 * 60 * 60 * 1000 })
      : '');
    const liveStatusBar = renderLiveStatusBar(match, matchStats, displayStatus);
    const prematchPanel = renderPrematchPanel(match, statsText);

    modal.hidden = false;
    modal.innerHTML = `
      <div class="match-modal-backdrop" data-modal-close></div>
      <article class="match-detail" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <button class="detail-close" type="button" data-modal-close aria-label="${escapeHtml(t('closeMatchDetails'))}">×</button>
        <p class="section-kicker">${escapeHtml(t('matchDetails'))}</p>
        <div class="detail-scoreboard-shell" aria-label="${escapeHtml(title)} scoreboard">
          <div class="detail-scorebar">
            <div class="detail-score-team home">
              ${renderTeamLogo(match.home_team, home)}
              <strong>${escapeHtml(home)}</strong>
            </div>
            <div class="detail-score-center">
              <span class="detail-score-status match-status ${isLive ? 'live' : ''} ${badgeClass}">${escapeHtml(translateStatus(displayStatus))}</span>
              <div class="detail-score">${escapeHtml(match.home_score ?? 0)} : ${escapeHtml(match.away_score ?? 0)}</div>
              <span class="detail-score-time">${escapeHtml(formatDate(match.scheduled_at))}</span>
            </div>
            <div class="detail-score-team away">
              ${renderTeamLogo(match.away_team, away)}
              <strong>${escapeHtml(away)}</strong>
            </div>
          </div>
          <div class="detail-score-venue">
            <span>${escapeHtml(cleanText(match.league?.name, cleanText(match.stage, t('football'))))}</span>
            <span>${escapeHtml(t('stage'))}: ${escapeHtml(stageName(match))}</span>
            <span>${escapeHtml(t('venue'))}: ${escapeHtml(placeName(match.venue))}</span>
            <span>${escapeHtml(t('city'))}: ${escapeHtml(placeName(match.city))}</span>
          </div>
        </div>
        ${liveStatusBar}
        ${renderMelbetOdds(matchStats, home, away)}
        ${prematchPanel}
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
    const latest = currentMatches.find((item) => String(item.id) === String(matchId));
    const latestStatus = String(latest?.status || displayStatus);
    const shouldRefresh = (latestStatus === 'live' || latestStatus === 'half_time') && !modal.hidden;
    if (shouldRefresh) startLiveDetailRefresh(matchId);
  }

  function closeMatchDetails() {
    stopLiveDetailRefresh();
    openMatchId = '';
    modal.hidden = true;
    modal.innerHTML = '';
    clearMatchUrlParam();
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
          clearDailyCacheStartsWith(`match-stats:${uiLocale}:${id}`);
          clearDailyCacheStartsWith(`match-prematch:${uiLocale}:${id}:`);
        });
      }
      renderMatches(matches);
      const linkedMatch = deeplinkMatchId();
      if (linkedMatch && matches.some((match) => String(match.id) === String(linkedMatch))) {
        void openMatchDetails(linkedMatch, { updateUrl: false });
      }
      // Warm daily cache for details to avoid extra API calls on modal open.
      matches.forEach((match) => {
        if (match.status === 'scheduled') {
          void fetchPrematchStats(match, { maxAgeMs: 24 * 60 * 60 * 1000 });
          return;
        }
        void fetchMatchStats(match.id, { live: true, maxAgeMs: 30_000 });
      });
    } catch {
      renderMatches([]);
    }
  }

  document.querySelectorAll('[data-ad-slot]').forEach((slot) => {
    const key = adSlotKeys[slot.dataset.adSlot];
    if (key && adSlots[key]) slot.innerHTML = adSlots[key];
  });
  detectAdblock();

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
      clearDailyCacheStartsWith(`matches:${uiLocale}:${todayUtc}:${apiVersion}`);
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
