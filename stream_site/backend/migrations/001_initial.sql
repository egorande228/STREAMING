-- Groups (12 groups for 48 teams: A-L)
CREATE TABLE IF NOT EXISTS groups (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(1) UNIQUE NOT NULL
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
    id       SERIAL PRIMARY KEY,
    code     VARCHAR(3) UNIQUE NOT NULL,
    name_en  VARCHAR(100) NOT NULL,
    name_ru  VARCHAR(100) NOT NULL,
    flag_url VARCHAR(255) DEFAULT '',
    group_id INTEGER REFERENCES groups(id)
);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
    id           SERIAL PRIMARY KEY,
    home_team_id INTEGER REFERENCES teams(id),
    away_team_id INTEGER REFERENCES teams(id),
    group_id     INTEGER REFERENCES groups(id),
    stage        VARCHAR(20) NOT NULL DEFAULT 'group',
    venue        VARCHAR(200) DEFAULT '',
    city         VARCHAR(100) DEFAULT '',
    scheduled_at TIMESTAMPTZ NOT NULL,
    status       VARCHAR(20) DEFAULT 'scheduled',
    home_score   INTEGER DEFAULT 0,
    away_score   INTEGER DEFAULT 0,
    minute       INTEGER,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Streams (multilingual, multi-region)
CREATE TABLE IF NOT EXISTS streams (
    id               SERIAL PRIMARY KEY,
    match_id         INTEGER REFERENCES matches(id) ON DELETE CASCADE,
    url              TEXT NOT NULL,
    label            VARCHAR(100) DEFAULT '',
    language_code    VARCHAR(10) NOT NULL DEFAULT 'en',
    region           VARCHAR(20) DEFAULT 'global',
    commentary_type  VARCHAR(20) DEFAULT 'full',
    quality          VARCHAR(20) DEFAULT '720p',
    is_active        BOOLEAN DEFAULT true,
    priority         INTEGER DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20) DEFAULT 'editor',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Mirrors
CREATE TABLE IF NOT EXISTS mirrors (
    id                SERIAL PRIMARY KEY,
    domain            VARCHAR(255) UNIQUE NOT NULL,
    is_active         BOOLEAN DEFAULT true,
    is_primary        BOOLEAN DEFAULT false,
    last_health_check TIMESTAMPTZ,
    health_status     VARCHAR(20) DEFAULT 'unknown',
    region            VARCHAR(20) DEFAULT 'global',
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matches_scheduled ON matches(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_streams_match ON streams(match_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_streams_lang ON streams(language_code);
CREATE INDEX IF NOT EXISTS idx_streams_region ON streams(region);
CREATE INDEX IF NOT EXISTS idx_teams_group ON teams(group_id);
