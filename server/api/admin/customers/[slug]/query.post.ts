import { findD1DatabaseByName, queryRemoteD1 } from '../../../../utils/cloudflare-api';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const providedKey = getHeader(event, 'x-provision-key');
  if (!config.provisionSecretKey || providedKey !== config.provisionSecretKey) {
    throw createError({ statusCode: 403, message: 'Invalid provisioning key.' });
  }

  const slug = getRouterParam(event, 'slug') || '';
  const body = await readBody(event);
  const sql = String(body.sql || '').trim();

  if (!sql) {
    throw createError({ statusCode: 400, message: 'SQL statement is required.' });
  }

  const remoteDb = await findD1DatabaseByName(`${slug}-db`);
  if (!remoteDb) {
    throw createError({ statusCode: 404, message: `No database found for "${slug}".` });
  }

  // Audit trail — this runs arbitrary, unguarded SQL against a customer's
  // live database, so every attempt (successful or not) is logged with who
  // ran it and against which customer.
  const session = await getUserSession(event);
  console.log(`[admin-sql-console] user=${session.user?.email} customer=${slug} sql=${sql}`);

  const result = await queryRemoteD1(remoteDb.uuid, sql);

  return { results: result };
});
