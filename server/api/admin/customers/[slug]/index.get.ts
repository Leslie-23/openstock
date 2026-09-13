import { eq } from 'drizzle-orm';
import { findD1DatabaseByName, queryRemoteD1 } from '../../../../utils/cloudflare-api';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const providedKey = getHeader(event, 'x-provision-key');
  if (!config.provisionSecretKey || providedKey !== config.provisionSecretKey) {
    throw createError({ statusCode: 403, message: 'Invalid provisioning key.' });
  }

  const slug = getRouterParam(event, 'slug') || '';

  const db = useDB();
  const customer = await db
    .select()
    .from(tables.provisionedCustomers)
    .where(eq(tables.provisionedCustomers.slug, slug))
    .get();
  if (!customer) {
    throw createError({ statusCode: 404, message: `"${slug}" is not a known customer.` });
  }

  const remoteDb = await findD1DatabaseByName(`${slug}-db`);
  if (!remoteDb) {
    return { customer, tables: [], databaseId: null };
  }

  const tablesResult = await queryRemoteD1(
    remoteDb.uuid,
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name != 'd1_migrations' ORDER BY name"
  );
  const tableNames = (tablesResult[0]?.results || []).map((r: any) => r.name as string);

  return { customer, tables: tableNames, databaseId: remoteDb.uuid };
});
