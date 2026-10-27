UPDATE `chat_summaries`
SET `error` = json_object(
    'reason', CASE
        WHEN `error` = 'Cancelled' THEN 'cancelled'
        WHEN `error` LIKE 'Output limit reached%' THEN 'output_limit'
        ELSE 'failed'
    END,
    'message', `error`
)
WHERE `error` IS NOT NULL;
