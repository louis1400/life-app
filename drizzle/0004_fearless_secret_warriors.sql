ALTER TABLE `archive_items` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `archive_items` ADD `operation_id` text;--> statement-breakpoint
ALTER TABLE `archive_items` ADD `create_hash` text;--> statement-breakpoint
ALTER TABLE `archive_items` ADD `sync_action` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `archive_items` ADD `sync_error` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `archive_items` ADD `sync_token` text;--> statement-breakpoint
ALTER TABLE `archive_items` ADD `sync_until` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `archive_items` ADD `deleted` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `archive_owner_pending` ON `archive_items` (`owner`,`sync_action`);