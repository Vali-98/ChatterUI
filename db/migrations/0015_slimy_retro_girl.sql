PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_characters` (
	`id` integer PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text DEFAULT 'User' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`first_mes` text DEFAULT '' NOT NULL,
	`mes_example` text DEFAULT '' NOT NULL,
	`creator_notes` text DEFAULT '' NOT NULL,
	`system_prompt` text DEFAULT '' NOT NULL,
	`scenario` text DEFAULT '' NOT NULL,
	`personality` text DEFAULT '' NOT NULL,
	`post_history_instructions` text DEFAULT '' NOT NULL,
	`image_id` integer NOT NULL,
	`creator` text DEFAULT '' NOT NULL,
	`character_version` text DEFAULT '' NOT NULL,
	`last_modified` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_characters`("id", "type", "name", "description", "first_mes", "mes_example", "creator_notes", "system_prompt", "scenario", "personality", "post_history_instructions", "image_id", "creator", "character_version", "last_modified") SELECT "id", "type", "name", "description", "first_mes", "mes_example", "creator_notes", "system_prompt", "scenario", "personality", "post_history_instructions", "image_id", "creator", "character_version", "last_modified" FROM `characters`;--> statement-breakpoint
DROP TABLE `characters`;--> statement-breakpoint
ALTER TABLE `__new_characters` RENAME TO `characters`;--> statement-breakpoint
PRAGMA foreign_keys=ON;