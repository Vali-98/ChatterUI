ALTER TABLE `model_data` ADD `file_path` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `model_data_file_path_unique` ON `model_data` (`file_path`);