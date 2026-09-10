CREATE TABLE `organization_watchlist` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`reason` text NOT NULL,
	`notes` text NOT NULL,
	`next_step` text NOT NULL,
	`status` text NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
