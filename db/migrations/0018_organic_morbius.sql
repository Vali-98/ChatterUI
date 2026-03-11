CREATE TABLE `tool_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`parameters_schema` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`builtin` integer DEFAULT false NOT NULL,
	`character_id` integer,
	`created_at` integer,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `chat_entries` ADD `role` text;--> statement-breakpoint
ALTER TABLE `chat_swipes` ADD `tool_calls` text;--> statement-breakpoint
ALTER TABLE `chat_swipes` ADD `tool_call_id` text;