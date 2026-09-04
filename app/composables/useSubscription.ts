type Tier = 'free' | 'pro' | 'business';

const TIER_LEVELS: Record<Tier, number> = {
  free: 0,
  pro: 1,
  business: 2,
};

type Feature =
  | 'finance'
  | 'hr'
  | 'invoicing'
  | 'expenses'
  | 'customers'
  | 'accounting_full'
  | 'ar_ap'
  | 'reports';

const FEATURE_TIERS: Record<Feature, Tier> = {
  finance: 'pro',
  hr: 'pro',
  invoicing: 'pro',
  expenses: 'pro',
  customers: 'pro',
  accounting_full: 'business',
  ar_ap: 'business',
  reports: 'business',
};

export const useSubscription = () => {
  const { settings } = useSettings();

  const tier = computed<Tier>(() => {
    return (settings.value?.subscriptionTier as Tier) || 'free';
  });

  const isFreeTier = computed(() => tier.value === 'free');
  const isProTier = computed(() => tier.value === 'pro');
  const isBusinessTier = computed(() => tier.value === 'business');

  function canAccess(feature: Feature): boolean {
    const requiredTier = FEATURE_TIERS[feature];
    if (!requiredTier) return true;
    return (TIER_LEVELS[tier.value] ?? 0) >= (TIER_LEVELS[requiredTier] ?? 0);
  }

  const productLimit = computed(() => {
    if (tier.value === 'free') return 25;
    return Infinity;
  });

  const userLimit = computed(() => {
    if (tier.value === 'free') return 1;
    if (tier.value === 'pro') return 5;
    return Infinity;
  });

  return {
    tier,
    isFreeTier,
    isProTier,
    isBusinessTier,
    canAccess,
    productLimit,
    userLimit,
  };
};
