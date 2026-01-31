import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as financeSchema from '../database/finance-schema';

export const financeTables = financeSchema;

let financeDbInstance: ReturnType<typeof drizzle> | null = null;
let sqliteInstance: InstanceType<typeof Database> | null = null;

function getFinanceDatabasePath(): string {
  const dbDir = join(process.cwd(), '.data', 'hub', 'cache');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  return join(dbDir, 'finance.sqlite');
}

function initFinanceDatabase() {
  const dbPath = getFinanceDatabasePath();
  const sqlite = new Database(dbPath);

  sqlite.pragma('journal_mode = WAL');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
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
    );

    CREATE TABLE IF NOT EXISTS cross_border_transactions (
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
    );

    CREATE TABLE IF NOT EXISTS forex_transactions (
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
    );

    CREATE TABLE IF NOT EXISTS crypto_transactions (
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
    );
  `);

  return { sqlite, drizzleDb: drizzle(sqlite, { schema: financeSchema }) };
}

export function useFinanceDB() {
  if (!financeDbInstance) {
    const { sqlite, drizzleDb } = initFinanceDatabase();
    sqliteInstance = sqlite;
    financeDbInstance = drizzleDb;
  }
  return financeDbInstance;
}
