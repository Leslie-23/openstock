import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const reference = query.reference as string;

  if (!reference) {
    throw createError({ statusCode: 400, message: 'Payment reference is required' });
  }

  const config = useRuntimeConfig();
  if (!config.paystackSecretKey) {
    throw createError({ statusCode: 500, message: 'Paystack is not configured' });
  }

  const response = await $fetch<{
    status: boolean;
    data: {
      status: string;
      amount: number;
      currency: string;
      metadata: { plan: string };
      customer: { customer_code: string; email: string };
    };
  }>(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${config.paystackSecretKey}`,
    },
  });

  if (!response.status || response.data.status !== 'success') {
    throw createError({ statusCode: 400, message: 'Payment verification failed' });
  }

  const plan = response.data.metadata?.plan;
  if (!plan || !['pro', 'business'].includes(plan)) {
    throw createError({ statusCode: 400, message: 'Invalid plan in payment metadata' });
  }

  const db = useDB();
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 30);

  await db
    .update(tables.settings)
    .set({
      subscriptionTier: plan,
      subscriptionStartDate: today.toISOString().split('T')[0],
      subscriptionEndDate: endDate.toISOString().split('T')[0],
      paystackCustomerCode: response.data.customer?.customer_code || null,
      updatedAt: new Date(),
    })
    .where(eq(tables.settings.id, 1));

  return {
    success: true,
    tier: plan,
    startDate: today.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
});
