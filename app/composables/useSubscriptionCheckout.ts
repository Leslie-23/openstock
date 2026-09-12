export interface SubscriptionTier {
  id: 'demo' | 'pro' | 'business';
  name: string;
  price: string;
  period: string;
  description: string;
  popular?: boolean;
  features: string[];
  notIncluded: string[];
}

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'demo',
    name: 'Demo',
    price: 'GHS 0',
    period: '14-day trial',
    description: 'Full access trial to explore all features',
    features: [
      'Up to 25 products',
      'Full feature access for 14 days',
      'Dashboard & stock overview',
      'HR & Payroll',
      'Invoicing & accounting',
      '1 user',
    ],
    notIncluded: [],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'GHS 99',
    period: '/month',
    description: 'Full business operations suite',
    popular: true,
    features: [
      'Unlimited products',
      'HR & Payroll management',
      'Invoicing & billing',
      'Expense tracking',
      'Customer management',
      'Up to 5 users',
    ],
    notIncluded: [
      'Chart of Accounts',
      'General Ledger',
      'AR/AP tracking',
      'Financial statements',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 'GHS 249',
    period: '/month',
    description: 'Complete accounting & financial control',
    features: [
      'Unlimited products',
      'Everything in Pro',
      'Chart of Accounts',
      'Double-entry journal',
      'Accounts Receivable',
      'Accounts Payable',
      'P&L, Balance Sheet, Trial Balance',
      'General Ledger reports',
      'Unlimited users',
    ],
    notIncluded: [],
  },
];

export function useSubscriptionCheckout() {
  const { isAdmin, user } = useAuth();
  const toast = useToast();
  const { refresh: refreshSettings } = useSettings();
  const { data: subscription, refresh } = useFetch('/api/subscription');
  const isProcessing = ref(false);

  const currentTier = computed(() => subscription.value?.tier || 'demo');

  async function handlePaystackCheckout(planId: 'pro' | 'business') {
    if (!isAdmin.value) {
      toast.error('Permission denied', 'Only admins can manage subscriptions');
      return;
    }

    isProcessing.value = true;
    try {
      const callbackUrl = `${window.location.origin}/subscription?verify=true`;
      const email = user.value?.email || '';

      const result = await $fetch('/api/subscription/initialize', {
        method: 'POST',
        body: { plan: planId, email, callbackUrl },
      });

      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
      }
    } catch (e: any) {
      toast.error('Payment failed', e.data?.message || 'Could not initialize payment');
    } finally {
      isProcessing.value = false;
    }
  }

  async function startTrial() {
    if (!isAdmin.value) {
      toast.error('Permission denied', 'Ask an admin to activate a plan');
      return;
    }

    isProcessing.value = true;
    try {
      await $fetch('/api/subscription', { method: 'POST', body: { tier: 'demo' } });
      await refresh();
      await refreshSettings();
      toast.success('Trial started', 'You have full access for the next 14 days');
    } catch (e: any) {
      toast.error('Could not start trial', e.data?.message || 'Please try again');
    } finally {
      isProcessing.value = false;
    }
  }

  async function verifyPayment(reference: string) {
    isProcessing.value = true;
    try {
      const result = await $fetch('/api/subscription/verify', { params: { reference } });
      if (result.success) {
        await refresh();
        await refreshSettings();
        toast.success('Payment verified', `You are now on the ${result.tier?.charAt(0).toUpperCase()}${result.tier?.slice(1)} plan`);
      }
    } catch (e: any) {
      toast.error('Verification failed', e.data?.message || 'Could not verify payment');
    } finally {
      isProcessing.value = false;
    }
  }

  return {
    isAdmin,
    subscription,
    currentTier,
    isProcessing,
    tiers: SUBSCRIPTION_TIERS,
    handlePaystackCheckout,
    startTrial,
    verifyPayment,
  };
}
