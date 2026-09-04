import {
  sqliteTable,
  text,
  integer,
  real,
} from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// CHART OF ACCOUNTS
// ============================================================================
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  accountType: text('account_type', {
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
  }).notNull(),
  accountSubType: text('account_sub_type', {
    enum: [
      'cash', 'bank', 'receivable', 'inventory', 'other_current_asset',
      'fixed_asset', 'payable', 'tax_payable', 'other_current_liability',
      'long_term_liability', 'owners_equity', 'retained_earnings',
      'sales', 'other_income', 'cogs', 'operating_expense',
    ],
  }),
  parentId: text('parent_id'),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  isSystemAccount: integer('is_system_account', { mode: 'boolean' }).default(false),
  normalBalance: text('normal_balance', { enum: ['debit', 'credit'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  parent: one(accounts, {
    fields: [accounts.parentId],
    references: [accounts.id],
    relationName: 'accountParentChild',
  }),
  children: many(accounts, { relationName: 'accountParentChild' }),
  journalEntryLines: many(journalEntryLines),
}));

// ============================================================================
// JOURNAL ENTRIES (headers)
// ============================================================================
export const journalEntries = sqliteTable('journal_entries', {
  id: text('id').primaryKey(),
  entryNumber: text('entry_number').unique(),
  date: text('date').notNull(),
  description: text('description').notNull(),
  reference: text('reference'),
  referenceType: text('reference_type', {
    enum: ['invoice', 'expense', 'payroll', 'stock_movement', 'manual', 'cross_border', 'forex', 'crypto', 'payment', 'ap_bill', 'ap_payment'],
  }),
  status: text('status', { enum: ['draft', 'posted', 'voided'] }).notNull().default('draft'),
  postedAt: integer('posted_at', { mode: 'timestamp' }),
  postedBy: text('posted_by'),
  notes: text('notes'),
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const journalEntriesRelations = relations(journalEntries, ({ many }) => ({
  lines: many(journalEntryLines),
}));

// ============================================================================
// JOURNAL ENTRY LINES (debit/credit lines)
// ============================================================================
export const journalEntryLines = sqliteTable('journal_entry_lines', {
  id: text('id').primaryKey(),
  journalEntryId: text('journal_entry_id')
    .notNull()
    .references(() => journalEntries.id, { onDelete: 'cascade' }),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  debit: real('debit').default(0),
  credit: real('credit').default(0),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  journalEntry: one(journalEntries, {
    fields: [journalEntryLines.journalEntryId],
    references: [journalEntries.id],
  }),
  account: one(accounts, {
    fields: [journalEntryLines.accountId],
    references: [accounts.id],
  }),
}));

// ============================================================================
// CUSTOMERS
// ============================================================================
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  country: text('country'),
  taxId: text('tax_id'),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const customersRelations = relations(customers, ({ many }) => ({
  invoices: many(invoices),
  receivables: many(accountsReceivable),
}));

// ============================================================================
// INVOICES (headers)
// ============================================================================
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  invoiceNumber: text('invoice_number').unique(),
  customerId: text('customer_id').references(() => customers.id),
  status: text('status', {
    enum: ['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled', 'void'],
  }).notNull().default('draft'),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date').notNull(),
  subtotal: real('subtotal').default(0),
  taxTotal: real('tax_total').default(0),
  total: real('total').default(0),
  amountPaid: real('amount_paid').default(0),
  currency: text('currency').default('GHS'),
  notes: text('notes'),
  terms: text('terms'),
  journalEntryId: text('journal_entry_id'),
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  lines: many(invoiceLines),
  payments: many(invoicePayments),
}));

// ============================================================================
// INVOICE LINES
// ============================================================================
export const invoiceLines = sqliteTable('invoice_lines', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  productId: text('product_id'),
  variantId: text('variant_id'),
  description: text('description').notNull(),
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  taxId: text('tax_id'),
  taxRate: real('tax_rate').default(0),
  taxAmount: real('tax_amount').default(0),
  lineTotal: real('line_total').notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLines.invoiceId],
    references: [invoices.id],
  }),
}));

