CREATE TABLE IF NOT EXISTS stream_keys (
    id         SERIAL PRIMARY KEY,
    key        VARCHAR(128) UNIQUE NOT NULL,
    match_id   INTEGER REFERENCES matches(id) ON DELETE SET NULL,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stream_keys_active ON stream_keys(is_active);
