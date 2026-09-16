// Match metadata adapters with canonical identity registration; never write stream or scheduler state.
import { sharedUpstream } from './upstream-cache.mjs';

const PL = 'https://sdp-prem-prod.premier-league-prod.pulselive.com/api';
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1';
const UEFA = 'https://match.uefa.com/v5';
const aliases = new Map([
  ['feyenoordrotterdam','feyenoord'], ['parissaintgermain','paris'],
  ['manchestercity','mancity'], ['manchesterunited','manunited'],
  ['vfbstuttgart','stuttgart'], ['slovanbratislava','sbratislava'],
  ['atleticomadrid','atletico'], ['athleticclub','athleticbilbao'],
  ['psveindhoven','psv'], ['bayernmunich','bayern'], ['bayernmunchen','bayern'],
  ['shakhtardonetsk','shakhtar'], ['asroma','roma'], ['slaviaprague','slaviapraha'],
  ['sabahfk','sabah'], ['bodoglimt','bodoglimt'],
  ['manutd','manunited'], ['rbleipzig','leipzig'],
  ['atleticodemadrid','atletico'], ['atleti','atletico'], ['vikingfk','viking'],
  ['brentfordfc','brentford'], ['arsenalfc','arsenal'],
  ['brightonandhovealbion','brightonhovealbion'],
  ['rracingclub','racingsantander'], ['deportivoalaves','alaves'],
  ['caosasuna','osasuna'], ['rcdespanyoldebarcelona','espanyol'],
  ['elchecf','elche'], ['villarrealcf','villarreal'], ['rcdeportivo','deportivolacoruna'],
  ['sevillafc','sevilla'], ['valenciacf','valencia'], ['fcbarcelona','barcelona'],
  ['malagacf','malaga'], ['levanteud','levante'], ['getafecf','getafe'], ['celta','celtavigo'],
]);
export function teamKey(name) {
  const key = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ø/g,'o').replace(/[^a-z0-9]/g,'');
  return aliases.get(key) || key;
}

export function uefaCalendarMatch(x) {
  const time=x.kickOffTime?.dateTime;
  if(!/^\d{4}-\d{2}-\d{2}T/.test(time||'') || !/^\d+$/.test(String(x.id)))return null;
  const out={id:7000000000000+Number(x.id),external_id:String(x.id),uefa_id:String(x.id),source_match_id:String(x.id),card_source:'uefa',scheduled_at:time,league:{id:2,name:'UEFA Champions League'},stage:'',venue:x.stadium?.internationalName || '',city:x.stadium?.city?.translations?.name?.EN || '',streams:[]};
  status(out,x.status);
  if(!out.status)return null;
  score(out,x.score?.total?.home,x.score?.total?.away);
  for(const side of ['home','away']){const t=x[side+'Team'];if(!t?.internationalName || !t.id)return null;out[side+'_team']={id:Number(t.id),external_id:String(t.id),name_en:t.internationalName,name_ru:t.translations?.displayName?.RU || t.internationalName,flag_url:t.mediumLogoUrl || t.logoUrl || ''};}
  return out;
}

export async function uefaSchedule(date,env) {
  const year=Number(date.slice(0,4))-(Number(date.slice(5,7))<7?1:0)+1;
  const url=`${UEFA}/matches?competitionId=1&seasonYear=${year}&limit=500&offset=0`;
  const response=await sharedUpstream(env.MATCH_REGISTRY,'uefa-primary-v1:'+url,async()=>{
    const r=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
    if(!r.ok)return {ok:false,status:r.status,body:null};
    const raw=await r.json();if(!Array.isArray(raw)||raw.length>=500)throw Error('incomplete_uefa_calendar');
    const rows=raw.map(uefaCalendarMatch).filter(Boolean);
    // Unknown statuses on the requested day must trigger fallback, not hide games.
    const invalidDates=[...new Set(raw.filter(x=>!uefaCalendarMatch(x)).map(x=>x.kickOffTime?.date).filter(Boolean))];
    return {ok:true,status:200,body:{rows,invalidDates}};
  },{provider:'uefa-primary',ttl:60000,gap:1500});
  if(!response.ok||response.body.invalidDates.includes(date))return null;
  return response.body.rows.filter(m=>m.scheduled_at.slice(0,10)===date);
}

