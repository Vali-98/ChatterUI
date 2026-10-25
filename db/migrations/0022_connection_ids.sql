-- Legacy connections receive stable IDs equal to their former index + 1.
UPDATE `characterLinks`
SET `type` = 'connection_id', `value` = `value` + 1
WHERE `type` = 'connection_index';
