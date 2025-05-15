CREATE TABLE `chat_attachment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chat_entry_id` integer NOT NULL,
	`uri` text NOT NULL,
	`type` text NOT NULL,
	`mime_type` text NOT NULL,
	`name` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`chat_entry_id`) REFERENCES `chat_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