export function matchUefaIdentity(official,rows,provider='uefa') {
  const key=provider==='laliga'?'laliga_id':provider==='pl'?'pl_id':'uefa_id';
  rows=rows.filter(m=>!m.canonical_redirect_to);
  const exact=rows.filter(m=>String(m[key]||'')===official[key]);
  if(exact.length>1)throw Error('ambiguous_official_identity');
  if(exact.length)return exact[0];
  const same=rows.filter(m=>(provider==='laliga'?/la ?liga/i:provider==='pl'?/premier league/i:/champions league/i).test(m.league?.name||'') && m.scheduled_at?.slice(0,10)===official.scheduled_at.slice(0,10) && teamKey(m.home_team?.name_en)===teamKey(official.home_team.name_en) && teamKey(m.away_team?.name_en)===teamKey(official.away_team.name_en));
  if(same.length>1)throw Error('ambiguous_existing_identity');
  return same[0] || null;
}

export async function registerUefaDay(official,db,provider='uefa') {
  if(!['uefa','pl','laliga'].includes(provider))throw Error('unknown_provider');
  if(!db)throw Error('registry_required');
  const {results}=await db.prepare('SELECT canonical_id,payload_json FROM public_match_registry ORDER BY observed_at DESC LIMIT 2000').all();
  if(results.length>=2000)throw Error('registry_scan_incomplete');
  const known=results.map(r=>({...JSON.parse(r.payload_json),id:r.canonical_id}));
  // Resolve every match before writes; conflicts stop the migration for this day.
  const planned=official.map(m=>({m,old:matchUefaIdentity(m,known,provider)}));
  const out=[];
  for(const {m,old} of planned) {
    const {streams,...safe}=m;
    const merged=old?{...old,...safe,id:old.id,external_id:old.external_id,stage:old.stage||safe.stage,home_team:{...old.home_team,flag_url:m.home_team.flag_url||old.home_team.flag_url},away_team:{...old.away_team,flag_url:m.away_team.flag_url||old.away_team.flag_url}}:safe;
    delete merged.streams;
    if(old)await db.prepare('UPDATE public_match_registry SET payload_json=?,observed_at=? WHERE canonical_id=?').bind(JSON.stringify(merged),Date.now(),old.id).run();
    else await db.prepare("INSERT INTO public_match_registry(provider,external_id,canonical_id,payload_json,observed_at) VALUES(?,?,?,?,?) ON CONFLICT(provider,external_id) DO UPDATE SET payload_json=excluded.payload_json,observed_at=excluded.observed_at").bind(provider,m[provider==='laliga'?'laliga_id':provider==='pl'?'pl_id':'uefa_id'],m.id,JSON.stringify(merged),Date.now()).run();
    out.push({...merged,streams:[]});
  }
  return out;
}

export function laligaCalendarMatch(x) {
  if(x.competition?.slug!=='primera-division'||!/^\d+$/.test(String(x.id))||!x.time||!/(?:Z|[+-]\d{2}:\d{2})$/.test(x.time))return null;
  const date=new Date(x.time);if(!Number.isFinite(date.getTime()))return null;
  const out={id:7200000000000+Number(x.id),external_id:String(x.id),laliga_id:String(x.id),source_match_id:String(x.id),card_source:'laliga',scheduled_at:date.toISOString(),league:{id:140,name:'La Liga',country:'Spain'},stage:x.gameweek?.week?`Matchday ${x.gameweek.week}`:'',venue:x.venue?.name||'',city:x.venue?.city||'',streams:[]};
  status(out,x.status);if(!out.status)return null;
  if(typeof x.slug==='string' && /^[a-z0-9-]+$/.test(x.slug))out.laliga_slug=x.slug;
  if(out.status!=='scheduled')score(out,x.home_score,x.away_score);
  for(const side of ['home','away']){const t=x[side+'_team'];if(!t?.nickname||!/^\d+$/.test(String(t.id)))return null;const logo=t.shield?.resizes?.medium||t.shield?.url||'';out[side+'_team']={id:Number(t.id),external_id:String(t.id),name_en:t.nickname,name_ru:t.nickname,code:t.shortname||'',flag_url:logo.startsWith('https://assets.laliga.com/')?logo:''};}
  return out;
}

