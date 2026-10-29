CREATE TABLE `summary_inputs` (
	`summary_id` integer NOT NULL,
	`source_summary_id` integer NOT NULL,
	PRIMARY KEY(`summary_id`, `source_summary_id`),
	FOREIGN KEY (`summary_id`) REFERENCES `chat_summaries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_summary_id`) REFERENCES `chat_summaries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `summary_inputs_source_idx` ON `summary_inputs` (`source_summary_id`);--> statement-breakpoint
ALTER TABLE `chat_summaries` ADD `kind` text DEFAULT 'history' NOT NULL;