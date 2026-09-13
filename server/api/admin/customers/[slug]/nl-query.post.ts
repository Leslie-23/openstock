import { findD1DatabaseByName, queryRemoteD1 } from '../../../../utils/cloudflare-api';
import { generateSqlFromPrompt } from '../../../../utils/groq';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const providedKey = getHeader(event, 'x-provision-key');
  if (!config.provisionSecretKey || providedKey !== config.provisionSecretKey) {
    throw createError({ statusCode: 403, message: 'Invalid provisioning key.' });
  }

  const slug = getRouterParam(event, 'slug') || '';
  const body = await readBody(event);
  const prompt = String(body.prompt || '').trim();
  if (!prompt) {
    throw createError({ statusCode: 400, message: 'Describe what you want first.' });
  }

  const remoteDb = await findD1DatabaseByName(`${slug}-db`);
  if (!remoteDb) {
    throw createError({ statusCode: 404, message: `No database found for "${slug}".` });
  }

  const schemaResult = await queryRemoteD1(
    remoteDb.uuid,
    "SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name != 'd1_migrations' AND sql IS NOT NULL"
  );
  const schemaSql = (schemaResult[0]?.results || []).map((r: any) => r.sql).join(';\n');

  const sql = await generateSqlFromPrompt(prompt, schemaSql);

  return { sql };
});
