import {
  sqliteTable,
  text,
  integer,
  real,
} from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// FINANCE DATABASE SCHEMA
// Simple financial tracking for multiple business lines:
// - Appliance store (ins/outs)
// - Nigeria <-> Ghana cross-border transactions
// - Forex (USD <-> Cedis)
// - Crypto (BTC and others buy/sell)
// ============================================================================

// ============================================================================
// TRANSACTIONS - Simple ins and outs across all business lines
// ============================================================================
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'in' | 'out'
  businessLine: text('business_line').notNull(), // 'appliance' | 'cross_border' | 'forex' | 'crypto'
  description: text('description').notNull(),
  amount: real('amount').notNull(), // amount in base currency (GHS cedis)
  currency: text('currency').default('GHS'), // GHS, NGN, USD, BTC, etc.
  reference: text('reference'), // invoice/receipt number
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ============================================================================
// CROSS-BORDER TRANSACTIONS - Nigeria <-> Ghana with profit tracking
// ============================================================================
export const crossBorderTransactions = sqliteTable('cross_border_transactions', {
  id: text('id').primaryKey(),
  direction: text('direction').notNull(), // 'ng_to_gh' | 'gh_to_ng'
  description: text('description').notNull(),

  // What was sent
  sentAmount: real('sent_amount').notNull(),
  sentCurrency: text('sent_currency').notNull(), // 'NGN' | 'GHS'

  // What was received
  receivedAmount: real('received_amount').notNull(),
  receivedCurrency: text('received_currency').notNull(), // 'GHS' | 'NGN'

  // Exchange rate used
  exchangeRate: real('exchange_rate').notNull(),

  // Costs & fees
  fees: real('fees').default(0), // any transfer fees
  otherCosts: real('other_costs').default(0),

  // Profit (calculated: receivedAmount converted to base - sentAmount converted to base - fees - costs)
  profitGHS: real('profit_ghs').notNull(), // profit in cedis

  customerName: text('customer_name'),
  reference: text('reference'),
  status: text('status').default('completed'), // 'pending' | 'completed' | 'cancelled'
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ============================================================================
// FOREX TRANSACTIONS - USD <-> Cedis
// ============================================================================
export const forexTransactions = sqliteTable('forex_transactions', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'buy' | 'sell' (buy USD or sell USD)

  // Amounts
  usdAmount: real('usd_amount').notNull(),
  ghsAmount: real('ghs_amount').notNull(),
  exchangeRate: real('exchange_rate').notNull(), // rate used

  // Market rate at time of transaction (to track if we got a good deal)
  marketRate: real('market_rate'),

  // Profit/spread
  profitGHS: real('profit_ghs').default(0),

  customerName: text('customer_name'),
  reference: text('reference'),
  status: text('status').default('completed'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ============================================================================
// CRYPTO TRANSACTIONS - BTC and other crypto buy/sell
// ============================================================================
export const cryptoTransactions = sqliteTable('crypto_transactions', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'buy' | 'sell'
  coin: text('coin').notNull(), // 'BTC' | 'ETH' | 'USDT' etc.

  // Amounts
  coinAmount: real('coin_amount').notNull(),
  unitPrice: real('unit_price').notNull(), // price per coin in GHS
  totalGHS: real('total_ghs').notNull(), // total in cedis

  // For sell: what we originally bought at (to calculate profit)
  buyPricePerUnit: real('buy_price_per_unit'),
  profitGHS: real('profit_ghs').default(0),

  customerName: text('customer_name'),
  reference: text('reference'),
  status: text('status').default('completed'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ============================================================================
// RELATIONS
// ============================================================================
export const transactionsRelations = relations(transactions, ({ }) => ({}));
export const crossBorderRelations = relations(crossBorderTransactions, ({ }) => ({}));
export const forexRelations = relations(forexTransactions, ({ }) => ({}));
export const cryptoRelations = relations(cryptoTransactions, ({ }) => ({}));
