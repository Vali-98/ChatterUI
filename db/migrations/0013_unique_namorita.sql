ALTER TABLE `instructs` ADD `send_images` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `instructs` ADD `send_audio` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `instructs` ADD `send_documents` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `instructs` ADD `last_image_only` integer DEFAULT true NOT NULL;