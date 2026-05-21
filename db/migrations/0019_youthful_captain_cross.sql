CREATE TABLE `author_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text DEFAULT 'New Note' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`priority` integer DEFAULT 0,
	`depth` integer DEFAULT 0,
	`active` integer DEFAULT true NOT NULL,
	`token_length` integer,
	`chat_id` integer,
	`character_id` integer,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "notes_ownership_check" CHECK("author_notes"."chat_id" IS NULL OR "author_notes"."character_id" IS NULL)
);
--> statement-breakpoint
CREATE INDEX `author_notes_chat_active_idx` ON `author_notes` (`chat_id`,`active`);--> statement-breakpoint
CREATE INDEX `author_notes_character_active_idx` ON `author_notes` (`character_id`,`active`);--> statement-breakpoint
CREATE INDEX `author_notes_global_idx` ON `author_notes` (`id`) WHERE "author_notes"."chat_id" IS NULL AND "author_notes"."character_id" IS NULL;--> statement-breakpoint
CREATE INDEX `author_notes_global_active_idx` ON `author_notes` (`active`) WHERE "author_notes"."chat_id" IS NULL AND "author_notes"."character_id" IS NULL AND "author_notes"."active" = 1;