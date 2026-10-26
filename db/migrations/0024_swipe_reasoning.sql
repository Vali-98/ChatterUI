CREATE TABLE `swipe_reasoning` (
	`swipe_id` integer PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`reset_length` integer,
	FOREIGN KEY (`swipe_id`) REFERENCES `chat_swipes`(`id`) ON UPDATE no action ON DELETE cascade
);
