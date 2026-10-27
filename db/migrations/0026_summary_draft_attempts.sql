ALTER TABLE `chat_summaries` ADD `eligible_end_id` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_summaries` ADD `attempt_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `chat_summaries` SET `eligible_end_id` = `end_entry_id` WHERE `eligible_end_id` = 0;
