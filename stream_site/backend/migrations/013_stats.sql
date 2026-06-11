ALTER TABLE matches ADD COLUMN IF NOT EXISTS stream_redirect_url VARCHAR(500) NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS match_events (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    minute INTEGER NOT NULL,
    type VARCHAR(30) NOT NULL,
    team VARCHAR(10) NOT NULL,
    player_name VARCHAR(100) NOT NULL DEFAULT '',
    detail VARCHAR(200) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON match_events(match_id);

CREATE TABLE IF NOT EXISTS match_lineups (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team VARCHAR(10) NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    number INTEGER NOT NULL DEFAULT 0,
    position VARCHAR(30) NOT NULL DEFAULT '',
    is_starter BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_match_lineups_match_id ON match_lineups(match_id);
