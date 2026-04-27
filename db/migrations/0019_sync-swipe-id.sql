-- initialize all swipes as inactive
UPDATE `chat_swipes`
SET `active` = false;

-- set correct active swipe based on old index
UPDATE chat_swipes
SET active = true
WHERE id IN (
  SELECT id FROM (
    SELECT 
      cs.id,
      ROW_NUMBER() OVER (
        PARTITION BY cs.entry_id 
        ORDER BY cs.id
      ) - 1 AS idx,
      ce.swipe_id
    FROM chat_swipes cs
    JOIN chat_entries ce ON ce.id = cs.entry_id
  ) t
  WHERE t.idx = t.swipe_id
);