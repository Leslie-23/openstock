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
  free: 0,
  pro: 1,
  business: 2,
};

export default defineNuxtRouteMiddleware((to) => {
  if (to.path.startsWith('/auth/') || to.path === '/subscription') return;

  const requirement = ROUTE_TIERS.find((r) => to.path.startsWith(r.prefix));
  if (!requirement) return;

  const { settings } = useSettings();
  const currentTier = settings.value?.subscriptionTier || 'free';
  const currentLevel = TIER_LEVELS[currentTier] ?? 0;
  const requiredLevel = TIER_LEVELS[requirement.minTier] ?? 0;

  if (currentLevel < requiredLevel) {
    const toast = useToast();
    toast.warning(
      `This feature requires a ${requirement.minTier === 'pro' ? 'Pro' : 'Business'} subscription`,
      'Upgrade your plan to access this feature'
    );
    return navigateTo('/subscription');
  }
});
