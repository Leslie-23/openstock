import { eq } from 'drizzle-orm';

const PLAN_AMOUNTS: Record<string, number> = {
  pro: 9900,
  business: 24900,
};

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Only admins can manage subscriptions' });
  }

  const body = await readBody(event);
  const { plan, email, callbackUrl } = body;

  if (!plan || !PLAN_AMOUNTS[plan]) {
    throw createError({ statusCode: 400, message: 'Invalid plan. Must be pro or business' });
  }
  if (!email) {
    throw createError({ statusCode: 400, message: 'Email is required' });
  }
  if (!callbackUrl) {
    throw createError({ statusCode: 400, message: 'Callback URL is required' });
  }

  const config = useRuntimeConfig();
  if (!config.paystackSecretKey) {
    throw createError({ statusCode: 500, message: 'Paystack is not configured' });
  }

  const response = await $fetch<{
    status: boolean;
    data: { authorization_url: string; access_code: string; reference: string };
  }>('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.paystackSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      email,
      amount: PLAN_AMOUNTS[plan],
      currency: 'GHS',
      callback_url: callbackUrl,
      metadata: {
        plan,
        businessId: 1,
      },
    },
  });

  if (!response.status) {
    throw createError({ statusCode: 502, message: 'Failed to initialize payment' });
  }

  return {
    authorizationUrl: response.data.authorization_url,
    reference: response.data.reference,
    accessCode: response.data.access_code,
  };
});
