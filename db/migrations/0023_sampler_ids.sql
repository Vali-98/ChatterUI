-- Legacy presets receive stable IDs equal to their former index + 1.
UPDATE `characterLinks`
SET `type` = 'sampler_id', `value` = `value` + 1
WHERE `type` = 'sampler_index';
