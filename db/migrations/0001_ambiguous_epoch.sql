ALTER TABLE instructs ADD `system_prefix` text NOT NULL;--> statement-breakpoint
ALTER TABLE instructs ADD `system_suffix` text NOT NULL;--> statement-breakpoint
ALTER TABLE instructs ADD `inpput_prefix` text NOT NULL;--> statement-breakpoint
ALTER TABLE instructs ADD `input_suffix` text NOT NULL;--> statement-breakpoint
ALTER TABLE instructs ADD `output_suffix` text NOT NULL;--> statement-breakpoint
ALTER TABLE instructs ADD `output_prefix` text NOT NULL;--> statement-breakpoint
ALTER TABLE instructs ADD `user_alignment_message` text NOT NULL;--> statement-breakpoint
ALTER TABLE `instructs` DROP COLUMN `input_sequence`;--> statement-breakpoint
ALTER TABLE `instructs` DROP COLUMN `output_sequence`;--> statement-breakpoint
ALTER TABLE `instructs` DROP COLUMN `first_output_sequence`;--> statement-breakpoint
ALTER TABLE `instructs` DROP COLUMN `system_sequence_prefix`;--> statement-breakpoint
ALTER TABLE `instructs` DROP COLUMN `separator_sequence`;