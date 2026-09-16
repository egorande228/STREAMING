CREATE TABLE IF NOT EXISTS upstream_gate (
 provider TEXT PRIMARY KEY, owner TEXT NOT NULL, available_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS upstream_cache (
 cache_key TEXT PRIMARY KEY, payload_json TEXT NOT NULL, expires_at INTEGER NOT NULL
);
