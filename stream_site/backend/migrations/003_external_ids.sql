-- Add external_id to teams and matches for upsert from football-data.org
ALTER TABLE teams   ADD COLUMN IF NOT EXISTS external_id INTEGER UNIQUE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS external_id INTEGER UNIQUE;

CREATE INDEX IF NOT EXISTS idx_teams_external   ON teams(external_id)   WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_external ON matches(external_id) WHERE external_id IS NOT NULL;
