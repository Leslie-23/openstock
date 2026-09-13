CREATE TABLE `provisioned_customers` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`business_name` text NOT NULL,
	`currency` text NOT NULL,
	`trial_days` integer NOT NULL,
	`database_id` text,
	`kv_id` text,
	`url` text,
	`status` text DEFAULT 'provisioning',
	`created_at` integer
);
