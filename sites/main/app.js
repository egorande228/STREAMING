(function () {
  const config = window.KINGLIVE_MAIN_CONFIG || {};
  const apiBase = String(config.apiBase || '').replace(/\/$/, '');
  const apiVersion = 'ts-restream-aac-cache-refresh-20260619';
  const scheduleLookaheadDays = 14;
  const playerBase = String(config.playerBase || '../player').replace(/\/$/, '');
  const streamConfigUrl = config.streamConfigUrl || './stream.json';
  const activeStreamsApiUrl = config.activeStreamsApiUrl || `${apiBase}/api/streams/active`;
  const newsApiUrl = config.newsApiUrl || `${apiBase}/api/news?limit=6`;
  const defaultLocale = config.defaultLocale || 'en';
  const dailyCachePrefix = 'kinglive.daily.v2.no-cyrillic';
  const newsStoryCachePrefix = 'kinglive.news.story.v1';
  const localeButton = typeof document.querySelector === 'function' ? document.querySelector('.locale') : null;
  const i18n = {
    en: {
      brandTitle: 'Matchday Hub',
      navHome: 'Home',
      navSchedule: 'Schedule',
      navGroups: 'News',
      heroKicker: 'Road to glory',
      heroLine1: 'All World Cup',
      heroHighlight: 'matches',
      heroLine2: 'live broadcast',
      heroText: 'KingLive keeps fixtures, live entry points, scores and match details in one sharp matchday hub.',
      heroActionMain: 'Match center',
      heroActionGroups: 'News',
      nextMatchLabel: 'Next match',
      nextMatchLiveLabel: 'Live in',
      nextMatchSoon: 'Starting soon',
      nextMatchLiveNow: 'LIVE NOW',
      nextMatchHalfTime: 'HALF TIME',
      nextMatchesLabel: 'Next matches',
      liveMatchesLabel: 'Live matches',
      nextMatchFallback: 'Schedule loading',
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
      kickoff: 'Kickoff',
      venue: 'Venue',
      city: 'City',
      stage: 'Stage',
      updatedAt: 'Updated',
      watchStream: 'Open player',
      liveStreamTitle: 'Live stream',
      watchInLanguage: 'Watch in',
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
      kickoff: 'Inicio',
      venue: 'Estadio',
      city: 'Ciudad',
      stage: 'Fase',
      updatedAt: 'Actualizado',
      watchStream: 'Abrir player',
      liveStreamTitle: 'Transmisión en vivo',
      watchInLanguage: 'Ver en',
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
      kickoff: 'Coup d’envoi',
      venue: 'Stade',
      city: 'Ville',
      stage: 'Phase',
      updatedAt: 'Mis à jour',
      watchStream: 'Ouvrir le player',
      liveStreamTitle: 'Stream en direct',
      watchInLanguage: 'Regarder en',
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
      heroLine1: 'شاهد جميع مباريات',
      heroHighlight: 'كأس العالم',
      heroLine2: 'بثًا مباشرًا',
      heroText: 'KingLive يجمع المواعيد، روابط البث، النتائج وتفاصيل المباريات في صفحة واحدة واضحة.',
      heroActionMain: 'مركز المباريات',
      heroActionGroups: 'الأخبار',
      nextMatchLabel: 'المباراة القادمة',
      nextMatchLiveLabel: 'البث المباشر قريبًا',
      nextMatchSoon: 'سيبدأ قريبًا',
      nextMatchLiveNow: 'مباشر الآن',
      nextMatchHalfTime: 'استراحة',
      nextMatchesLabel: 'المباريات القادمة',
      liveMatchesLabel: 'مباريات مباشرة',
      nextMatchFallback: 'جارٍ تحميل الجدول',
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
      kickoff: 'البداية',
      venue: 'الملعب',
      city: 'المدينة',
      stage: 'المرحلة',
      updatedAt: 'آخر تحديث',
      watchStream: 'فتح المشغل',
      liveStreamTitle: 'البث المباشر',
      watchInLanguage: 'شاهد باللغة',
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
      heroLine1: 'Дэлхийн аваргын',
      heroHighlight: 'бүх тоглолтыг',
      heroLine2: 'ШУУД ҮЗЭЭРЭЙ',
      heroText: 'KingLive нь хуваарь, шууд үзэх холбоос, оноо болон тоглолтын дэлгэрэнгүйг нэг тодорхой төвд нэгтгэнэ.',
      heroActionMain: 'Тоглолтын төв',
      heroActionGroups: 'Мэдээ',
      nextMatchLabel: 'Дараагийн тоглолтын',
      nextMatchLiveLabel: 'ШУУД ДАМЖУУЛАЛТ удахгүй',
      nextMatchSoon: 'Удахгүй эхэлнэ',
      nextMatchLiveNow: 'ШУУД ОДОО',
      nextMatchHalfTime: 'ЗАВСАРЛАГА',
      nextMatchesLabel: 'Дараагийн тоглолтууд',
      liveMatchesLabel: 'Шууд тоглолтууд',
      nextMatchFallback: 'Хуваарь ачаалж байна',
      tournamentTitle: 'KingLive World Cup 26',
      tournamentDates: '2026 оны 6 сарын 11 - 7 сарын 19',
      scheduleTitlePrefix: 'Удахгүй болох',
      scheduleTitleAccent: 'тоглолтууд',
      newsKicker: 'Хөлбөмбөгийн хэмнэл',
      newsTitlePrefix: 'Сүүлийн',
      newsTitleAccent: 'мэдээ',
      followPartnerText: 'MELBET-н партнерийн сүлжээтэй хамтран ажиллаад орлого олоорой',
      followPartnerButton: 'Нэгдэх',
      followPartnerUrl: 'https://t.me/mongolia_partner_bot',
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
      kickoff: 'Эхлэх цаг',
      venue: 'Цэнгэлдэх',
      city: 'Хот',
      stage: 'Шат',
      updatedAt: 'Шинэчлэгдсэн',
      watchStream: 'Тоглуулагч нээх',
      liveStreamTitle: 'Шууд дамжуулалт',
      watchInLanguage: 'Үзэх хэл',
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
  const nextMatchLabel = document.getElementById('next-match-label');
  const nextMatchTeams = document.getElementById('next-match-teams');
  const nextMatchOpen = document.getElementById('next-match-open');
  const nextMatchLiveLabel = document.getElementById('next-match-live-label');
  const nextMatchCountdown = document.getElementById('next-match-countdown');
  const nextMatchList = document.getElementById('next-match-list');
  const nextMatchMeta = document.getElementById('next-match-meta');
  const nextMatchDay = document.getElementById('next-match-day');
  const adSlots = config.adSlots || {};
  const sponsorUrl = config.sponsorUrl || 'https://qweqr.sbs/jJQN6M';
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
  const socialLinksByLocale = {
    ar: [
      { brand: 'telegram', label: 'Telegram', url: 'https://t.me/worldcup_live2026arabia' },
      { brand: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@%D8%A7%D9%84%D8%B9%D8%A7%D9%84%D9%85%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%D8%A8%D8%B7%D9%88%D9%84%D8%A9%D8%A7%D9%84%D8%B9%D8%A7%D9%84%D9%852026' },
      { brand: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@2026melbetworldcuparabia?_r=1&_t=ZS-96xaxd2saoP' },
      { brand: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/share/18nunR1PmA/?mibextid=wwXIfr' },
      { brand: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/2026melbetfifaworldcuparabia?igsh=aDZsY3R6eHhxYzkx&utm_source=qr' },
    ],
    en: [
      { brand: 'telegram', label: 'Telegram', url: 'https://t.me/worldcuplive_international' },
      { brand: 'facebook', label: 'Facebook', url: 'https://facebook.com/worldcupliveinternationalll' },
      { brand: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/worldcuplive_international/' },
    ],
    fr: [
      { brand: 'facebook', label: 'Facebook', url: 'https://facebook.com/worldcuplivefrench' },
      { brand: 'telegram', label: 'Telegram', url: 'https://t.me/worldcuplive_french' },
    ],
    mn: [
      { brand: 'telegram', label: 'Telegram', url: 'https://t.me/worldcuplive_mongolia' },
      { brand: 'facebook', label: 'Facebook', url: 'https://facebook.com/worldcuplivemongoliaa' },
    ],
  };
  let currentMatches = [];
  let activeStreamMatchIds = new Set();
  let openMatchId = '';
  let liveDetailTimer = null;
  let heroCountdownTimer = null;
  const modal = document.createElement('div');
  modal.className = 'match-modal';
  modal.hidden = true;
  document.body.appendChild(modal);

  function t(key) {
    return i18n[uiLocale]?.[key] ?? i18n.en[key] ?? key;
  }

  function setNodeText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value == null ? '' : String(value);
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

  function matchCacheMaxAge(matches, date) {
    if (date === todayLocalKey() || date === new Date().toISOString().slice(0, 10)) return 45_000;
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
      maxAgeMs: matchCacheMaxAge(cachedMatches, date),
    });
    return {
      matches: Array.isArray(data.matches) ? data.matches : [],
      cachedMatches,
    };
  }

  async function fetchScheduleMatches(today, options = {}) {
    const previousDate = addUtcDays(today, -1);
    const previousResult = await fetchMatchesForDate(previousDate, options);
    const todayResult = await fetchMatchesForDate(today, options);
    const upcomingDates = Array.from({ length: scheduleLookaheadDays }, (_, index) => addUtcDays(today, index + 1));
    const upcomingResults = await Promise.all(upcomingDates.map((date) => fetchMatchesForDate(date, options)));
    const previousLocalDateMatches = previousResult.matches.filter((match) => matchLocalDateKey(match) === today || isLiveCarryoverMatch(match));
    const upcomingMatches = [
      ...previousLocalDateMatches,
      ...todayResult.matches,
      ...upcomingResults.flatMap((result) => result.matches),
    ];
    const cachedMatches = [
      ...previousResult.cachedMatches,
      ...todayResult.cachedMatches,
      ...upcomingResults.flatMap((result) => result.cachedMatches),
    ];

    return {
      matches: uniqueMatchesById(upcomingMatches)
        .sort((left, right) => String(left?.scheduled_at || '').localeCompare(String(right?.scheduled_at || ''))),
      cachedMatches,
    };
  }

  function isLiveCarryoverMatch(match) {
    const status = String(match?.status || '');
    if (status !== 'live' && status !== 'half_time') return false;
    return streamsForMatch(match).length > 0;
  }

  function uniqueMatchesById(matches) {
    const seen = new Set();
    return (Array.isArray(matches) ? matches : []).filter((match) => {
      const id = String(match?.id || '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
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

  function setupSocialDock() {
    if (typeof document.querySelector !== 'function') return;
    const dock = document.querySelector('[data-social-dock]');
    const panel = document.querySelector('[data-social-panel]');
    const toggle = document.querySelector('[data-social-toggle]');
    if (!dock || !panel) return;
    const links = socialLinksByLocale[uiLocale] || socialLinksByLocale.en;
    panel.innerHTML = links
      .map((item) => {
        const icon = socialIcon(item.brand);
        if (!item.url) {
          return `<span class="social-link disabled" title="${escapeHtml(item.label)}">${icon}<span>${escapeHtml(item.label)}</span></span>`;
        }
        return `
          <a class="social-link ${escapeHtml(item.brand)}" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(item.label)}" aria-label="${escapeHtml(item.label)}">
            ${icon}<span>${escapeHtml(item.label)}</span>
          </a>
        `;
      })
      .join('');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
      const expanded = dock.classList.toggle('open');
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
  }

  function socialIcon(brand = '') {
    const icons = {
      telegram: '<svg viewBox="0 0 24 24" focusable="false"><path d="M21.5 4.3 18.4 19c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L5.8 12.6.9 11.1c-1.1-.3-1.1-1.1.2-1.6L20.2 2.2c.9-.3 1.7.2 1.3 2.1Z"/></svg>',
      youtube: '<svg viewBox="0 0 24 24" focusable="false"><path d="M22.3 7.1a3 3 0 0 0-2.1-2.1C18.4 4.5 12 4.5 12 4.5s-6.4 0-8.2.5a3 3 0 0 0-2.1 2.1A31 31 0 0 0 1.2 12a31 31 0 0 0 .5 4.9 3 3 0 0 0 2.1 2.1c1.8.5 8.2.5 8.2.5s6.4 0 8.2-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.9 31 31 0 0 0-.5-4.9ZM9.8 15.3V8.7l5.8 3.3-5.8 3.3Z"/></svg>',
      tiktok: '<svg viewBox="0 0 24 24" focusable="false"><path d="M16.2 3c.4 3 2.1 4.8 4.8 5v3.3a8.3 8.3 0 0 1-4.7-1.5v6.5c0 3.3-2.3 5.7-5.7 5.7a5.5 5.5 0 0 1-5.8-5.4c0-3.5 2.8-5.9 6.5-5.4v3.5c-1.7-.5-3.1.4-3.1 1.9 0 1.2 1 2.1 2.3 2.1 1.4 0 2.3-.9 2.3-2.6V3h3.4Z"/></svg>',
      facebook: '<svg viewBox="0 0 24 24" focusable="false"><path d="M15.7 8.2h-2.3V6.7c0-.6.4-.8.8-.8h1.4V3.1L13.4 3c-2.4 0-3.8 1.5-3.8 4v1.2H7.1v3h2.5V21h3.8v-9.8h2.1l.2-3Z"/></svg>',
      instagram: '<svg viewBox="0 0 24 24" focusable="false"><path d="M7.3 2.8h9.4c2.5 0 4.5 2 4.5 4.5v9.4c0 2.5-2 4.5-4.5 4.5H7.3c-2.5 0-4.5-2-4.5-4.5V7.3c0-2.5 2-4.5 4.5-4.5Zm0 3A1.5 1.5 0 0 0 5.8 7.3v9.4a1.5 1.5 0 0 0 1.5 1.5h9.4a1.5 1.5 0 0 0 1.5-1.5V7.3a1.5 1.5 0 0 0-1.5-1.5H7.3Zm4.7 2.6a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2Zm0 2.2a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Zm4-2.4a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z"/></svg>',
    };
    return `<span class="social-mark ${escapeHtml(brand)}" aria-hidden="true">${icons[brand] || icons.telegram}</span>`;
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
    renderNextMatchBoard();
    setText('schedule-title-prefix', t('scheduleTitlePrefix'));
    setText('schedule-title-accent', t('scheduleTitleAccent'));
    setText('news-kicker', t('newsKicker'));
    setText('news-title-prefix', t('newsTitlePrefix'));
    setText('news-title-accent', t('newsTitleAccent'));
    const partnerCta = document.getElementById('follow-partner-cta');
    const partnerLink = document.getElementById('follow-partner-link');
    if (partnerCta) partnerCta.hidden = uiLocale !== 'mn';
    if (uiLocale === 'mn') {
      setText('follow-partner-text', t('followPartnerText'));
      setText('follow-partner-link', t('followPartnerButton'));
      if (partnerLink) partnerLink.href = t('followPartnerUrl');
    }
    setText('follow-band-kicker', t('followBandKicker'));
    setText('follow-band-title', t('followBandTitle'));
    setText('follow-band-disclaimer', t('followBandDisclaimer'));
    const topBannerSrcKey = uiLocale === 'ar' ? 'arSrc' : 'enSrc';
    Array.from(document.querySelectorAll?.('[data-locale-top-banner]') || []).forEach((image) => {
      const nextSrc = image.dataset?.[topBannerSrcKey] || image.dataset?.enSrc;
      if (nextSrc && image.getAttribute('src') !== nextSrc) image.setAttribute('src', nextSrc);
      image.setAttribute('alt', t('sponsored'));
    });

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
    url.searchParams.set('v', '20260611-chat-live');
    return url.toString();
  }

  function streamLanguageLabel(stream = {}, index = 0) {
    const code = String(stream.language_code || stream.languageCode || stream.lang || '').toLowerCase();
    const labels = {
      ar: 'Arabic',
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      mn: 'Mongolian',
      ru: 'Russian',
    };
    return labels[code] || cleanText(stream.label, `${t('watchStream')} ${index + 1}`);
  }

  function inferStreamType(src = '') {
    if (/^dami-channel:\/?\/?\d+$/i.test(src)) return 'dami-channel';
    if (/\.m3u8(\?|$)/i.test(src)) return 'hls';
    return 'iframe';
  }

  function streamsForMatch(match = {}) {
    return Array.isArray(match.streams)
      ? match.streams.filter((stream) => stream && stream.url && stream.is_active !== false && stream.isActive !== false)
      : [];
  }

  function isFirstPartyVideoStream(stream = {}) {
    const type = String(stream.source_type || stream.sourceType || inferStreamType(stream.url)).toLowerCase();
    return type === 'videojs' || type === 'hls';
  }

  function displayStreamsForMatch(match = {}) {
    const byLanguage = new Map();
    const withoutLanguage = [];
    const activeStreams = streamsForMatch(match);
    const videoStreams = activeStreams.filter(isFirstPartyVideoStream);
    const streams = videoStreams.length ? videoStreams : activeStreams;
    streams.forEach((stream, index) => {
      const language = String(stream.language_code || stream.languageCode || stream.lang || '').toLowerCase();
      const priority = Number.isFinite(Number(stream.priority)) ? Number(stream.priority) : 100 - index;
      const normalized = { ...stream, priority };
      if (!language) {
        withoutLanguage.push(normalized);
        return;
      }
      const current = byLanguage.get(language);
      if (!current || priority > Number(current.priority || 0)) byLanguage.set(language, normalized);
    });
    return [...byLanguage.values(), ...withoutLanguage].sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0));
  }

  function localDateKey(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function matchLocalDateKey(match = {}) {
    const parsed = new Date(match.scheduled_at || match.scheduledAt || '');
    return localDateKey(parsed);
  }

  function shouldShowPlayerButtons(match = {}) {
    return matchLocalDateKey(match) === localDateKey(new Date()) || isLiveCarryoverMatch(match);
  }

  function renderStreamButtons(match, title, options = {}) {
    if (!shouldShowPlayerButtons(match)) return '';
    const streams = displayStreamsForMatch(match);
    const groupClass = options.groupClass || 'stream-options';
    const buttonClass = options.buttonClass || '';
    if (streams.length) {
      return `
        <div class="stream-entry ${escapeHtml(groupClass)}" aria-label="${escapeHtml(t('liveStreamTitle'))}">
          <div class="stream-entry-label"><span class="stream-entry-dot" aria-hidden="true"></span>${escapeHtml(t('liveStreamTitle'))}</div>
          <div class="stream-entry-actions">
            ${streams
              .map((stream, index) => {
                const lang = String(stream.language_code || stream.languageCode || stream.lang || '').toLowerCase();
                const source = stream.id || stream.label || stream.source_type || stream.sourceType || '';
                const href = playerUrl({
                  match: match.id,
                  title,
                  lang,
                  source,
                  src: stream.url,
                  type: stream.source_type || stream.sourceType || inferStreamType(stream.url),
                });
                const hasLanguageLabel = Boolean(lang || stream.language_code || stream.languageCode || stream.lang || stream.label);
                const label = hasLanguageLabel ? `${t('watchInLanguage')} ${streamLanguageLabel(stream, index)}` : t('watchStream');
                return `<a class="stream-button ${escapeHtml(buttonClass)}" href="${href}"><span aria-hidden="true">▶</span>${escapeHtml(label)}</a>`;
              })
              .join('')}
          </div>
        </div>
      `;
    }
    if (!streamEnabledForMatch(match)) return '';
    return `
      <div class="stream-entry ${escapeHtml(groupClass)}" aria-label="${escapeHtml(t('liveStreamTitle'))}">
        <div class="stream-entry-label"><span class="stream-entry-dot" aria-hidden="true"></span>${escapeHtml(t('liveStreamTitle'))}</div>
        <div class="stream-entry-actions">
          <a class="stream-button ${escapeHtml(buttonClass)}" href="${playerUrl({ match: match.id, title })}"><span aria-hidden="true">▶</span>${escapeHtml(t('watchStream'))}</a>
        </div>
      </div>
    `;
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
      const dateTimeZones = {
        en: 'Europe/Paris',
        es: 'Europe/Paris',
        fr: 'Asia/Riyadh',
        ar: 'Asia/Riyadh',
        mn: 'Asia/Ulaanbaatar',
      };
      const timeZoneLabels = {
        en: 'CEST',
        es: 'CEST',
        fr: 'GMT+3',
        ar: 'GMT+3',
        mn: 'GMT+8',
      };
      const formatted = new Intl.DateTimeFormat(dateLocales[uiLocale] || 'en-GB', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: dateTimeZones[uiLocale] || dateTimeZones.en,
      }).format(new Date(value));
      return `${formatted} ${timeZoneLabels[uiLocale] || timeZoneLabels.en}`;
    } catch {
      return value || 'TBD';
    }
  }

  function formatCountdown(value) {
    const kickoff = Date.parse(value || '');
    if (Number.isNaN(kickoff)) return '--';
    const delta = kickoff - Date.now();
    if (delta <= 0) return '00:00:00';
    const totalSeconds = Math.ceil(delta / 1000);
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const time = [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
    return days > 0 ? `${days}d ${time}` : time;
  }

  function selectHeroMatch(matches = []) {
    const now = Date.now();
    const playableStatuses = new Set(['scheduled', 'live', 'half_time']);
    const playableMatches = heroPlayableMatches(matches, playableStatuses, now);
    return playableMatches.find((match) => {
      const status = String(match?.status || '').toLowerCase();
      return status === 'live' || status === 'half_time';
    }) || playableMatches.find((match) => {
      const kickoff = Date.parse(match?.scheduled_at || match?.scheduledAt || '');
      return !Number.isNaN(kickoff) && kickoff > now;
    }) || playableMatches[0] || null;
  }

  function heroPlayableMatches(matches = [], playableStatuses = new Set(['scheduled', 'live', 'half_time']), now = Date.now()) {
    return matches
      .filter((match) => playableStatuses.has(String(match?.status || 'scheduled')))
      .filter((match) => {
        const kickoff = Date.parse(match?.scheduled_at || match?.scheduledAt || '');
        return Number.isNaN(kickoff) || kickoff > now - 2 * 60 * 60 * 1000;
      })
      .sort((left, right) => {
        const leftTime = Date.parse(left?.scheduled_at || left?.scheduledAt || '');
        const rightTime = Date.parse(right?.scheduled_at || right?.scheduledAt || '');
        return (Number.isNaN(leftTime) ? Number.MAX_SAFE_INTEGER : leftTime)
          - (Number.isNaN(rightTime) ? Number.MAX_SAFE_INTEGER : rightTime);
      });
  }

  function selectHeroMatchGroup(matches = []) {
    const now = Date.now();
    const playableMatches = heroPlayableMatches(matches, new Set(['scheduled', 'live', 'half_time']), now);
    const liveMatches = playableMatches.filter((match) => {
      const status = String(match?.status || '').toLowerCase();
      return status === 'live' || status === 'half_time';
    });
    if (liveMatches.length) return liveMatches;
    const nextMatch = playableMatches.find((match) => {
      const kickoff = Date.parse(match?.scheduled_at || match?.scheduledAt || '');
      return !Number.isNaN(kickoff) && kickoff > now;
    }) || playableMatches[0] || null;
    if (!nextMatch) return [];
    const nextKickoff = Date.parse(nextMatch.scheduled_at || nextMatch.scheduledAt || '');
    if (Number.isNaN(nextKickoff)) return [nextMatch];
    return playableMatches.filter((match) => {
      const kickoff = Date.parse(match?.scheduled_at || match?.scheduledAt || '');
      return !Number.isNaN(kickoff) && Math.abs(kickoff - nextKickoff) < 60_000;
    });
  }

  function renderNextMatchBoard(matches = currentMatches) {
    if (!nextMatchTeams) return;
    if (heroCountdownTimer) {
      clearInterval(heroCountdownTimer);
      heroCountdownTimer = null;
    }

    const group = selectHeroMatchGroup(matches);
    const match = group[0] || null;
    setNodeText('next-match-label', t('nextMatchLabel'));
    setNodeText('next-match-live-label', t('nextMatchLiveLabel'));

    if (!match) {
      if (nextMatchOpen) {
        nextMatchOpen.disabled = true;
        nextMatchOpen.removeAttribute('data-match-id');
      }
      setNodeText('next-match-teams', t('nextMatchFallback'));
      setNodeText('next-match-countdown', '--');
      setNodeText('next-match-meta', t('tournamentTitle'));
      setNodeText('next-match-day', '26');
      if (nextMatchList) {
        nextMatchList.hidden = true;
        nextMatchList.innerHTML = '';
      }
      return;
    }

    const home = teamName(match.home_team);
    const away = teamName(match.away_team);
    const kickoff = match.scheduled_at || match.scheduledAt || '';
    const status = String(match.status || 'scheduled').toLowerCase();
    const hasMultipleMatches = group.length > 1;
    if (nextMatchOpen) {
      nextMatchOpen.disabled = false;
      nextMatchOpen.dataset.matchId = String(match.id || '');
    }
    const updateCountdown = () => {
      if (status === 'live') {
        setNodeText('next-match-countdown', t('nextMatchLiveNow'));
        return;
      }
      if (status === 'half_time') {
        setNodeText('next-match-countdown', t('nextMatchHalfTime'));
        return;
      }
      setNodeText('next-match-countdown', formatCountdown(kickoff));
    };
    if (hasMultipleMatches) {
      const hasLiveGroup = group.some((item) => {
        const itemStatus = String(item?.status || '').toLowerCase();
        return itemStatus === 'live' || itemStatus === 'half_time';
      });
      setNodeText('next-match-label', hasLiveGroup ? t('liveMatchesLabel') : t('nextMatchesLabel'));
    }
    setNodeText('next-match-teams', `${home} vs ${away}`);
    setNodeText('next-match-meta', `${stageName(match)} · ${formatDate(kickoff)}`);
    setNodeText('next-match-day', new Date(kickoff).getDate() || '26');
    if (nextMatchList) {
      const extraMatches = group.slice(1, 4);
      nextMatchList.hidden = extraMatches.length === 0;
      nextMatchList.innerHTML = extraMatches.map((item) => {
        const itemHome = teamName(item.home_team);
        const itemAway = teamName(item.away_team);
        const itemKickoff = item.scheduled_at || item.scheduledAt || '';
        return `
          <button class="next-match-row" type="button" data-match-id="${escapeHtml(item.id)}">
            <strong>${escapeHtml(`${itemHome} vs ${itemAway}`)}</strong>
            <span>${escapeHtml(stageName(item))} · ${escapeHtml(formatDate(itemKickoff))}</span>
          </button>
        `;
      }).join('');
    }
    updateCountdown();
    if (typeof setInterval === 'function') {
      heroCountdownTimer = setInterval(updateCountdown, 1000);
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

  function mergeMatchScoreFromStats(match, stats) {
    if (!match || !stats) return match;
    const homeScore = Number(stats.home_score);
    const awayScore = Number(stats.away_score);
    if (!Number.isFinite(homeScore) && !Number.isFinite(awayScore)) return match;
    return updateCurrentMatch({
      id: match.id,
      home_score: Number.isFinite(homeScore) ? homeScore : match.home_score,
      away_score: Number.isFinite(awayScore) ? awayScore : match.away_score,
    }) || match;
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
        writeNewsStoryCache(item);
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
    renderNextMatchBoard(matches);
    if (!matches.length) {
      grid.innerHTML = `<article class="empty-card">${escapeHtml(t('matchesUnavailable'))}</article>`;
      return;
    }

    const cards = matches.map((match) => {
        const home = teamName(match.home_team);
        const away = teamName(match.away_team);
        const title = `${home} vs ${away}`;
        const status = String(match.status || 'scheduled');
        const displayStatus = status;
        const normalizedStatus = displayStatus.toLowerCase();
        const isLive = normalizedStatus === 'live' || normalizedStatus === 'half_time';
        const hasScore = isLive || normalizedStatus === 'finished';
        const badgeClass = statusBadgeClass(displayStatus);
        const centerLabel = hasScore ? `${match.home_score ?? 0} : ${match.away_score ?? 0}` : 'vs';
        const hasStreams = displayStreamsForMatch(match).length > 0;
        return `
          <article class="match-card${hasStreams ? ' has-streams' : ''}" data-match-id="${escapeHtml(match.id)}" role="button" tabindex="0">
            <div class="match-time">
              <span>${escapeHtml(formatDate(match.scheduled_at))}</span>
              <small>${escapeHtml(leagueName(match))}</small>
            </div>
            <div class="match-main">
              <div class="match-teams" aria-label="${escapeHtml(title)}">
                <span class="team-side">${renderTeamLogo(match.home_team, home)}<span>${escapeHtml(home)}</span></span>
                <span class="match-vs${hasScore ? ' match-score' : ''}">${escapeHtml(centerLabel)}</span>
                <span class="team-side">${renderTeamLogo(match.away_team, away)}<span>${escapeHtml(away)}</span></span>
              </div>
              <div class="match-title">${escapeHtml(title)}</div>
              <div class="match-meta">${escapeHtml(stageName(match))}</div>
            </div>
            <div class="match-actions">
              <div class="match-status ${isLive ? 'live' : ''} ${badgeClass}">${escapeHtml(translateStatus(displayStatus))}</div>
            </div>
            ${renderStreamButtons(match, title, { groupClass: 'match-stream-buttons', buttonClass: 'match-stream-button' })}
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
    let match = currentMatches.find((item) => String(item.id) === String(matchId));
    if (!match) return;
    openMatchId = String(matchId);
    stopLiveDetailRefresh();
    if (options.updateUrl !== false) setMatchUrlParam(matchId);

    const home = teamName(match.home_team);
    const away = teamName(match.away_team);
    const title = `${home} vs ${away}`;
    const status = String(match.status || 'scheduled');
    const displayStatus = status;
    const isLive = displayStatus === 'live' || displayStatus === 'half_time';
    const badgeClass = statusBadgeClass(displayStatus);
    const isLiveStatus = displayStatus === 'live' || displayStatus === 'half_time';
    const matchStats = await fetchMatchStatsPayload(match.id, {
      force: options.force,
      live: isLiveStatus,
      maxAgeMs: isLiveStatus ? 30_000 : 24 * 60 * 60 * 1000,
    });
    match = mergeMatchScoreFromStats(match, matchStats);
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
        <div class="detail-actions detail-actions-top">
          ${renderStreamButtons(match, title, { groupClass: 'detail-streams', buttonClass: 'detail-stream' })}
        </div>
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
    const today = todayLocalKey();

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

  if (nextMatchOpen) {
    nextMatchOpen.addEventListener('click', () => {
      const matchId = nextMatchOpen.dataset.matchId;
      if (matchId) void openMatchDetails(matchId);
    });
  }

  if (nextMatchList) {
    nextMatchList.addEventListener('click', (event) => {
      const row = event.target.closest('[data-match-id]');
      if (row) void openMatchDetails(row.dataset.matchId);
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
  setupSocialDock();
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
