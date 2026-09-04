import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Only admins can change the subscription tier' });
  }

  const body = await readBody(event);
  const tier = body.tier;

  if (!['free', 'pro', 'business'].includes(tier)) {
    throw createError({ statusCode: 400, message: 'Invalid tier. Must be free, pro, or business' });
  }

  const db = useDB();
  const now = new Date().toISOString().split('T')[0];

  await db
    .update(tables.settings)
    .set({
      subscriptionTier: tier,
      subscriptionStartDate: now,
      subscriptionEndDate: null,
      updatedAt: new Date(),
    })
    .where(eq(tables.settings.id, 1));

  return { success: true, tier };
});
