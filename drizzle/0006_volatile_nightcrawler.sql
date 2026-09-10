CREATE TABLE `todo_tasks` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`title` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
