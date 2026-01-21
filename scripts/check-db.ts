import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), '.data', 'hub', 'cache', 'db.sqlite');
const db = new Database(DB_PATH, { readonly: true });

console.log('Database Tables:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables.map((t: any) => t.name).join(', '));

console.log('\n\nTable Counts:');
const tablesToCheck = ['users', 'products', 'categories', 'suppliers', 'taxes', 'stock_movements'];

for (const table of tablesToCheck) {
  try {
    const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
    console.log(`${table}: ${result.count} records`);
  } catch (error: any) {
    console.log(`${table}: Error - ${error.message}`);
  }
}

db.close();
