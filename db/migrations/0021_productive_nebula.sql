PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_lorebook_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lorebook_id` integer NOT NULL,
	`keys` text NOT NULL,
	`content` text NOT NULL,
	`enable` integer DEFAULT true NOT NULL,
	`insertion_order` integer DEFAULT 100 NOT NULL,
	`case_sensitive` integer DEFAULT true NOT NULL,
	`name` text NOT NULL,
	`priority` integer DEFAULT 100 NOT NULL,
	`selective` integer DEFAULT false NOT NULL,
	`constant` integer DEFAULT false NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`secondary_keys` text NOT NULL,
	FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_lorebook_entries`("id", "lorebook_id", "keys", "content", "enable", "insertion_order", "case_sensitive", "name", "priority", "selective", "constant", "comment", "secondary_keys") SELECT "id", "lorebook_id", "keys", "content", "enable", "insertion_order", "case_sensitive", "name", "priority", "selective", "constant", "comment", "secondary_keys" FROM `lorebook_entries`;--> statement-breakpoint
DROP TABLE `lorebook_entries`;--> statement-breakpoint
ALTER TABLE `__new_lorebook_entries` RENAME TO `lorebook_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `lorebooks` ADD `active` integer DEFAULT false;