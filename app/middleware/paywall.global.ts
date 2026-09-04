const ROUTE_TIERS: { prefix: string; minTier: 'pro' | 'business' }[] = [
  { prefix: '/finance', minTier: 'pro' },
  { prefix: '/employees', minTier: 'pro' },
  { prefix: '/departments', minTier: 'pro' },
  { prefix: '/attendance', minTier: 'pro' },
  { prefix: '/leave', minTier: 'pro' },
  { prefix: '/payroll', minTier: 'pro' },
  { prefix: '/accounting/invoices', minTier: 'pro' },
  { prefix: '/accounting/expenses', minTier: 'pro' },
  { prefix: '/accounting/customers', minTier: 'pro' },
  { prefix: '/accounting/chart-of-accounts', minTier: 'business' },
  { prefix: '/accounting/journal', minTier: 'business' },
  { prefix: '/accounting/receivables', minTier: 'business' },
  { prefix: '/accounting/payables', minTier: 'business' },
  { prefix: '/accounting/reports', minTier: 'business' },
];

const TIER_LEVELS: Record<string, number> = {
  demo: 0,
  pro: 1,
  business: 2,
};

export default defineNuxtRouteMiddleware((to) => {
  if (to.path.startsWith('/auth/') || to.path === '/subscription') return;

  const { isDemoExpired, isSubscriptionExpired, tier } = useSubscription();

  if (isDemoExpired.value) {
    const toast = useToast();
    toast.add({ title: 'Your demo has expired. Please subscribe to continue.', color: 'red' });
    return navigateTo('/subscription');
  }

  if (isSubscriptionExpired.value) {
    const toast = useToast();
    toast.add({ title: 'Your subscription has expired. Please renew to continue.', color: 'red' });
    return navigateTo('/subscription');
  }

  if (tier.value === 'demo') return;

  const requirement = ROUTE_TIERS.find((r) => to.path.startsWith(r.prefix));
  if (!requirement) return;

  const { settings } = useSettings();
  const currentTier = settings.value?.subscriptionTier || 'demo';
  const currentLevel = TIER_LEVELS[currentTier] ?? 0;
  const requiredLevel = TIER_LEVELS[requirement.minTier] ?? 0;

  if (currentLevel < requiredLevel) {
    const toast = useToast();
    toast.add({
      title: `This feature requires a ${requirement.minTier === 'pro' ? 'Pro' : 'Business'} subscription`,
      color: 'amber',
    });
    return navigateTo('/subscription');
  }
});
