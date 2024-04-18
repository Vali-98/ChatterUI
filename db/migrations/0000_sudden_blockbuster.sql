CREATE TABLE `character_greetings` (
	`id` integer PRIMARY KEY NOT NULL,
	`character_id` integer NOT NULL,
	`greeting` text NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `character_lorebooks` (
	`character_id` integer,
	`lorebook_id` integer,
	PRIMARY KEY(`character_id`, `lorebook_id`),
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `character_tags` (
	`character_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`character_id`, `tag_id`),
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `characters` (
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
	`character_version` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chat_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chat_id` integer NOT NULL,
	`is_user` integer NOT NULL,
	`name` text NOT NULL,
	`order` integer NOT NULL,
	`swipe_id` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chat_swipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`swipe` text DEFAULT '' NOT NULL,
	`send_date` integer NOT NULL,
	`gen_started` integer NOT NULL,
	`gen_finished` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `chat_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chats` (
	`id` integer PRIMARY KEY NOT NULL,
	`create_date` integer NOT NULL,
	`character_id` integer NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `instructs` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`system_prompt` text NOT NULL,
	`system_prefix` text NOT NULL,
	`system_suffix` text NOT NULL,
	`inpput_prefix` text NOT NULL,
	`input_suffix` text NOT NULL,
	`output_suffix` text NOT NULL,
	`output_prefix` text NOT NULL,
	`stop_sequence` text NOT NULL,
	`activation_regex` text NOT NULL,
	`user_alignment_message` text NOT NULL,
	`wrap` integer NOT NULL,
	`macro` integer NOT NULL,
	`names` integer NOT NULL,
	`names_force_groups` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lorebook_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lorebook_id` integer NOT NULL,
	`keys` text NOT NULL,
	`content` text NOT NULL,
	`enable` integer DEFAULT true,
	`insertion_order` integer DEFAULT 100,
	`case_sensitive` integer DEFAULT true,
	`name` text NOT NULL,
	`priority` integer DEFAULT 100,
	FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lorebooks` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`scan_depth` integer,
	`token_budget` integer,
	`recursive_scanning` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`tag` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_tag_unique` ON `tags` (`tag`);