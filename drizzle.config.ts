import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: [
    './server/database/schema.ts',
    './server/database/accounting-schema.ts',
    './server/database/finance-schema.ts',
  ],
  out: './server/database/migrations',
});