// ============================================================================
// INVOICE PAYMENTS
// ============================================================================
export const invoicePayments = sqliteTable('invoice_payments', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  paymentDate: text('payment_date').notNull(),
  paymentMethod: text('payment_method', {
    enum: ['cash', 'bank_transfer', 'mobile_money', 'check', 'other'],
  }),
  reference: text('reference'),
  notes: text('notes'),
  journalEntryId: text('journal_entry_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const invoicePaymentsRelations = relations(invoicePayments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoicePayments.invoiceId],
    references: [invoices.id],
  }),
}));

// ============================================================================
// EXPENSES
// ============================================================================
export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  expenseNumber: text('expense_number').unique(),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  categoryName: text('category_name'),
  supplierId: text('supplier_id'),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  taxId: text('tax_id'),
  taxRate: real('tax_rate').default(0),
  taxAmount: real('tax_amount').default(0),
  totalAmount: real('total_amount').notNull(),
  date: text('date').notNull(),
  paymentMethod: text('payment_method', {
    enum: ['cash', 'bank_transfer', 'mobile_money', 'check', 'other'],
  }),
  reference: text('reference'),
  status: text('status', { enum: ['recorded', 'voided'] }).default('recorded'),
  notes: text('notes'),
  journalEntryId: text('journal_entry_id'),
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  account: one(accounts, {
    fields: [expenses.accountId],
    references: [accounts.id],
  }),
}));

// ============================================================================
// ACCOUNTS RECEIVABLE
// ============================================================================
export const accountsReceivable = sqliteTable('accounts_receivable', {
  id: text('id').primaryKey(),
  customerId: text('customer_id')
    .notNull()
    .references(() => customers.id),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id),
  originalAmount: real('original_amount').notNull(),
  balanceDue: real('balance_due').notNull(),
  dueDate: text('due_date').notNull(),
  status: text('status', {
    enum: ['open', 'partial', 'paid', 'overdue', 'written_off'],
  }).default('open'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const accountsReceivableRelations = relations(accountsReceivable, ({ one }) => ({
  customer: one(customers, {
    fields: [accountsReceivable.customerId],
    references: [customers.id],
  }),
  invoice: one(invoices, {
    fields: [accountsReceivable.invoiceId],
    references: [invoices.id],
  }),
}));

// ============================================================================
// ACCOUNTS PAYABLE
// ============================================================================
export const accountsPayable = sqliteTable('accounts_payable', {
  id: text('id').primaryKey(),
  supplierId: text('supplier_id').notNull(),
  description: text('description').notNull(),
  originalAmount: real('original_amount').notNull(),
  balanceDue: real('balance_due').notNull(),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date').notNull(),
  reference: text('reference'),
  status: text('status', {
    enum: ['open', 'partial', 'paid', 'overdue'],
  }).default('open'),
  journalEntryId: text('journal_entry_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const accountsPayableRelations = relations(accountsPayable, ({ many }) => ({
  payments: many(apPayments),
}));

// ============================================================================
// AP PAYMENTS
// ============================================================================
export const apPayments = sqliteTable('ap_payments', {
  id: text('id').primaryKey(),
  accountsPayableId: text('accounts_payable_id')
    .notNull()
    .references(() => accountsPayable.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  paymentDate: text('payment_date').notNull(),
  paymentMethod: text('payment_method', {
    enum: ['cash', 'bank_transfer', 'mobile_money', 'check', 'other'],
  }),
  reference: text('reference'),
  notes: text('notes'),
  journalEntryId: text('journal_entry_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const apPaymentsRelations = relations(apPayments, ({ one }) => ({
  accountsPayable: one(accountsPayable, {
    fields: [apPayments.accountsPayableId],
    references: [accountsPayable.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;

export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type NewJournalEntryLine = typeof journalEntryLines.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type NewInvoiceLine = typeof invoiceLines.$inferInsert;

export type InvoicePayment = typeof invoicePayments.$inferSelect;
export type NewInvoicePayment = typeof invoicePayments.$inferInsert;

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

export type AccountReceivable = typeof accountsReceivable.$inferSelect;
export type NewAccountReceivable = typeof accountsReceivable.$inferInsert;

export type AccountPayable = typeof accountsPayable.$inferSelect;
export type NewAccountPayable = typeof accountsPayable.$inferInsert;

export type ApPayment = typeof apPayments.$inferSelect;
export type NewApPayment = typeof apPayments.$inferInsert;
