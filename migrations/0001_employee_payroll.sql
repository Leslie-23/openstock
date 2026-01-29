-- ============================================================================
-- EMPLOYEE & PAYROLL MANAGEMENT TABLES
-- Migration: 0001_employee_payroll
-- ============================================================================

-- DEPARTMENTS
CREATE TABLE IF NOT EXISTS `departments` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `manager_id` text,
  `is_active` integer DEFAULT true,
  `created_at` integer,
  `updated_at` integer
);

-- EMPLOYEES
CREATE TABLE IF NOT EXISTS `employees` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text REFERENCES `users`(`id`),
  `employee_code` text UNIQUE,
  `first_name` text NOT NULL,
  `last_name` text NOT NULL,
  `email` text NOT NULL,
  `phone` text,
  `date_of_birth` text,
  `gender` text,
  `address` text,
  `city` text,
  `postal_code` text,
  `country` text DEFAULT 'France',
  `department_id` text REFERENCES `departments`(`id`),
  `position` text,
  `employment_type` text NOT NULL DEFAULT 'full_time',
  `hire_date` text NOT NULL,
  `termination_date` text,
  `base_salary` real DEFAULT 0,
  `salary_frequency` text NOT NULL DEFAULT 'monthly',
  `bank_name` text,
  `bank_account` text,
  `employee_tax_id` text,
  `social_security_number` text,
  `emergency_contact_name` text,
  `emergency_contact_phone` text,
  `status` text NOT NULL DEFAULT 'active',
  `notes` text,
  `created_at` integer,
  `updated_at` integer
);

-- ATTENDANCE (Clock in / Clock out)
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` text PRIMARY KEY NOT NULL,
  `employee_id` text NOT NULL REFERENCES `employees`(`id`) ON DELETE CASCADE,
  `date` text NOT NULL,
  `clock_in` text,
  `clock_out` text,
  `break_minutes` integer DEFAULT 0,
  `overtime_minutes` integer DEFAULT 0,
  `status` text NOT NULL DEFAULT 'present',
  `notes` text,
  `created_at` integer,
  `updated_at` integer
);

-- LEAVE TYPES
CREATE TABLE IF NOT EXISTS `leave_types` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `default_days` integer DEFAULT 0,
  `is_paid` integer DEFAULT true,
  `color` text DEFAULT '#6B7280',
  `is_active` integer DEFAULT true,
  `created_at` integer
);

-- LEAVE REQUESTS
CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `employee_id` text NOT NULL REFERENCES `employees`(`id`) ON DELETE CASCADE,
  `leave_type_id` text NOT NULL REFERENCES `leave_types`(`id`),
  `start_date` text NOT NULL,
  `end_date` text NOT NULL,
  `total_days` real NOT NULL,
  `reason` text,
  `status` text NOT NULL DEFAULT 'pending',
  `approved_by` text,
  `approved_at` integer,
  `created_at` integer,
  `updated_at` integer
);

-- PAYROLL PERIODS
CREATE TABLE IF NOT EXISTS `payroll_periods` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `start_date` text NOT NULL,
  `end_date` text NOT NULL,
  `status` text NOT NULL DEFAULT 'draft',
  `processed_by` text,
  `processed_at` integer,
  `notes` text,
  `created_at` integer,
  `updated_at` integer
);

-- PAYROLL RUNS (per employee per period)
CREATE TABLE IF NOT EXISTS `payroll_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `payroll_period_id` text NOT NULL REFERENCES `payroll_periods`(`id`) ON DELETE CASCADE,
  `employee_id` text NOT NULL REFERENCES `employees`(`id`) ON DELETE CASCADE,
  `base_salary` real NOT NULL,
  `worked_days` real DEFAULT 0,
  `overtime_hours` real DEFAULT 0,
  `overtime_pay` real DEFAULT 0,
  `bonuses` real DEFAULT 0,
  `bonus_notes` text,
  `deductions` real DEFAULT 0,
  `deduction_notes` text,
  `tax_amount` real DEFAULT 0,
  `social_security` real DEFAULT 0,
  `health_insurance` real DEFAULT 0,
  `other_deductions` real DEFAULT 0,
  `other_deduction_notes` text,
  `gross_pay` real NOT NULL,
  `net_pay` real NOT NULL,
  `status` text NOT NULL DEFAULT 'pending',
  `paid_at` integer,
  `created_at` integer,
  `updated_at` integer
);

-- INDEXES
CREATE INDEX IF NOT EXISTS `idx_employees_department` ON `employees`(`department_id`);
CREATE INDEX IF NOT EXISTS `idx_employees_status` ON `employees`(`status`);
CREATE INDEX IF NOT EXISTS `idx_attendance_employee_date` ON `attendance`(`employee_id`, `date`);
CREATE INDEX IF NOT EXISTS `idx_attendance_date` ON `attendance`(`date`);
CREATE INDEX IF NOT EXISTS `idx_leave_requests_employee` ON `leave_requests`(`employee_id`);
CREATE INDEX IF NOT EXISTS `idx_leave_requests_status` ON `leave_requests`(`status`);
CREATE INDEX IF NOT EXISTS `idx_payroll_runs_period` ON `payroll_runs`(`payroll_period_id`);
CREATE INDEX IF NOT EXISTS `idx_payroll_runs_employee` ON `payroll_runs`(`employee_id`);
