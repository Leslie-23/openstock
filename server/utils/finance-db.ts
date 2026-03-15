import { drizzle } from 'drizzle-orm/d1';
import * as financeSchema from '../database/finance-schema';

export const financeTables = financeSchema;

export function useFinanceDB() {
  return drizzle(hubDatabase(), { schema: financeSchema });
}
