ALTER TABLE streams
ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) NOT NULL DEFAULT 'hls';

UPDATE streams
SET source_type = 'hls'
WHERE source_type IS NULL OR source_type = '';

CREATE INDEX IF NOT EXISTS idx_streams_source_type ON streams(source_type);
