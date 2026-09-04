CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`account_type` text NOT NULL,
	`account_sub_type` text,
	`parent_id` text,
	`description` text,
	`is_active` integer DEFAULT true,
	`is_system_account` integer DEFAULT false,
	`normal_balance` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_code_unique` ON `accounts` (`code`);--> statement-breakpoint
CREATE TABLE `accounts_payable` (
	`id` text PRIMARY KEY NOT NULL,
	`supplier_id` text NOT NULL,
	`description` text NOT NULL,
	`original_amount` real NOT NULL,
	`balance_due` real NOT NULL,
	`issue_date` text NOT NULL,
	`due_date` text NOT NULL,
	`reference` text,
	`status` text DEFAULT 'open',
	`journal_entry_id` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `accounts_receivable` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`invoice_id` text NOT NULL,
	`original_amount` real NOT NULL,
	`balance_due` real NOT NULL,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'open',
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ap_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`accounts_payable_id` text NOT NULL,
	`amount` real NOT NULL,
	`payment_date` text NOT NULL,
	`payment_method` text,
	`reference` text,
	`notes` text,
	`journal_entry_id` text,
	`created_at` integer,
	FOREIGN KEY (`accounts_payable_id`) REFERENCES `accounts_payable`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`address` text,
	`city` text,
	`country` text,
	`tax_id` text,
	`notes` text,
	`is_active` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_number` text,
	`account_id` text NOT NULL,
	`category_name` text,
	`supplier_id` text,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`tax_id` text,
	`tax_rate` real DEFAULT 0,
	`tax_amount` real DEFAULT 0,
	`total_amount` real NOT NULL,
	`date` text NOT NULL,
	`payment_method` text,
	`reference` text,
	`status` text DEFAULT 'recorded',
	`notes` text,
	`journal_entry_id` text,
	`created_by` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expenses_expense_number_unique` ON `expenses` (`expense_number`);--> statement-breakpoint
CREATE TABLE `invoice_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`product_id` text,
	`variant_id` text,
	`description` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price` real NOT NULL,
	`tax_id` text,
	`tax_rate` real DEFAULT 0,
	`tax_amount` real DEFAULT 0,
	`line_total` real NOT NULL,
	`sort_order` integer DEFAULT 0,
	`created_at` integer,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `invoice_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`amount` real NOT NULL,
	`payment_date` text NOT NULL,
	`payment_method` text,
	`reference` text,
	`notes` text,
	`journal_entry_id` text,
	`created_at` integer,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_number` text,
	`customer_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`issue_date` text NOT NULL,
	`due_date` text NOT NULL,
	`subtotal` real DEFAULT 0,
	`tax_total` real DEFAULT 0,
	`total` real DEFAULT 0,
	`amount_paid` real DEFAULT 0,
	`currency` text DEFAULT 'GHS',
	`notes` text,
	`terms` text,
	`journal_entry_id` text,
	`created_by` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_number_unique` ON `invoices` (`invoice_number`);--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_number` text,
	`date` text NOT NULL,
	`description` text NOT NULL,
	`reference` text,
	`reference_type` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`posted_at` integer,
	`posted_by` text,
	`notes` text,
	`created_by` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_entries_entry_number_unique` ON `journal_entries` (`entry_number`);--> statement-breakpoint
CREATE TABLE `journal_entry_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`journal_entry_id` text NOT NULL,
	`account_id` text NOT NULL,
	`debit` real DEFAULT 0,
	`credit` real DEFAULT 0,
	`description` text,
	`created_at` integer,
	FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cross_border_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`direction` text NOT NULL,
	`description` text NOT NULL,
	`sent_amount` real NOT NULL,
	`sent_currency` text NOT NULL,
	`received_amount` real NOT NULL,
	`received_currency` text NOT NULL,
	`exchange_rate` real NOT NULL,
	`fees` real DEFAULT 0,
	`other_costs` real DEFAULT 0,
	`profit_ghs` real NOT NULL,
	`customer_name` text,
	`reference` text,
	`status` text DEFAULT 'completed',
	`notes` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `crypto_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`coin` text NOT NULL,
	`coin_amount` real NOT NULL,
	`unit_price` real NOT NULL,
	`total_ghs` real NOT NULL,
	`buy_price_per_unit` real,
	`profit_ghs` real DEFAULT 0,
	`customer_name` text,
	`reference` text,
	`status` text DEFAULT 'completed',
	`notes` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `forex_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`usd_amount` real NOT NULL,
	`ghs_amount` real NOT NULL,
	`exchange_rate` real NOT NULL,
	`market_rate` real,
	`profit_ghs` real DEFAULT 0,
	`customer_name` text,
	`reference` text,
	`status` text DEFAULT 'completed',
	`notes` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`business_line` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'GHS',
	`reference` text,
	`notes` text,
	`created_at` integer,
	`updated_at` integer
);
