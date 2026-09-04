type Tier = 'demo' | 'pro' | 'business';

const TIER_LEVELS: Record<Tier, number> = {
  demo: 0,
  pro: 1,
  business: 2,
};

type Feature =
  | 'hr'
  | 'invoicing'
  | 'expenses'
  | 'customers'
  | 'accountingFull'
  | 'arAp'
  | 'reports';

const FEATURE_TIERS: Record<Feature, Tier> = {
  hr: 'pro',
  invoicing: 'pro',
  expenses: 'pro',
  customers: 'pro',
  accountingFull: 'business',
  arAp: 'business',
  reports: 'business',
};

export const useSubscription = () => {
  const { settings } = useSettings();

  const tier = computed<Tier>(() => {
    return (settings.value?.subscriptionTier as Tier) || 'demo';
  });

  const isDemoTier = computed(() => tier.value === 'demo');
  const isProTier = computed(() => tier.value === 'pro');
  const isBusinessTier = computed(() => tier.value === 'business');

  const isDemoExpired = computed(() => {
    if (tier.value !== 'demo') return false;
    const trialEnd = settings.value?.trialEndsAt;
    if (!trialEnd) return false;
    return new Date(trialEnd) < new Date();
  });

  const isSubscriptionExpired = computed(() => {
    if (tier.value === 'demo') return false;
    const endDate = settings.value?.subscriptionEndDate;
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  });

  const daysLeft = computed(() => {
    if (tier.value !== 'demo') return null;
    const trialEnd = settings.value?.trialEndsAt;
    if (!trialEnd) return null;
    const diff = new Date(trialEnd).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  });

  function canAccess(feature: Feature): boolean {
    if (isDemoExpired.value) return false;
    if (isSubscriptionExpired.value) return false;
    if (tier.value === 'demo') return true;
    const requiredTier = FEATURE_TIERS[feature];
    if (!requiredTier) return true;
    return (TIER_LEVELS[tier.value] ?? 0) >= (TIER_LEVELS[requiredTier] ?? 0);
  }

  const productLimit = computed(() => {
    if (tier.value === 'demo') return 25;
    return Infinity;
  });

  const userLimit = computed(() => {
    if (tier.value === 'demo') return 1;
    if (tier.value === 'pro') return 5;
    return Infinity;
  });

  return {
    tier,
    isDemoTier,
    isProTier,
    isBusinessTier,
    isDemoExpired,
    isSubscriptionExpired,
    daysLeft,
    canAccess,
    productLimit,
    userLimit,
  };
};
