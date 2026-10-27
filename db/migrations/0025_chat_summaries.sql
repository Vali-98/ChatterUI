CREATE TABLE `chat_summaries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chat_id` integer NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`source_changed` integer DEFAULT false NOT NULL,
	`notice_dismissed` integer DEFAULT false NOT NULL,
	`start_entry_id` integer NOT NULL,
	`end_entry_id` integer NOT NULL,
	`replaces_id` integer,
	`error` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_summaries_chat_status_idx` ON `chat_summaries` (`chat_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `chat_summaries_one_draft_idx` ON `chat_summaries` (`chat_id`) WHERE "chat_summaries"."status" = 'draft';--> statement-breakpoint
CREATE INDEX `chat_summaries_range_idx` ON `chat_summaries` (`chat_id`,`start_entry_id`,`end_entry_id`);--> statement-breakpoint
CREATE TABLE `summary_sources` (
	`summary_id` integer NOT NULL,
	`entry_id` integer NOT NULL,
	`swipe_id` integer NOT NULL,
	PRIMARY KEY(`summary_id`, `entry_id`),
	FOREIGN KEY (`summary_id`) REFERENCES `chat_summaries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `summary_sources_entry_idx` ON `summary_sources` (`entry_id`);--> statement-breakpoint
CREATE INDEX `summary_sources_swipe_idx` ON `summary_sources` (`swipe_id`);