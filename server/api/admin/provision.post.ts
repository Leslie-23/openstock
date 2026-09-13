import { eq } from 'drizzle-orm';

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$/;

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  if (!config.provisionSecretKey || !config.githubProvisionToken) {
    throw createError({ statusCode: 500, message: 'Provisioning is not configured on this deployment.' });
  }

  const providedKey = getHeader(event, 'x-provision-key');
  if (!providedKey || providedKey !== config.provisionSecretKey) {
    throw createError({ statusCode: 403, message: 'Invalid provisioning key.' });
  }

  const body = await readBody(event);
  const slug = String(body.customerSlug || '').trim().toLowerCase();
  const businessName = String(body.businessName || '').trim();
  const currency = String(body.currency || 'GHC').trim();
  const trialDays = Number(body.trialDays ?? 14);

  if (!SLUG_RE.test(slug)) {
    throw createError({
      statusCode: 400,
      message: 'Customer slug must be lowercase letters, digits, and hyphens (2-50 chars), not starting/ending with a hyphen.',
    });
  }
  if (!businessName) {
    throw createError({ statusCode: 400, message: 'Business name is required.' });
  }
  if (!['EUR', 'USD', 'GBP', 'GHC'].includes(currency)) {
    throw createError({ statusCode: 400, message: 'Invalid currency.' });
  }
  if (!Number.isFinite(trialDays) || trialDays < 1 || trialDays > 365) {
    throw createError({ statusCode: 400, message: 'Trial days must be between 1 and 365.' });
  }

  const db = useDB();
  const existing = await db
    .select({ id: tables.provisionedCustomers.id })
    .from(tables.provisionedCustomers)
    .where(eq(tables.provisionedCustomers.slug, slug))
    .get();
  if (existing) {
    throw createError({ statusCode: 409, message: `"${slug}" has already been provisioned.` });
  }

  const [owner, repo] = config.githubRepo.split('/');
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/provision-customer.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.githubProvisionToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          customer_slug: slug,
          business_name: businessName,
          currency,
          trial_days: String(trialDays),
        },
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw createError({
      statusCode: 502,
      message: `Failed to trigger provisioning workflow (GitHub responded ${response.status}). ${detail}`.trim(),
    });
  }

  await db.insert(tables.provisionedCustomers).values({
    id: generateId('cust'),
    slug,
    businessName,
    currency,
    trialDays,
    url: `https://${slug}.pages.dev`,
    status: 'provisioning',
  });

  return {
    success: true,
    projectName: slug,
    expectedUrl: `https://${slug}.pages.dev`,
    actionsUrl: `https://github.com/${owner}/${repo}/actions/workflows/provision-customer.yml`,
  };
});
