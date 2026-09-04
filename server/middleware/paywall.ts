import { eq } from 'drizzle-orm';

const TIER_LEVELS: Record<string, number> = {
  demo: 0,
  pro: 1,
  business: 2,
};

const ROUTE_REQUIREMENTS: { prefix: string; minTier: string }[] = [
  { prefix: '/api/finance', minTier: 'pro' },
  { prefix: '/api/employees', minTier: 'pro' },
  { prefix: '/api/departments', minTier: 'pro' },
  { prefix: '/api/attendance', minTier: 'pro' },
  { prefix: '/api/leave', minTier: 'pro' },
  { prefix: '/api/payroll', minTier: 'pro' },
  { prefix: '/api/accounting/invoices', minTier: 'pro' },
  { prefix: '/api/accounting/expenses', minTier: 'pro' },
  { prefix: '/api/accounting/customers', minTier: 'pro' },
  { prefix: '/api/accounting/accounts', minTier: 'business' },
  { prefix: '/api/accounting/journal-entries', minTier: 'business' },
  { prefix: '/api/accounting/receivables', minTier: 'business' },
  { prefix: '/api/accounting/payables', minTier: 'business' },
  { prefix: '/api/accounting/reports', minTier: 'business' },
];

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;

  if (!path.startsWith('/api/')) return;
  if (path.startsWith('/api/auth/')) return;
  if (path.startsWith('/api/subscription')) return;
  if (path.startsWith('/api/__')) return;
  if (path === '/api/settings' && event.method === 'GET') return;
  if (path === '/api/accounting/seed-accounts') return;

  const db = useDB();
  const settingsRow = await db
    .select({
      subscriptionTier: tables.settings.subscriptionTier,
      trialEndsAt: tables.settings.trialEndsAt,
      subscriptionEndDate: tables.settings.subscriptionEndDate,
    })
    .from(tables.settings)
    .where(eq(tables.settings.id, 1))
    .get();

  const currentTier = settingsRow?.subscriptionTier || 'demo';
  const today = new Date().toISOString().split('T')[0];

  if (currentTier === 'demo') {
    const trialEnd = settingsRow?.trialEndsAt;
    if (trialEnd && trialEnd < today) {
      throw createError({
        statusCode: 403,
        message: 'Your demo has expired. Please subscribe to continue using the app.',
      });
    }
    return;
  }

  const subEnd = settingsRow?.subscriptionEndDate;
  if (subEnd && subEnd < today) {
    throw createError({
      statusCode: 403,
      message: 'Your subscription has expired. Please renew to continue.',
    });
  }

  const requirement = ROUTE_REQUIREMENTS.find((r) => path.startsWith(r.prefix));
  if (!requirement) return;

  const currentLevel = TIER_LEVELS[currentTier] ?? 0;
  const requiredLevel = TIER_LEVELS[requirement.minTier] ?? 0;

  if (currentLevel < requiredLevel) {
    throw createError({
      statusCode: 403,
      message: `This feature requires a ${requirement.minTier === 'pro' ? 'Pro' : 'Business'} subscription`,
    });
  }
});
