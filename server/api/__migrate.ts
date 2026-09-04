export default defineEventHandler(async (event) => {
  // Protect migration endpoint with a secret key
  // Only allow in development OR with valid MIGRATE_SECRET header
  const isDev = process.dev;
  const migrateSecret = process.env.NUXT_MIGRATE_SECRET;
  const providedSecret = getHeader(event, 'x-migrate-secret');

  if (!isDev) {
    if (!migrateSecret) {
      throw createError({
        statusCode: 503,
        message:
          'Migration endpoint not configured. Set NUXT_MIGRATE_SECRET environment variable.',
      });
    }
    if (providedSecret !== migrateSecret) {
      throw createError({
        statusCode: 401,
        message: 'Invalid or missing migration secret',
      });
    }
  }

  const db = hubDatabase();

  const createStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY NOT NULL,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      name text NOT NULL,
      role text NOT NULL DEFAULT 'member',
      is_active integer DEFAULT 1,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS taxes (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      rate real NOT NULL,
      is_default integer DEFAULT 0,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS suppliers (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      email text,
      phone text,
      address text,
      city text,
      postal_code text,
      country text DEFAULT 'France',
      notes text,
      is_active integer DEFAULT 1,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      description text,
      parent_id text,
      color text DEFAULT '#6B7280',
      created_at integer,
      updated_at integer,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id text PRIMARY KEY NOT NULL,
      sku text,
      barcode text,
      name text NOT NULL,
      description text,
      category_id text,
      cost_price real DEFAULT 0,
      selling_price real DEFAULT 0,
      margin_percent real DEFAULT 30,
      tax_id text,
      stock_quantity integer DEFAULT 0,
      stock_min integer DEFAULT 0,
      stock_max integer,
      unit text DEFAULT 'unit',
      supplier_id text,
      is_active integer DEFAULT 1,
      options text,
      created_at integer,
      updated_at integer,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE no action ON DELETE no action,
      FOREIGN KEY (tax_id) REFERENCES taxes(id) ON UPDATE no action ON DELETE no action,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON products (sku)`,
    `CREATE TABLE IF NOT EXISTS product_variants (
      id text PRIMARY KEY NOT NULL,
      product_id text NOT NULL,
      name text NOT NULL,
      sku text,
      barcode text,
      cost_price real DEFAULT 0,
      margin_percent real DEFAULT 30,
      price real DEFAULT 0,
      tax_id text,
      stock_quantity integer DEFAULT 0,
      stock_min integer DEFAULT 0,
      stock_max integer,
      supplier_id text,
      created_at integer,
      updated_at integer,
      FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (tax_id) REFERENCES taxes(id) ON UPDATE no action ON DELETE no action,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE TABLE IF NOT EXISTS stock_movements (
      id text PRIMARY KEY NOT NULL,
      product_id text NOT NULL,
      variant_id text,
      type text NOT NULL,
      quantity integer NOT NULL,
      stock_before integer NOT NULL,
      stock_after integer NOT NULL,
      unit_cost real,
      reference text,
      reason text,
      supplier_id text,
      created_at integer,
      FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE TABLE IF NOT EXISTS supplier_prices (
      id text PRIMARY KEY NOT NULL,
      product_id text NOT NULL,
      supplier_id text NOT NULL,
      price real NOT NULL,
      min_quantity integer DEFAULT 1,
      lead_time_days integer,
      supplier_sku text,
      purchase_url text,
      is_preferred integer DEFAULT 0,
      created_at integer,
      updated_at integer,
      FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE TABLE IF NOT EXISTS supplier_price_history (
      id text PRIMARY KEY NOT NULL,
      supplier_price_id text NOT NULL,
      price real NOT NULL,
      created_at integer,
      created_by text,
      FOREIGN KEY (supplier_price_id) REFERENCES supplier_prices(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE TABLE IF NOT EXISTS selling_price_history (
      id text PRIMARY KEY NOT NULL,
      product_id text NOT NULL,
      variant_id text,
      price real NOT NULL,
      created_at integer,
      created_by text,
      FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE TABLE IF NOT EXISTS variant_supplier_exclusions (
      id text PRIMARY KEY NOT NULL,
      variant_id text NOT NULL,
      supplier_price_id text NOT NULL,
      created_at integer,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (supplier_price_id) REFERENCES supplier_prices(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      id integer PRIMARY KEY NOT NULL,
      business_name text DEFAULT 'OpenStock Inc.',
      currency text DEFAULT 'EUR',
      default_margin real DEFAULT 30,
      low_stock_alert integer DEFAULT 1,
      out_of_stock_alert integer DEFAULT 1,
      email_daily_report integer DEFAULT 0,
      updated_at integer
    )`,

    // ---- HR Tables ----
    `CREATE TABLE IF NOT EXISTS departments (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      description text,
      manager_id text,
      is_active integer DEFAULT 1,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS employees (
      id text PRIMARY KEY NOT NULL,
      user_id text,
      employee_code text UNIQUE,
      first_name text NOT NULL,
      last_name text NOT NULL,
      email text NOT NULL,
      phone text,
      date_of_birth text,
      gender text,
      address text,
      city text,
      postal_code text,
      country text DEFAULT 'France',
      department_id text REFERENCES departments(id),
      position text,
      employment_type text NOT NULL DEFAULT 'full_time',
      hire_date text NOT NULL,
      termination_date text,
      base_salary real DEFAULT 0,
      salary_frequency text NOT NULL DEFAULT 'monthly',
      bank_name text,
      bank_account text,
      employee_tax_id text,
      social_security_number text,
      emergency_contact_name text,
      emergency_contact_phone text,
      status text NOT NULL DEFAULT 'active',
      notes text,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS attendance (
      id text PRIMARY KEY NOT NULL,
      employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      date text NOT NULL,
      clock_in text,
      clock_out text,
      break_minutes integer DEFAULT 0,
      overtime_minutes integer DEFAULT 0,
      status text NOT NULL DEFAULT 'present',
      notes text,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS leave_types (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      description text,
      default_days integer DEFAULT 0,
      is_paid integer DEFAULT 1,
      color text DEFAULT '#6B7280',
      is_active integer DEFAULT 1,
      created_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS leave_requests (
      id text PRIMARY KEY NOT NULL,
      employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      leave_type_id text NOT NULL REFERENCES leave_types(id),
      start_date text NOT NULL,
      end_date text NOT NULL,
      total_days real NOT NULL,
      reason text,
      status text NOT NULL DEFAULT 'pending',
      approved_by text,
      approved_at integer,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS payroll_periods (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      start_date text NOT NULL,
      end_date text NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      processed_by text,
      processed_at integer,
      notes text,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS payroll_runs (
      id text PRIMARY KEY NOT NULL,
      payroll_period_id text NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
      employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      base_salary real NOT NULL,
      worked_days real DEFAULT 0,
      overtime_hours real DEFAULT 0,
      overtime_pay real DEFAULT 0,
      bonuses real DEFAULT 0,
      bonus_notes text,
      deductions real DEFAULT 0,
      deduction_notes text,
      tax_amount real DEFAULT 0,
      social_security real DEFAULT 0,
      health_insurance real DEFAULT 0,
      other_deductions real DEFAULT 0,
      other_deduction_notes text,
      gross_pay real NOT NULL,
      net_pay real NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      paid_at integer,
      created_at integer,
      updated_at integer
    )`,

    // ---- Finance Tables ----
    `CREATE TABLE IF NOT EXISTS transactions (
      id text PRIMARY KEY NOT NULL,
      type text NOT NULL,
      business_line text NOT NULL,
      description text NOT NULL,
      amount real NOT NULL,
      currency text DEFAULT 'GHS',
      reference text,
      notes text,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS cross_border_transactions (
      id text PRIMARY KEY NOT NULL,
      direction text NOT NULL,
      description text NOT NULL,
      sent_amount real NOT NULL,
      sent_currency text NOT NULL,
      received_amount real NOT NULL,
      received_currency text NOT NULL,
      exchange_rate real NOT NULL,
      fees real DEFAULT 0,
      other_costs real DEFAULT 0,
      profit_ghs real NOT NULL,
      customer_name text,
      reference text,
      status text DEFAULT 'completed',
      notes text,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS forex_transactions (
      id text PRIMARY KEY NOT NULL,
      type text NOT NULL,
      usd_amount real NOT NULL,
      ghs_amount real NOT NULL,
      exchange_rate real NOT NULL,
      market_rate real,
      profit_ghs real DEFAULT 0,
      customer_name text,
      reference text,
      status text DEFAULT 'completed',
      notes text,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS crypto_transactions (
      id text PRIMARY KEY NOT NULL,
      type text NOT NULL,
      coin text NOT NULL,
      coin_amount real NOT NULL,
      unit_price real NOT NULL,
      total_ghs real NOT NULL,
      buy_price_per_unit real,
      profit_ghs real DEFAULT 0,
      customer_name text,
      reference text,
      status text DEFAULT 'completed',
      notes text,
      created_at integer,
      updated_at integer
    )`,
  ];

  const accountingStatements = [
    // ---- Accounting Tables ----
    `CREATE TABLE IF NOT EXISTS accounts (
      id text PRIMARY KEY NOT NULL,
      code text NOT NULL UNIQUE,
      name text NOT NULL,
      account_type text NOT NULL,
      account_sub_type text,
      parent_id text,
      description text,
      is_active integer DEFAULT 1,
      is_system_account integer DEFAULT 0,
      normal_balance text NOT NULL,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS journal_entries (
      id text PRIMARY KEY NOT NULL,
      entry_number text UNIQUE,
      date text NOT NULL,
      description text NOT NULL,
      reference text,
      reference_type text,
      status text NOT NULL DEFAULT 'draft',
      posted_at integer,
      posted_by text,
      notes text,
      created_by text,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS journal_entry_lines (
      id text PRIMARY KEY NOT NULL,
      journal_entry_id text NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
      account_id text NOT NULL REFERENCES accounts(id),
      debit real DEFAULT 0,
      credit real DEFAULT 0,
      description text,
      created_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS customers (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      email text,
      phone text,
      address text,
      city text,
      country text,
      tax_id text,
      notes text,
      is_active integer DEFAULT 1,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS invoices (
      id text PRIMARY KEY NOT NULL,
      invoice_number text UNIQUE,
      customer_id text REFERENCES customers(id),
      status text NOT NULL DEFAULT 'draft',
      issue_date text NOT NULL,
      due_date text NOT NULL,
      subtotal real DEFAULT 0,
      tax_total real DEFAULT 0,
      total real DEFAULT 0,
      amount_paid real DEFAULT 0,
      currency text DEFAULT 'GHS',
      notes text,
      terms text,
      journal_entry_id text,
      created_by text,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS invoice_lines (
      id text PRIMARY KEY NOT NULL,
      invoice_id text NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id text,
      variant_id text,
      description text NOT NULL,
      quantity real NOT NULL,
      unit_price real NOT NULL,
      tax_id text,
      tax_rate real DEFAULT 0,
      tax_amount real DEFAULT 0,
      line_total real NOT NULL,
      sort_order integer DEFAULT 0,
      created_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS invoice_payments (
      id text PRIMARY KEY NOT NULL,
      invoice_id text NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      amount real NOT NULL,
      payment_date text NOT NULL,
      payment_method text,
      reference text,
      notes text,
      journal_entry_id text,
      created_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id text PRIMARY KEY NOT NULL,
      expense_number text UNIQUE,
      account_id text NOT NULL REFERENCES accounts(id),
      category_name text,
      supplier_id text,
      description text NOT NULL,
      amount real NOT NULL,
      tax_id text,
      tax_rate real DEFAULT 0,
      tax_amount real DEFAULT 0,
      total_amount real NOT NULL,
      date text NOT NULL,
      payment_method text,
      reference text,
      status text DEFAULT 'recorded',
      notes text,
      journal_entry_id text,
      created_by text,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS accounts_receivable (
      id text PRIMARY KEY NOT NULL,
      customer_id text NOT NULL REFERENCES customers(id),
      invoice_id text NOT NULL REFERENCES invoices(id),
      original_amount real NOT NULL,
      balance_due real NOT NULL,
      due_date text NOT NULL,
      status text DEFAULT 'open',
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS accounts_payable (
      id text PRIMARY KEY NOT NULL,
      supplier_id text NOT NULL,
      description text NOT NULL,
      original_amount real NOT NULL,
      balance_due real NOT NULL,
      issue_date text NOT NULL,
      due_date text NOT NULL,
      reference text,
      status text DEFAULT 'open',
      journal_entry_id text,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS ap_payments (
      id text PRIMARY KEY NOT NULL,
      accounts_payable_id text NOT NULL REFERENCES accounts_payable(id) ON DELETE CASCADE,
      amount real NOT NULL,
      payment_date text NOT NULL,
      payment_method text,
      reference text,
      notes text,
      journal_entry_id text,
      created_at integer
    )`,
    // Performance indexes for accounting
    `CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date)`,
    `CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status)`,
    `CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id)`,
    `CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON journal_entry_lines(account_id)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)`,
    `CREATE INDEX IF NOT EXISTS idx_ar_customer ON accounts_receivable(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ar_status ON accounts_receivable(status)`,
    `CREATE INDEX IF NOT EXISTS idx_ap_supplier ON accounts_payable(supplier_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ap_status ON accounts_payable(status)`,
  ];

  const alterStatements = [
    `ALTER TABLE product_variants ADD COLUMN barcode text`,
    `ALTER TABLE product_variants ADD COLUMN margin_percent real DEFAULT 30`,
    `ALTER TABLE product_variants ADD COLUMN tax_id text REFERENCES taxes(id)`,
    `ALTER TABLE product_variants ADD COLUMN stock_max integer`,
    `ALTER TABLE product_variants ADD COLUMN supplier_id text REFERENCES suppliers(id)`,
    `ALTER TABLE supplier_prices ADD COLUMN purchase_url text`,
    // Subscription tier columns on settings
    `ALTER TABLE settings ADD COLUMN subscription_tier text DEFAULT 'demo'`,
    `ALTER TABLE settings ADD COLUMN subscription_start_date text`,
    `ALTER TABLE settings ADD COLUMN subscription_end_date text`,
    `ALTER TABLE settings ADD COLUMN trial_ends_at text`,
    `ALTER TABLE settings ADD COLUMN paystack_customer_code text`,
    `ALTER TABLE settings ADD COLUMN paystack_subscription_code text`,
    `ALTER TABLE settings ADD COLUMN paystack_plan_code text`,
  ];

  const results: string[] = [];

  try {
    for (const sql of createStatements) {
      await db.prepare(sql).run();
    }
    results.push('Core tables created successfully');

    for (const sql of accountingStatements) {
      try {
        await db.prepare(sql).run();
      } catch (error) {
        const errorMessage = String(error);
        if (errorMessage.includes('already exists')) {
          continue;
        }
        throw error;
      }
    }
    results.push('Accounting tables and indexes created successfully');

    for (const sql of alterStatements) {
      try {
        await db.prepare(sql).run();
        results.push(`Applied: ${sql.substring(0, 60)}...`);
      } catch (error) {
        const errorMessage = String(error);
        if (errorMessage.includes('duplicate column name')) {
          results.push(`Skipped (already exists): ${sql.substring(0, 60)}...`);
        } else {
          throw error;
        }
      }
    }

    return {
      success: true,
      message: 'Migrations applied successfully',
      results,
    };
  } catch (error) {
    return { success: false, error: String(error), results };
  }
});
