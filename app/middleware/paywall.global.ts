const ROUTE_TIERS: { prefix: string; minTier: 'pro' | 'business' }[] = [
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

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/auth/') || to.path === '/subscription') return;

  // Personal appliance/forex/crypto trading ledger — not part of the general
  // SME product. Disabled for all customers regardless of subscription tier.
  if (to.path.startsWith('/finance')) {
    const config = useRuntimeConfig();
    if (!config.public.financeModuleEnabled) {
      return navigateTo('/', { replace: true });
    }
  }

  // Having no plan / an expired trial / an expired subscription is handled by
  // <PlanRequiredOverlay/> in the layout — it blocks the whole app in place
  // on every route, so there's nothing to redirect for here. This check only
  // covers a route requiring a higher tier than an otherwise-active plan.
  const requirement = ROUTE_TIERS.find((r) => to.path.startsWith(r.prefix));
  if (!requirement) return;

  // Fetch fresh, uncached — must reflect the real subscription state on
  // every navigation. useRequestFetch() (not plain $fetch) forwards the
  // incoming request's session cookie during SSR.
  const requestFetch = useRequestFetch();
  let freshSettings: { subscriptionTier?: string } | null = null;
  try {
    freshSettings = await requestFetch('/api/settings');
  } catch {
    return; // couldn't verify — don't block navigation on a network hiccup
  }
  const currentTier = freshSettings?.subscriptionTier || 'demo';
  if (currentTier === 'demo') return;

  const currentLevel = TIER_LEVELS[currentTier] ?? 0;
  const requiredLevel = TIER_LEVELS[requirement.minTier] ?? 0;

  if (currentLevel < requiredLevel) {
    const toast = useToast();
    toast.warning(`This feature requires a ${requirement.minTier === 'pro' ? 'Pro' : 'Business'} subscription`);
    return navigateTo('/subscription');
  }
});
