import { desc } from 'drizzle-orm';
import { findD1DatabaseByName, queryRemoteD1 } from '../../../utils/cloudflare-api';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const providedKey = getHeader(event, 'x-provision-key');
  if (!config.provisionSecretKey || providedKey !== config.provisionSecretKey) {
    throw createError({ statusCode: 403, message: 'Invalid provisioning key.' });
  }

  const db = useDB();
  const customers = await db
    .select()
    .from(tables.provisionedCustomers)
    .orderBy(desc(tables.provisionedCustomers.createdAt))
    .all();

  const withStats = await Promise.all(
    customers.map(async (customer) => {
      try {
        const remoteDb = await findD1DatabaseByName(`${customer.slug}-db`);
        if (!remoteDb) {
          return { ...customer, live: null, liveError: 'Database not found yet — provisioning may still be running.' };
        }

        const [settingsResult, countsResult] = await Promise.all([
          queryRemoteD1(remoteDb.uuid, 'SELECT subscription_tier, trial_ends_at, subscription_end_date FROM settings WHERE id = 1'),
          queryRemoteD1(
            remoteDb.uuid,
            'SELECT (SELECT COUNT(*) FROM users) as users, (SELECT COUNT(*) FROM products) as products'
          ),
        ]);

        const settingsRow = settingsResult[0]?.results?.[0] as Record<string, unknown> | undefined;
        const countsRow = countsResult[0]?.results?.[0] as Record<string, unknown> | undefined;

        return {
          ...customer,
          databaseId: remoteDb.uuid,
          live: {
            subscriptionTier: settingsRow?.subscription_tier ?? null,
            trialEndsAt: settingsRow?.trial_ends_at ?? null,
            subscriptionEndDate: settingsRow?.subscription_end_date ?? null,
            userCount: countsRow?.users ?? 0,
            productCount: countsRow?.products ?? 0,
          },
          liveError: null,
        };
      } catch (e: any) {
        return { ...customer, live: null, liveError: e?.message || 'Could not reach this customer\'s database.' };
      }
    })
  );

  return withStats;
});
