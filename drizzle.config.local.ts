import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/database/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: 'file:.data/hub/d1/db.sqlite'  # Common location for Nuxt Hub
  }
});