async function boundedLaligaText(response,maxBytes) {
  const reader=response.body.getReader(),chunks=[];let size=0;
  try { for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw Error('laliga_response_too_large');}chunks.push(value);} }
  finally {reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}return new TextDecoder().decode(bytes);
}
export async function laligaSchedule(date,env) {
  const year=Number(date.slice(0,4))-(Number(date.slice(5,7))<7?1:0);
  const response=await sharedUpstream(env.MATCH_REGISTRY,`laliga-primary-v2:${year}`,async()=>{
    // Public website configuration, never persisted: no private account credentials.
    const page=await fetch('https://www.laliga.com/en-GB/laliga-easports/results',{signal:AbortSignal.timeout(8000)});
    if(!page.ok)return {ok:false,status:page.status,body:null};
    const html=await boundedLaligaText(page,1500000);const raw=html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)?.[1];
    if(!raw)throw Error('laliga_config_missing');
    const config=JSON.parse(raw),subscription=config.props?.pageProps?.matches?.[0]?.subscription?.slug;
    if(!subscription?.endsWith('-'+year)||!config.runtimeConfig?.backendSubscription)throw Error('laliga_season_unavailable');
    const pages=await Promise.all([0,100,200,300].map(async offset=>{
      const r=await fetch(`https://apim.laliga.com/public-service/api/v1/matches?subscriptionSlug=${encodeURIComponent(subscription)}&limit=100&offset=${offset}`,{headers:{'Ocp-Apim-Subscription-Key':config.runtimeConfig.backendSubscription,'Accept-Language':'en'},signal:AbortSignal.timeout(8000)});
      if(!r.ok)throw Error('laliga_calendar_unavailable');return JSON.parse(await boundedLaligaText(r,5000000));
    }));
    const total=pages[0].total;
    if(!Number.isInteger(total)||total<1||total>400||pages.some(p=>p.total!==total||!Array.isArray(p.matches)))throw Error('bad_laliga_calendar');
    const rawMatches=pages.flatMap(p=>p.matches);
    if(rawMatches.length!==total||new Set(rawMatches.map(m=>m.id)).size!==total)throw Error('incomplete_laliga_calendar');
    const rows=[],invalidDates=[];
    for(const raw of rawMatches){const m=laligaCalendarMatch(raw);if(m)rows.push(m);else invalidDates.push(String(raw.date||'').slice(0,10));}
    return {ok:true,status:200,body:{rows,invalidDates}};
  },{provider:'laliga-primary',ttl:60000,gap:2000});
  if(!response.ok||response.body.invalidDates.includes(date))return null;
  return response.body.rows.filter(m=>m.scheduled_at.slice(0,10)===date);
}

export function plCalendarMatch(x) {
  if(!/^\d+$/.test(String(x.matchId))||!['BST','GMT'].includes(x.kickoffTimezone)||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(x.kickoff||''))return null;
  const date=new Date(x.kickoff.replace(' ','T')+(x.kickoffTimezone==='BST'?'+01:00':'+00:00'));
  if(!Number.isFinite(date.getTime()))return null;
  const out={id:7100000000000+Number(x.matchId),external_id:String(x.matchId),pl_id:String(x.matchId),source_match_id:String(x.matchId),card_source:'premierleague',scheduled_at:date.toISOString(),league:{id:39,name:'Premier League',country:'England'},stage:x.matchWeek?`Matchweek ${x.matchWeek}`:'',venue:x.ground||'',city:'',streams:[]};
  status(out,x.period);if(!out.status)return null;
  if(out.status!=='scheduled')score(out,x.homeTeam?.score,x.awayTeam?.score);
  for(const side of ['home','away']){const t=x[side+'Team'];if(!t?.name||!/^\d+$/.test(String(t.id)))return null;out[side+'_team']={id:Number(t.id),external_id:String(t.id),name_en:t.name,name_ru:t.name,code:t.abbr||'',flag_url:`https://resources.premierleague.com/premierleague/badges/t${t.id}.svg`};}
  return out;
}

