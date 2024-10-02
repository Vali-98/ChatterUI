CREATE TABLE `model_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file` text NOT NULL,
	`name` text NOT NULL,
	`file_size` integer DEFAULT 0 NOT NULL,
	`params` text NOT NULL,
	`quantization` text NOT NULL,
	`context_length` integer NOT NULL,
	`architecture` text NOT NULL,
	`create_date` integer NOT NULL,
	`last_modified` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `model_data_file_unique` ON `model_data` (`file`);