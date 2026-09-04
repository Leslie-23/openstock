import { eq } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useDB();
  const settingsRow = await db
    .select({
      subscriptionTier: tables.settings.subscriptionTier,
      subscriptionStartDate: tables.settings.subscriptionStartDate,
      subscriptionEndDate: tables.settings.subscriptionEndDate,
      trialEndsAt: tables.settings.trialEndsAt,
      paystackCustomerCode: tables.settings.paystackCustomerCode,
    })
    .from(tables.settings)
    .where(eq(tables.settings.id, 1))
    .get();

  return {
    tier: settingsRow?.subscriptionTier || 'demo',
    startDate: settingsRow?.subscriptionStartDate || null,
    endDate: settingsRow?.subscriptionEndDate || null,
    trialEndsAt: settingsRow?.trialEndsAt || null,
    hasPaystack: !!settingsRow?.paystackCustomerCode,
  };
});
