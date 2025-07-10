CREATE TABLE `model_mmproj_links` (
	`model_id` integer NOT NULL,
	`mmproj_id` integer NOT NULL,
	PRIMARY KEY(`model_id`, `mmproj_id`),
	FOREIGN KEY (`model_id`) REFERENCES `model_data`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mmproj_id`) REFERENCES `model_data`(`id`) ON UPDATE no action ON DELETE cascade
);
