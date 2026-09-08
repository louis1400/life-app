CREATE TABLE `grocery_events` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`product_id` text NOT NULL,
	`action_json` text NOT NULL,
	`occurred_on` text NOT NULL,
	`recorded_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_grocery_events_id` ON `grocery_events` (`id`);--> statement-breakpoint
CREATE INDEX `idx_grocery_events_user_product_seq` ON `grocery_events` (`user_id`,`product_id`,`seq`);