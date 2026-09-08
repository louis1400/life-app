CREATE TABLE `coursework_entries` (
	`owner_id` text NOT NULL,
	`entry_id` text NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `entry_id`)
);
