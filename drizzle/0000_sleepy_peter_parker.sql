CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `merchant_cache` (
	`merchant_name` text PRIMARY KEY NOT NULL,
	`category_id` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bank_transaction_id` text NOT NULL,
	`date` text NOT NULL,
	`raw_description` text NOT NULL,
	`merchant_name` text,
	`amount` real NOT NULL,
	`currency` text NOT NULL,
	`base_amount_eur` real NOT NULL,
	`category_id` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_bank_transaction_id_unique` ON `transactions` (`bank_transaction_id`);