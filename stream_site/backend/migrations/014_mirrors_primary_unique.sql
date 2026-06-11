WITH ranked_primaries AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY priority ASC, id ASC) AS rn
    FROM mirrors
    WHERE is_primary = true
)
UPDATE mirrors
SET is_primary = false
WHERE id IN (
    SELECT id
    FROM ranked_primaries
    WHERE rn > 1
);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_mirrors_single_primary
    ON mirrors (is_primary)
    WHERE is_primary = true;
