CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`price_kobo` integer NOT NULL,
	`image_url` text NOT NULL,
	`category` text DEFAULT 'Meals' NOT NULL,
	`available` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `listings_seller_idx` ON `listings` (`seller_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`buyer_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`listing_id` text NOT NULL,
	`listing_title` text NOT NULL,
	`seller_wallet_id` text NOT NULL,
	`method` text NOT NULL,
	`amount_kobo` integer NOT NULL,
	`payable_kobo` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`nuban_number` text,
	`nuban_bank` text,
	`nuban_name` text,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`paid_at` integer,
	FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_reference_unique` ON `orders` (`reference`);--> statement-breakpoint
CREATE INDEX `orders_buyer_idx` ON `orders` (`buyer_id`);--> statement-breakpoint
CREATE INDEX `orders_seller_idx` ON `orders` (`seller_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`phone` text,
	`acute_wallet_id` text NOT NULL,
	`wallet_kyc_status` text DEFAULT 'none' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `wallet_fundings` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`user_id` text NOT NULL,
	`wallet_id` text NOT NULL,
	`amount_kobo` integer NOT NULL,
	`payable_kobo` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`nuban_number` text,
	`nuban_bank` text,
	`nuban_name` text,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`settled_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wallet_fundings_reference_unique` ON `wallet_fundings` (`reference`);--> statement-breakpoint
CREATE INDEX `wallet_fundings_user_idx` ON `wallet_fundings` (`user_id`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`resource_id` text,
	`payload` text NOT NULL,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `withdrawals` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`user_id` text NOT NULL,
	`wallet_id` text NOT NULL,
	`amount_kobo` integer NOT NULL,
	`fee_kobo` integer DEFAULT 0 NOT NULL,
	`account_number` text NOT NULL,
	`bank_code` text NOT NULL,
	`account_name` text,
	`status` text DEFAULT 'processing' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `withdrawals_reference_unique` ON `withdrawals` (`reference`);--> statement-breakpoint
CREATE INDEX `withdrawals_user_idx` ON `withdrawals` (`user_id`);