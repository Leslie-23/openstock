import { drizzle } from 'drizzle-orm/d1';
import * as accountingSchema from '../database/accounting-schema';

export const accountingTables = accountingSchema;

export function useAccountingDB() {
  return drizzle(hubDatabase(), { schema: accountingSchema });
}