export async function plSchedule(date,env) {
  const year=Number(date.slice(0,4))-(Number(date.slice(5,7))<7?1:0);
  const response=await sharedUpstream(env.MATCH_REGISTRY,`pl-primary-v2:${year}`,async()=>{
    const rows=[],invalidDates=[];let cursor='';
    for(let page=0;page<5;page++) {
      const url=`${PL}/v2/matches?competition=8&season=${year}&_limit=100${cursor?'&_next='+encodeURIComponent(cursor):''}`;
      const r=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(5000)});
      if(!r.ok)return {ok:false,status:r.status,body:null};
      const data=await r.json();if(!Array.isArray(data.data))throw Error('bad_pl_calendar');
      for(const raw of data.data){const m=plCalendarMatch(raw);if(m)rows.push(m);else invalidDates.push(String(raw.kickoff||'').slice(0,10));}
      cursor=data.pagination?._next||'';if(!cursor)break;
    }
    if(cursor||!rows.length)throw Error('incomplete_pl_calendar');
    return {ok:true,status:200,body:{rows,invalidDates}};
  },{provider:'pl-primary',ttl:60000,gap:2000});
  if(!response.ok||response.body.invalidDates.includes(date))return null;
  return response.body.rows.filter(m=>m.scheduled_at.slice(0,10)===date);
}

