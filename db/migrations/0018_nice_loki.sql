ALTER TABLE `chat_swipes` ADD `active` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_swipes` ADD `token_length` integer;--> statement-breakpoint
ALTER TABLE `chat_swipes` ADD `reset_length` integer;--> statement-breakpoint
CREATE INDEX `chat_swipes_entry_active_idx` ON `chat_swipes` (`entry_id`,`active`);

