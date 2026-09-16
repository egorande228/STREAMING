// Preserve the first published numeric ID, even if the provider moves kickoff.
// Registry snapshots never contain streams or credentials.
export async function registerMatch(db, match, now = Date.now()) {
  if (!db) throw Error('match_registry_unavailable');
  const external = String(match.external_id || '');
  if (!external || !Number.isSafeInteger(match.id) || match.id <= 0) throw Error('invalid_match_identity');
  const { streams, ...metadata } = match;
  const row = await db.prepare(`INSERT INTO public_match_registry
    (provider,external_id,canonical_id,payload_json,observed_at) VALUES('therundown',?,?,?,?)
    ON CONFLICT(provider,external_id) DO UPDATE SET
    payload_json=json_patch(public_match_registry.payload_json,excluded.payload_json),observed_at=excluded.observed_at
    RETURNING canonical_id`).bind(external,match.id,JSON.stringify(metadata),now).first();
  if (!row) throw Error('match_registry_write_failed');
  return { ...match, id: row.canonical_id };
}

export async function readRegisteredMatch(db, id) {
  if (!db) return null;
  let row = await db.prepare('SELECT canonical_id,payload_json,observed_at FROM public_match_registry WHERE canonical_id=?')
    .bind(Number(id)).first();
  if (!row) return null;
  const redirect=JSON.parse(row.payload_json).canonical_redirect_to;
  if(redirect) {
    if(!Number.isSafeInteger(redirect)||redirect===Number(id))return null;
    row=await db.prepare('SELECT canonical_id,payload_json,observed_at FROM public_match_registry WHERE canonical_id=?').bind(redirect).first();
    if(!row || JSON.parse(row.payload_json).canonical_redirect_to)return null;
  }
  return { match: { ...JSON.parse(row.payload_json), id: row.canonical_id }, observed_at: row.observed_at };
}

// Display-only recovery during upstream failure. Never renew observation time.
export async function readRegisteredDay(db, date, now = Date.now()) {
  if (!db || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const {results} = await db.prepare(`SELECT canonical_id,payload_json,observed_at FROM public_match_registry
    WHERE provider='therundown' AND substr(json_extract(payload_json,'$.scheduled_at'),1,10)=?
    AND observed_at>=? AND observed_at<=? ORDER BY canonical_id LIMIT 300`)
    .bind(date,now-86400000,now).all();
  return results.map(row => ({...JSON.parse(row.payload_json),id:row.canonical_id,schedule_stale:true}));
}
