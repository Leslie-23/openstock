import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Only admins can change the subscription tier' });
  }

  const body = await readBody(event);
  const tier = body.tier;

  if (!['demo', 'pro', 'business'].includes(tier)) {
    throw createError({ statusCode: 400, message: 'Invalid tier. Must be demo, pro, or business' });
  }

  const db = useDB();
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const updateData: Record<string, any> = {
    subscriptionTier: tier,
    subscriptionStartDate: today,
    updatedAt: now,
  };

  if (tier === 'demo') {
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 14);
    updateData.trialEndsAt = trialEnd.toISOString().split('T')[0];
    updateData.subscriptionEndDate = null;
  } else {
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);
    updateData.subscriptionEndDate = endDate.toISOString().split('T')[0];
  }

  await db
    .update(tables.settings)
    .set(updateData)
    .where(eq(tables.settings.id, 1));

  return { success: true, tier };
});
