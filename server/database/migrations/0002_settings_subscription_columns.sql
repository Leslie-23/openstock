ALTER TABLE `settings` ADD `subscription_tier` text DEFAULT 'demo';--> statement-breakpoint
ALTER TABLE `settings` ADD `subscription_start_date` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `subscription_end_date` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `trial_ends_at` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `paystack_customer_code` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `paystack_subscription_code` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `paystack_plan_code` text;
