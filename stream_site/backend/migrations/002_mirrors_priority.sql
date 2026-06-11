-- Add priority column to mirrors for ordering in admin UI
ALTER TABLE mirrors ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