// Transitional display adapter: provider IDs, streams and registry remain untouched.
// A missing/ambiguous fixture keeps the original card, never borrows another match.
export function mergePublicCard(match, fixtures, source) {
  const f=selectFixture(match,fixtures);
  if(!f)return match;
  const out={...match,scheduled_at:f.date,card_source:source,source_match_id:String(f.id)};
  if(f.status)out.status=f.status;
  if(Number.isFinite(f.home_score))out.home_score=f.home_score;
  if(Number.isFinite(f.away_score))out.away_score=f.away_score;
  for(const side of ['home','away']) {
    const logo=f[side+'_logo'];
    if(typeof logo==='string' && /^https:\/\//.test(logo))out[side+'_team']={...match[side+'_team'],flag_url:logo};
  }
  return out;
}
export async function publicMatchCards(matches,env) {
  const groups=new Map();
  for(const m of matches) {
    if(m.pl_id || m.uefa_id || m.laliga_id)continue;
    const league=String(m.league?.name || '').toLowerCase();
    const source=/champions league/.test(league)?'uefa':/premier league/.test(league)?'pl':/la liga|laliga/.test(league)?'espn':null;
    const date=String(m.scheduled_at || '').slice(0,10);
    if(source && /^\d{4}-\d{2}-\d{2}$/.test(date))groups.set(source+date,{source,date});
  }
  let result=matches;
  for(const {source,date} of groups.values()) {
    try {
      const year=Number(date.slice(0,4))-(Number(date.slice(5,7))<7?1:0);
      const get=async(url,project)=>{
        const response=await sharedUpstream(env.MATCH_REGISTRY,'cards-v1:'+url,async()=>{
          const r=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
          if(!r.ok)return {ok:false,status:r.status,body:null};
          return {ok:true,status:200,body:project(await r.json())};
        },{provider:'cards-'+source,ttl:60000,gap:1500});
        if(!response.ok)throw Error('cards_unavailable');return response.body;
      };
      const state=value=>{const o={};status(o,value);return o.status;};
      let rows=[];
      if(source==='uefa')rows=await get(`${UEFA}/matches?competitionId=1&seasonYear=${year+1}&limit=500&offset=0`,data=>{
        if(!Array.isArray(data)||data.length>=500)throw Error('incomplete_calendar');
        return data.map(x=>({id:x.id,date:x.kickOffTime?.dateTime,home:x.homeTeam?.internationalName,away:x.awayTeam?.internationalName,status:state(x.status),home_score:x.score?.total?.home,away_score:x.score?.total?.away,home_logo:x.homeTeam?.mediumLogoUrl,away_logo:x.awayTeam?.mediumLogoUrl}));
      });
      if(source==='pl') {
        let cursor='';
        for(let page=0;page<5;page++) {
          const body=await get(`${PL}/v2/matches?competition=8&season=${year}&_limit=100${cursor?'&_next='+encodeURIComponent(cursor):''}`,x=>{
            if(!Array.isArray(x.data))throw Error('bad_calendar');
            return {rows:x.data.map(m=>({id:m.matchId,date:m.kickoff,home:m.homeTeam?.name,away:m.awayTeam?.name,status:state(m.period),home_score:m.homeTeam?.score,away_score:m.awayTeam?.score})),next:x.pagination?._next||''};
          });rows.push(...body.rows);cursor=body.next;if(!cursor)break;
        }
        if(cursor)throw Error('incomplete_calendar');
      }
      if(source==='espn')rows=await get(`${ESPN}/scoreboard?dates=${date.replaceAll('-','')}&limit=100`,x=>{
        if(!Array.isArray(x.events)||x.events.length>=100)throw Error('bad_calendar');
        return x.events.map(e=>{const c=e.competitions?.[0],h=c?.competitors?.find(t=>t.homeAway==='home'),a=c?.competitors?.find(t=>t.homeAway==='away');return {id:e.id,date:e.date,home:h?.team?.displayName,away:a?.team?.displayName,status:state(e.status?.type?.name),home_score:h?.score==null?undefined:Number(h.score),away_score:a?.score==null?undefined:Number(a.score),home_logo:h?.team?.logo,away_logo:a?.team?.logo};});
      });
      result=result.map(m=>groups.get(source+String(m.scheduled_at).slice(0,10)) && (/champions league/i.test(m.league?.name)?'uefa':/premier league/i.test(m.league?.name)?'pl':'espn')===source?mergePublicCard(m,rows,source):m);
    } catch { /* Retain existing metadata on upstream failure. */ }
  }
  return result;
}
export function selectFixture(match, fixtures) {
  const day = String(match.scheduled_at || '').slice(0,10);
  const home = teamKey(match.home_team?.name_en || match.home_team?.name);
  const away = teamKey(match.away_team?.name_en || match.away_team?.name);
  if (!home || !away || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const hits = fixtures.filter(f => f.date?.slice(0,10) === day && teamKey(f.home) === home && teamKey(f.away) === away);
  return hits.length === 1 ? hits[0] : null; // Ambiguous matches must never borrow another game's facts.
}
function empty(id, source) { return {match_id:id,source,events:[],lineups:[],team_stats:[],facts:[]}; }
function score(out,home,away) { const h=numeric(home),a=numeric(away);if(h!==null)out.home_score=h;if(a!==null)out.away_score=a; }
function status(out,value) {
  const map={FINISHED:'finished',FullTime:'finished',STATUS_FULL_TIME:'finished',FirstHalf:'live',SecondHalf:'live',IN_PLAY:'live',HalfTime:'half_time',PAUSED:'half_time',PreMatch:'scheduled',UPCOMING:'scheduled',SCHEDULED:'scheduled',STATUS_SCHEDULED:'scheduled',POSTPONED:'postponed',CANCELLED:'cancelled'};
  if(map[value])out.status=map[value];
}
function fact(out,title,value) { if (value !== undefined && value !== null && value !== '') out.facts.push({title,text:String(value)}); }
function numeric(value) { if (value == null || value === '') return null; const n=Number(String(value).replace('%','')); return Number.isFinite(n)?n:null; }
function stats(values,map) { return Object.fromEntries(Object.entries(map).flatMap(([key,field])=>{const n=numeric(values?.[field]);return n===null?[]:[[key,n]];})); }
export function normalizePl(id, match, statistics, lineups, events) {
  const out=empty(id,'premierleague');
  score(out,match.homeTeam?.score,match.awayTeam?.score);
  status(out,match.period);out.venue=match.ground || '';if(numeric(match.clock)!==null)out.minute=numeric(match.clock);
  const map={possession:'possessionPercentage',shots_on_goal:'ontargetScoringAtt',total_shots:'totalScoringAtt',corners:'wonCorners',fouls:'fkFoulLost',yellow_cards:'yellowCard',red_cards:'redCard',expected_goals:'expectedGoals'};
  for(const side of ['home','away']) {
    const team=match[side+'Team'];
    out.team_stats.push({team:{name:team?.name},stats:stats(statistics?.find?.(s=>s.side?.toLowerCase()===side)?.stats,map)});
    const players=lineups?.[side+'_team']?.players || [];
    const names=new Map(players.map(p=>[String(p.id),p.knownName || [p.firstName,p.lastName].filter(Boolean).join(' ')]));
    out.lineups.push(...players.map(p=>({id:p.id,team:side,player_name:names.get(String(p.id)),number:p.shirtNum,position:p.subPosition || p.position,is_starter:p.position!=='Substitute'})));
    const e=events?.[side+'Team'] || {};
    for(const [group,type] of [['goals','goal'],['cards','yellow_card'],['subs','substitution']]) for(const row of e[group] || []) {
      const [minute,extra]=String(row.time||'').split('+');
      out.events.push({team:side,type:group==='cards' && /red/i.test(row.type)?'red_card':type,minute:numeric(minute),extra_minute:numeric(extra),player_name:names.get(String(row.playerId || row.playerOnId)) || '',detail:group==='subs'?names.get(String(row.playerOffId)) || '': ''});
    }
  }
  out.events.sort((a,b)=>(a.minute||0)-(b.minute||0)||(a.extra_minute||0)-(b.extra_minute||0));
  fact(out,'Stadium',match.ground);fact(out,'Attendance',match.attendance);
  if(match.homeTeam?.score!=null && match.awayTeam?.score!=null) fact(out,'Score',`${match.homeTeam.score} – ${match.awayTeam.score}`);
  return out;
}
export function normalizeUefa(id, match, lineups) {
  const out=empty(id,'uefa');
  score(out,match.score?.total?.home,match.score?.total?.away);
  status(out,match.status);
  out.venue=match.stadium?.internationalName || match.stadium?.translations?.name?.EN || match.stadium?.name || '';
  out.city=match.stadium?.city?.translations?.name?.EN || match.stadium?.city?.name || '';
  out.teams=['home','away'].map(side=>({team:{name:match[side+'Team']?.internationalName},stats:{}}));
  for(const side of ['home','away']) for(const group of ['field','bench']) for(const row of lineups?.[side+'Team']?.[group] || []) out.lineups.push({id:row.player?.id,team:side,player_name:row.player?.internationalName,number:row.jerseyNumber,position:row.player?.fieldPosition,is_starter:group==='field'});
  out.events=(match.playerEvents?.scorers || []).map(e=>({id:e.id,team:String(e.teamId)===String(match.homeTeam?.id)?'home':'away',type:e.goalType==='OWN'?'own_goal':'goal',minute:e.time?.minute,extra_minute:e.time?.injuryMinute,player_name:e.player?.internationalName})).sort((a,b)=>a.minute-b.minute);
  fact(out,'Stadium',match.stadium?.internationalName || match.stadium?.name);
  fact(out,'Attendance',match.matchAttendance);
  if(match.score?.total) fact(out,'Score',`${match.score.total.home} – ${match.score.total.away}`);
  fact(out,'Player of the match',match.playerOfTheMatch?.player?.internationalName);
  return out;
}
export function normalizeEspn(id, data) {
  const out=empty(id,'espn');
  status(out,data.header?.competitions?.[0]?.status?.type?.name);
  out.venue=data.gameInfo?.venue?.fullName || '';
  out.city=data.gameInfo?.venue?.address?.city || '';
  const competitors=data.header?.competitions?.[0]?.competitors || [];
  const sideById=new Map(competitors.map(c=>[String(c.id),c.homeAway]));
  const map={possession:'possessionPct',shots_on_goal:'shotsOnTarget',total_shots:'totalShots',corners:'wonCorners',fouls:'foulsCommitted',yellow_cards:'yellowCards',red_cards:'redCards'};
  out.team_stats=(data.boxscore?.teams || []).map(t=>({team:{name:t.team?.displayName},side:sideById.get(String(t.team?.id)),stats:stats(Object.fromEntries((t.statistics || []).map(s=>[s.name,s.displayValue])),map)})).sort((a,b)=>a.side===b.side?0:a.side==='home'?-1:1);
  for(const team of data.rosters || []) for(const p of team.roster || []) out.lineups.push({id:p.athlete?.id,team:team.homeAway,player_name:p.athlete?.displayName,number:p.jersey,position:p.position?.abbreviation,is_starter:p.starter===true});
  out.events=(data.keyEvents || []).map(e=>{const clock=String(e.clock?.displayValue || '').match(/(\d+)(?:'?[+]\s*(\d+))?/); const label=String(e.type?.text || '');return {id:e.id,team:sideById.get(String(e.team?.id)),minute:clock?Number(clock[1]):null,extra_minute:clock?.[2]?Number(clock[2]):null,type:/red card/i.test(label)?'red_card':/yellow/i.test(label)?'yellow_card':/substitution/i.test(label)?'substitution':/goal/i.test(label)?'goal':'event',player_name:(e.participants || e.athletesInvolved || []).map(p=>p.athlete?.displayName || p.displayName).filter(Boolean).join(' / '),detail:label};});
  fact(out,'Stadium',data.gameInfo?.venue?.fullName);fact(out,'Attendance',data.gameInfo?.attendance);
  const h=competitors.find(c=>c.homeAway==='home'),a=competitors.find(c=>c.homeAway==='away');
  if(data.header?.competitions?.[0]?.status?.type?.state !== 'pre') score(out,h?.score,a?.score);
  if(h?.score!=null && a?.score!=null) fact(out,'Score',`${h.score} – ${a.score}`);
  return out;
}

export async function publicMatchDetails(match,env) {
  const league=String(match.league?.name || match.league?.name_en || '').toLowerCase();
  if(/la liga|laliga/.test(league))return laligaDetails(match,env);
  const source=/champions league/.test(league)?'uefa':/premier league/.test(league)?'pl':/la liga|laliga/.test(league)?'espn':null;
  if(!source) return null;
  const date=String(match.scheduled_at || '').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const year=Number(date.slice(0,4))-(Number(date.slice(5,7))<7?1:0);
  const get=async(url,ttl=60000)=>{
    const response=await sharedUpstream(env.MATCH_REGISTRY,url,async()=>{
      const r=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
      if(!r.ok) return {ok:false,status:r.status,body:null};
      let body=await r.json();
      // UEFA season responses contain full player biographies. Cache only identity
      // fields here; detailed match data is fetched separately (D1 has row limits).
      if(source==='uefa' && url.includes('/matches?') && Array.isArray(body)) body=body.map(x=>({id:x.id,kickOffTime:{date:x.kickOffTime?.date},homeTeam:{internationalName:x.homeTeam?.internationalName},awayTeam:{internationalName:x.awayTeam?.internationalName}}));
      return {ok:true,status:200,body};
    },{provider:'details-'+source,ttl,gap:1200});
    if(!response.ok) throw Error('match_details_unavailable');return response.body;
  };
  let selected;
  if(source==='uefa') {
    const rows=await get(`${UEFA}/matches?competitionId=1&seasonYear=${year+1}&limit=500&offset=0`,300000);
    if(!Array.isArray(rows) || rows.length>=500) return null;
    selected=selectFixture(match,rows.map(x=>({id:x.id,date:x.kickOffTime?.date,home:x.homeTeam?.internationalName,away:x.awayTeam?.internationalName})));
    if(!selected)return null;
    const details=await get(`${UEFA}/matches/${selected.id}`);
    const lineups=await get(`${UEFA}/matches/${selected.id}/lineups`).catch(()=>null);
    return normalizeUefa(match.id,details,lineups);
  }
  if(source==='pl') {
    const rows=[];let cursor='';
    for(let page=0;page<5;page++) {
      const data=await get(`${PL}/v2/matches?competition=8&season=${year}&_limit=100${cursor?'&_next='+encodeURIComponent(cursor):''}`,300000);
      if(!Array.isArray(data.data))return null;
      rows.push(...data.data);cursor=data.pagination?._next || '';if(!cursor)break;
    }
    if(cursor)return null;
    selected=selectFixture(match,rows.map(x=>({id:x.matchId,date:x.kickoff,home:x.homeTeam?.name,away:x.awayTeam?.name,raw:x})));
    if(!selected)return null;
    const parts=await Promise.all([`v3/matches/${selected.id}/stats`,`v3/matches/${selected.id}/lineups`,`v1/matches/${selected.id}/events`].map(p=>get(`${PL}/${p}`).catch(()=>null)));
    if(parts.every(p=>p===null))return null;
    return normalizePl(match.id,selected.raw,...parts);
  }
  const data=await get(`${ESPN}/scoreboard?dates=${date.replaceAll('-','')}&limit=100`);
  selected=selectFixture(match,(data.events || []).map(x=>({id:x.id,date:x.date,home:x.competitions?.[0]?.competitors?.find(c=>c.homeAway==='home')?.team?.displayName,away:x.competitions?.[0]?.competitors?.find(c=>c.homeAway==='away')?.team?.displayName})));
  return selected?normalizeEspn(match.id,await get(`${ESPN}/summary?event=${selected.id}`)):null;
}

export function normalizeLaliga(match,page) {
  const raw=page?.match,official=raw && laligaCalendarMatch(raw);
  if(!official || (match.laliga_id && String(match.laliga_id)!==String(raw.id)) ||
    !selectFixture(match,[{date:official.scheduled_at,home:official.home_team.name_en,away:official.away_team.name_en}]))throw Error('laliga_identity_mismatch');
  const out=empty(match.id,'laliga');
  out.status=official.status;out.venue=official.venue;out.city=official.city;
  if(out.status!=='scheduled')score(out,raw.home_score,raw.away_score);
  const map={possession:'possession_percentage',shots_on_goal:'ontarget_scoring_att',total_shots:'total_scoring_att',corners:'won_corners',fouls:'fk_foul_lost',yellow_cards:'total_yel_card',red_cards:'total_red_card'};
  const name=p=>p?.nickname||p?.name||'';
  for(const side of ['home','away']) {
    const values=page.data?.stats?.[side];
    if(values && Object.keys(values).length)out.team_stats.push({team:{name:official[side+'_team'].name_en},side,stats:stats(values,map)});
    for(const group of ['starts','subs'])for(const p of page.data?.lineups?.[side]?.[group]||[])out.lineups.push({id:p.id,team:side,player_name:name(p.person),number:p.shirt_number,is_starter:group==='starts'});
  }
  for(const e of page.events||[]) {
    const tid=String(e.lineup?.team?.id),side=['home','away'].find(s=>String(raw[s+'_team'].id)===tid);
    if(!side)continue;
    const label=e.match_event_kind?.name||'',group=e.match_event_kind?.collection;
    const clock=String(e.clock||e.time||'').match(/^(\d+)(?:\+(\d+))?$/);
    const type=group==='goal'?(/own/i.test(label)?'own_goal':'goal'):group==='substitution'?'substitution':group==='booking'?(/red|second/i.test(label)?'red_card':'yellow_card'):'event';
    out.events.push({id:e.id,team:side,type,minute:clock?Number(clock[1]):null,extra_minute:clock?.[2]?Number(clock[2]):null,player_name:name(e.lineup?.person),detail:group==='substitution'?name(e.lineup_off?.person):label});
  }
  out.events.sort((a,b)=>(a.minute||0)-(b.minute||0)||(a.extra_minute||0)-(b.extra_minute||0));
  fact(out,'Stadium',out.venue);
  return out;
}

export async function laligaDetails(match,env) {
  const date=String(match.scheduled_at||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
  const rows=await laligaSchedule(date,env);
  if(!rows)return null;
  const candidates=rows.filter(r=>match.laliga_id?String(r.laliga_id)===String(match.laliga_id):Boolean(selectFixture(match,[{date:r.scheduled_at,home:r.home_team.name_en,away:r.away_team.name_en}])));
  if(candidates.length!==1)return null;
  const chosen=candidates[0];
  if(!/^[a-z0-9-]+$/.test(chosen.laliga_slug||''))return null;
  const response=await sharedUpstream(env.MATCH_REGISTRY,'laliga-details-v1:'+chosen.laliga_id,async()=>{
    const r=await fetch('https://www.laliga.com/en-GB/match/'+chosen.laliga_slug,{signal:AbortSignal.timeout(12000)});
    if(!r.ok)return {ok:false,status:r.status,body:null};
    const html=await boundedLaligaText(r,2500000),json=html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)?.[1];
    if(!json)throw Error('laliga_details_missing');
    // Cache only normalized match data, never runtime configuration or full HTML.
    return {ok:true,status:200,body:normalizeLaliga({...match,laliga_id:chosen.laliga_id},JSON.parse(json).props?.pageProps)};
  },{provider:'details-laliga',ttl:60000,gap:1200});
  return response.ok?{...response.body,match_id:match.id}:null;
}
