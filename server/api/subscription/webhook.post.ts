import { createHmac } from 'crypto';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  if (!config.paystackSecretKey) {
    throw createError({ statusCode: 500, message: 'Paystack is not configured' });
  }

  const rawBody = await readRawBody(event);
  if (!rawBody) {
    throw createError({ statusCode: 400, message: 'Empty request body' });
  }

  const signature = getHeader(event, 'x-paystack-signature');
  const hash = createHmac('sha512', config.paystackSecretKey)
    .update(rawBody)
    .digest('hex');

  if (hash !== signature) {
    throw createError({ statusCode: 401, message: 'Invalid signature' });
  }

  const payload = JSON.parse(rawBody);
  const eventType = payload.event as string;
  const data = payload.data;

  const db = useDB();

  if (eventType === 'charge.success') {
    const plan = data.metadata?.plan;
    if (plan && ['pro', 'business'].includes(plan)) {
      const today = new Date();
      const currentSettings = await db
        .select({ subscriptionEndDate: tables.settings.subscriptionEndDate })
        .from(tables.settings)
        .where(eq(tables.settings.id, 1))
        .get();

      let baseDate = today;
      if (currentSettings?.subscriptionEndDate) {
        const existing = new Date(currentSettings.subscriptionEndDate);
        if (existing > today) baseDate = existing;
      }

      const endDate = new Date(baseDate);
      endDate.setDate(endDate.getDate() + 30);

      await db
        .update(tables.settings)
        .set({
          subscriptionTier: plan,
          subscriptionStartDate: today.toISOString().split('T')[0],
          subscriptionEndDate: endDate.toISOString().split('T')[0],
          paystackCustomerCode: data.customer?.customer_code || null,
          updatedAt: new Date(),
        })
        .where(eq(tables.settings.id, 1));
    }
  }

  if (eventType === 'subscription.create') {
    await db
      .update(tables.settings)
      .set({
        paystackSubscriptionCode: data.subscription_code || null,
        paystackPlanCode: data.plan?.plan_code || null,
        updatedAt: new Date(),
      })
      .where(eq(tables.settings.id, 1));
  }

  if (eventType === 'subscription.disable') {
    await db
      .update(tables.settings)
      .set({
        paystackSubscriptionCode: null,
        paystackPlanCode: null,
        updatedAt: new Date(),
      })
      .where(eq(tables.settings.id, 1));
  }

  return { received: true };
});
