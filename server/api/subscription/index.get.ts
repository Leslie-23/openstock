import { eq } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useDB();
  const settingsRow = await db
    .select({
      subscriptionTier: tables.settings.subscriptionTier,
      subscriptionStartDate: tables.settings.subscriptionStartDate,
      subscriptionEndDate: tables.settings.subscriptionEndDate,
    })
    .from(tables.settings)
    .where(eq(tables.settings.id, 1))
    .get();

  return {
    tier: settingsRow?.subscriptionTier || 'free',
    startDate: settingsRow?.subscriptionStartDate || null,
    endDate: settingsRow?.subscriptionEndDate || null,
  };
});
