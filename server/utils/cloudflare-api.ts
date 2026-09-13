// Direct calls to Cloudflare's REST API — used by the admin console to reach
// into a *different* D1 database than the one this deployment is bound to
// (i.e. a provisioned customer's isolated database). The `DB` binding only
// ever points at the current deployment's own database, so listing/querying
// other customers' databases has to go through the HTTP API instead.

interface CloudflareListResponse<T> {
  success: boolean;
  result: T[];
  errors: { code: number; message: string }[];
}

interface D1QueryResult {
  success: boolean;
  results: Record<string, unknown>[];
  meta?: { changes?: number; rows_read?: number; rows_written?: number };
}

interface CloudflareQueryResponse {
  success: boolean;
  result: D1QueryResult[];
  errors: { code: number; message: string }[];
}

function cfHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function findD1DatabaseByName(name: string) {
  const config = useRuntimeConfig();
  if (!config.cloudflareApiToken || !config.cloudflareAccountId) {
    throw createError({ statusCode: 500, message: 'Cloudflare API credentials are not configured on this deployment.' });
  }

  const res = await $fetch<CloudflareListResponse<{ uuid: string; name: string }>>(
    `https://api.cloudflare.com/client/v4/accounts/${config.cloudflareAccountId}/d1/database`,
    { headers: cfHeaders(config.cloudflareApiToken) }
  ).catch((e) => {
    const message = e?.data?.errors?.[0]?.message || e?.message || 'Failed to list D1 databases';
    throw createError({ statusCode: 502, message: `Cloudflare API error: ${message}` });
  });

  return res.result.find((db) => db.name === name) || null;
}

export async function queryRemoteD1(databaseId: string, sql: string, params: unknown[] = []) {
  const config = useRuntimeConfig();
  if (!config.cloudflareApiToken || !config.cloudflareAccountId) {
    throw createError({ statusCode: 500, message: 'Cloudflare API credentials are not configured on this deployment.' });
  }

  const res = await $fetch<CloudflareQueryResponse>(
    `https://api.cloudflare.com/client/v4/accounts/${config.cloudflareAccountId}/d1/database/${databaseId}/query`,
    {
      method: 'POST',
      headers: cfHeaders(config.cloudflareApiToken),
      body: { sql, params },
    }
  ).catch((e) => {
    const message = e?.data?.errors?.[0]?.message || e?.message || 'D1 query failed';
    throw createError({ statusCode: 502, message: `Cloudflare D1 error: ${message}` });
  });

  if (!res.success) {
    throw createError({ statusCode: 502, message: res.errors?.[0]?.message || 'D1 query failed' });
  }

  return res.result;
}

export async function findPagesProjectUrl(projectName: string) {
  const config = useRuntimeConfig();
  if (!config.cloudflareApiToken || !config.cloudflareAccountId) return null;

  try {
    const res = await $fetch<{ success: boolean; result: { subdomain: string } }>(
      `https://api.cloudflare.com/client/v4/accounts/${config.cloudflareAccountId}/pages/projects/${projectName}`,
      { headers: cfHeaders(config.cloudflareApiToken) }
    );
    return res.result?.subdomain ? `https://${res.result.subdomain}` : null;
  } catch {
    return null;
  }
}
