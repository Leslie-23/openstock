import { drizzle } from 'drizzle-orm/d1';
import * as hrSchema from '../database/hr-schema';

export const hrTables = hrSchema;

export function useHRDB() {
  return drizzle(hubDatabase(), { schema: hrSchema });
}
