CREATE TABLE `characterLinks` (
	`id` integer PRIMARY KEY NOT NULL,
	`character_id` integer NOT NULL,
	`value` integer NOT NULL,
	`type` text NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `character_links_character_id_type_unique` ON `characterLinks` (`character_id`,`type`);