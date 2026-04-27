-- initialize all swipes as inactive
UPDATE chat_swipes
SET active = 0;

-- set correct active swipe based on swipe_id mapping
WITH ranked AS (
  SELECT
    cs.id AS swipe_id,
    cs.entry_id,
    ROW_NUMBER() OVER (
      PARTITION BY cs.entry_id
      ORDER BY cs.id
    ) - 1 AS idx
  FROM chat_swipes cs
),
targets AS (
  SELECT r.swipe_id
  FROM ranked r
  JOIN chat_entries ce ON ce.id = r.entry_id
  WHERE r.idx = ce.swipe_id
)
UPDATE chat_swipes
SET active = 1
WHERE id IN (SELECT swipe_id FROM targets);