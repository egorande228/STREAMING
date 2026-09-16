(function () {
  // Display labels only. Never use these names to resolve match IDs or streams.
  // 2026/27 membership checked 2026-09-16; sources in TEAM-NAMES.md.
  const rows = [
    ['Arsenal', 'أرسنال', 'pl ucl', ['Arsenal FC']],
    ['Aston Villa', 'أستون فيلا', 'pl ucl', ['Aston Villa FC']],
    ['Bournemouth', 'بورنموث', 'pl', ['AFC Bournemouth']],
    ['Brentford', 'برينتفورد', 'pl', ['Brentford FC']],
    ['Brighton & Hove Albion', 'برايتون أند هوف ألبيون', 'pl', ['Brighton', 'Brighton Hove Albion', 'Brighton and Hove Albion FC']],
    ['Chelsea', 'تشيلسي', 'pl', ['Chelsea FC']],
    ['Coventry City', 'كوفنتري سيتي', 'pl', ['Coventry', 'Coventry City FC']],
    ['Crystal Palace', 'كريستال بالاس', 'pl', ['Crystal Palace FC']],
    ['Everton', 'إيفرتون', 'pl', ['Everton FC']],
    ['Fulham', 'فولهام', 'pl', ['Fulham FC']],
    ['Hull City', 'هال سيتي', 'pl', ['Hull', 'Hull City AFC']],
    ['Ipswich Town', 'إيبسويتش تاون', 'pl', ['Ipswich', 'Ipswich Town FC']],
    ['Leeds United', 'ليدز يونايتد', 'pl', ['Leeds', 'Leeds United FC']],
    ['Liverpool', 'ليفربول', 'pl ucl', ['Liverpool FC']],
    ['Manchester City', 'مانشستر سيتي', 'pl ucl', ['Man City', 'Manchester City FC']],
    ['Manchester United', 'مانشستر يونايتد', 'pl ucl', ['Man United', 'Man Utd', 'Manchester Utd', 'Manchester United FC']],
    ['Newcastle United', 'نيوكاسل يونايتد', 'pl', ['Newcastle', 'Newcastle United FC']],
    ['Nottingham Forest', 'نوتنغهام فورست', 'pl', ['Nottm Forest', 'Nottingham Forest FC']],
    ['Sunderland', 'سندرلاند', 'pl', ['Sunderland AFC']],
    ['Tottenham Hotspur', 'توتنهام هوتسبير', 'pl', ['Tottenham', 'Spurs', 'Tottenham Hotspur FC']],

    ['Athletic Club', 'أتلتيك بلباو', 'laliga', ['Athletic Bilbao', 'Athletic Club Bilbao', 'Athletic']],
    ['Atlético de Madrid', 'أتلتيكو مدريد', 'laliga ucl', ['Atletico Madrid', 'Atleti', 'Club Atletico de Madrid']],
    ['CA Osasuna', 'أوساسونا', 'laliga', ['Osasuna']],
    ['Celta', 'سيلتا فيغو', 'laliga', ['Celta Vigo', 'RC Celta', 'RC Celta de Vigo', 'Real Club Celta de Vigo']],
    ['Deportivo Alavés', 'ديبورتيفو ألافيس', 'laliga', ['Alaves', 'CD Alaves']],
    ['Elche CF', 'إلتشي', 'laliga', ['Elche']],
    ['FC Barcelona', 'برشلونة', 'laliga ucl', ['Barcelona', 'Barca']],
    ['Getafe CF', 'خيتافي', 'laliga', ['Getafe']],
    ['Levante UD', 'ليفانتي', 'laliga', ['Levante']],
    ['Málaga CF', 'مالقة', 'laliga', ['Malaga']],
    ['R. Racing Club', 'راسينغ سانتاندير', 'laliga', ['Racing Santander', 'Racing de Santander', 'Real Racing Club de Santander', 'Real Racing Club', 'Racing']],
    ['Rayo Vallecano', 'رايو فاييكانو', 'laliga', ['Rayo Vallecano de Madrid']],
    ['RC Deportivo', 'ديبورتيفو لا كورونيا', 'laliga', ['Deportivo La Coruna', 'Deportivo de La Coruna', 'RC Deportivo La Coruna', 'Deportivo']],
    ['RCD Espanyol de Barcelona', 'إسبانيول', 'laliga', ['Espanyol', 'RCD Espanyol']],
    ['Real Betis', 'ريال بيتيس', 'laliga ucl', ['Real Betis Balompie', 'Betis']],
    ['Real Madrid', 'ريال مدريد', 'laliga ucl', ['Real Madrid CF']],
    ['Real Sociedad', 'ريال سوسيداد', 'laliga', ['Real Sociedad de Futbol']],
    ['Sevilla FC', 'إشبيلية', 'laliga', ['Sevilla']],
    ['Valencia CF', 'فالنسيا', 'laliga', ['Valencia']],
    ['Villarreal CF', 'فياريال', 'laliga ucl', ['Villarreal']],

    ['AEK Athens', 'آيك أثينا', 'ucl', ['AEK', 'AEK Athens FC', 'PAE AEK']],
    ['Bayern München', 'بايرن ميونخ', 'ucl', ['Bayern Munich', 'Bayern', 'FC Bayern Munchen', 'FC Bayern Munich']],
    ['Bodø/Glimt', 'بودو غليمت', 'ucl', ['Bodo Glimt', 'FK Bodo Glimt']],
    ['Borussia Dortmund', 'بوروسيا دورتموند', 'ucl', ['Dortmund', 'B. Dortmund', 'BVB', 'BV Borussia 09 Dortmund']],
    ['Club Brugge', 'كلوب بروج', 'ucl', ['Club Brugge KV', 'Brugge']],
    ['Como', 'كومو', 'ucl', ['Como 1907', 'Como 1907 FC']],
    ['Fenerbahçe', 'فنربخشة', 'ucl', ['Fenerbahce SK', 'Fenerbahce Istanbul']],
    ['Feyenoord', 'فينورد', 'ucl', ['Feyenoord Rotterdam']],
    ['Galatasaray', 'غلطة سراي', 'ucl', ['Galatasaray SK', 'Galatasaray Istanbul']],
    ['Inter', 'إنتر ميلان', 'ucl', ['Inter Milan', 'Internazionale', 'Internazionale Milano', 'FC Internazionale Milano']],
    ['LASK', 'لاسك لينتس', 'ucl', ['LASK Linz', 'Linzer ASK']],
    ['Leipzig', 'لايبزيغ', 'ucl', ['RB Leipzig', 'RasenBallsport Leipzig']],
    ['Lens', 'لانس', 'ucl', ['RC Lens', 'Racing Club de Lens']],
    ['Lille', 'ليل', 'ucl', ['LOSC', 'Lille OSC', 'LOSC Lille']],
    ['Napoli', 'نابولي', 'ucl', ['SSC Napoli', 'SS Napoli']],
    ['Paris Saint-Germain', 'باريس سان جيرمان', 'ucl', ['Paris', 'PSG', 'Paris SG', 'Paris Saint Germain FC']],
    ['Porto', 'بورتو', 'ucl', ['FC Porto']],
    ['PSV', 'بي إس في آيندهوفن', 'ucl', ['PSV Eindhoven']],
    ['Roma', 'روما', 'ucl', ['AS Roma']],
    ['Sabah', 'صباح', 'ucl', ['Sabah FK', 'Sabah FC', 'Sabah Baku']],
    ['Shakhtar', 'شاختار دونيتسك', 'ucl', ['Shakhtar Donetsk', 'FC Shakhtar Donetsk']],
    ['Slavia Praha', 'سلافيا براغ', 'ucl', ['Slavia Prague', 'SK Slavia Praha']],
    ['Slovan Bratislava', 'سلوفان براتيسلافا', 'ucl', ['SK Slovan Bratislava', 'Slovan']],
    ['Sporting CP', 'سبورتينغ لشبونة', 'ucl', ['Sporting', 'Sporting Lisbon', 'Sporting Clube de Portugal']],
    ['Stuttgart', 'شتوتغارت', 'ucl', ['VfB Stuttgart', 'VfB Stuttgart 1893']],
    ['Viking', 'فيكينغ', 'ucl', ['Viking FK', 'Viking Stavanger']],
  ];

  function normalize(value) {
    return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/ø/g, 'o').replace(/&/g, ' and ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  }

  const names = new Map();
  const teams = Object.freeze(rows.map(([name, ar, competitions, aliases]) => {
    for (const alias of [name, ...aliases]) names.set(normalize(alias), ar);
    return Object.freeze({ name, ar, competitions: Object.freeze(competitions.split(' ')), aliases: Object.freeze(aliases) });
  }));

  function arabicName(team) {
    if (typeof team?.name_ar === 'string' && /[\u0600-\u06ff]/.test(team.name_ar)) return team.name_ar.trim();
    for (const value of [team?.name_en, team?.name, team?.short_name]) {
      const label = names.get(normalize(value));
      if (label) return label;
    }
    return '';
  }

  window.KINGLIVE_TEAM_NAMES = Object.freeze({ teams, arabicName });
})();
