CREATE TABLE `archive_items` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`kind` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`destinations` text DEFAULT '[]' NOT NULL,
	`file_key` text,
	`file_name` text,
	`mime` text,
	`size` integer DEFAULT 0 NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `archive_owner_created` ON `archive_items` (`owner`,`created_at`);--> statement-breakpoint
CREATE INDEX `archive_owner_url` ON `archive_items` (`owner`,`url`);