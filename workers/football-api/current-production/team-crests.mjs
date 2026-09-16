function teamKey(name='') {
  return String(name).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/\b(fc|afc|ssc|sk|cf|fk)\b/g,'').replace(/[^a-z0-9]/g,'');
}
const aliases = {feyenoordrotterdam:'feyenoord',parissaintgermain:'parissaintgermain',atleticomadrid:'clubatleticodemadrid'};
export function addTeamCrests(matches, teams) {
  const index = new Map();
  for (const team of teams || []) {
    if (!/^https:\/\//.test(team.crest || '')) continue;
    for (const name of [team.name,team.shortName]) {
      if (!name) continue;
      const k=teamKey(name);const old=index.get(k);
      index.set(k,index.has(k) && old!==team.crest?null:team.crest);
    }
  }
  const enrich = team => {
    if (!team || team.flag_url) return team;
    const k=teamKey(team.name_en || team.name);
    const crest=index.get(k) || index.get(aliases[k]);
    return crest?{...team,flag_url:crest}:team;
  };
  return matches.map(match=>({...match,home_team:enrich(match.home_team),away_team:enrich(match.away_team)}));
}
