ALTER TABLE instructs ADD `timestamp` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE instructs ADD `examples` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE instructs ADD `format_type` integer DEFAULT 0 NOT NULL;