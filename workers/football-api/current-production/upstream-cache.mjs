// Global D1 lease: no concurrent requests and a post-request gap for the free plan.
// No API keys in cache keys, records, or logs. Fail closed when D1 is unavailable.
export async function sharedUpstream(db, key, loader, options = {}) {
  if (!db) return {ok:false,status:503,body:null};
  const now = options.now || Date.now;
  const sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve,ms)));
  const owner = options.owner || crypto.randomUUID();
  const provider = options.provider || 'therundown';
  const gap = options.gap || 1200;
  for (let attempt=0; attempt<5; attempt++) {
    const hit = await db.prepare('SELECT payload_json FROM upstream_cache WHERE cache_key=? AND expires_at>?').bind(key,now()).first();
    if (hit) return JSON.parse(hit.payload_json);
    const claimed = await db.prepare(`INSERT INTO upstream_gate(provider,owner,available_at) VALUES(?,?,?)
      ON CONFLICT(provider) DO UPDATE SET owner=excluded.owner,available_at=excluded.available_at
      WHERE upstream_gate.available_at<=? RETURNING owner`).bind(provider,owner,now()+30000,now()).first();
    if (!claimed) { await sleep(gap); continue; }
    let cooldown = gap;
    try {
      // Another request might have filled this cache while we were waiting.
      const second = await db.prepare('SELECT payload_json FROM upstream_cache WHERE cache_key=? AND expires_at>?').bind(key,now()).first();
      if (second) return JSON.parse(second.payload_json);
      let payload;
      try { payload = await loader(); } catch { payload={ok:false,status:502,body:null}; }
      const observed = now();
      if (payload.ok) payload={...payload,fetched_at:observed};
      if (payload.status===429) cooldown=Math.max(60000,Math.min(Number(payload.retry_after_ms)||60000,86400000));
      const ttl=payload.ok?(options.ttl || 300000):Math.max(30000,cooldown);
      await db.prepare(`INSERT INTO upstream_cache(cache_key,payload_json,expires_at) VALUES(?,?,?)
        ON CONFLICT(cache_key) DO UPDATE SET payload_json=excluded.payload_json,expires_at=excluded.expires_at`)
        .bind(key,JSON.stringify(payload),observed+ttl).run();
      return payload;
    } finally {
      await db.prepare('UPDATE upstream_gate SET available_at=? WHERE provider=? AND owner=?').bind(now()+cooldown,provider,owner).run();
    }
  }
  return {ok:false,status:503,body:null};
}
