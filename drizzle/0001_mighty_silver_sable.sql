CREATE TABLE `drive_connections` (
	`owner` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`email` text NOT NULL,
	`refresh_token` text,
	`folder_id` text NOT NULL,
	`folder_url` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `drive_oauth_states` (
	`hash` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `drive_state_expiry` ON `drive_oauth_states` (`expires_at`);--> statement-breakpoint
ALTER TABLE `archive_items` ADD `drive_file_id` text;--> statement-breakpoint
ALTER TABLE `archive_items` ADD `drive_url` text;--> statement-breakpoint
ALTER TABLE `archive_items` ADD `drive_account_id` text;