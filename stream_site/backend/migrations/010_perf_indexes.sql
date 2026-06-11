CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_status_sched ON matches(status, scheduled_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_stage ON matches(stage);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_home ON matches(home_team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_away ON matches(away_team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mirrors_active_primary ON mirrors(is_active, is_primary);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_streams_priority ON streams(match_id, priority DESC) WHERE is_active = true;
