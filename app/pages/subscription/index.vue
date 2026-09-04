<script setup lang="ts">
const { isAdmin } = useAuth();
const toast = useToast();
const { settings, refresh: refreshSettings } = useSettings();
const { isDemoExpired, isSubscriptionExpired, daysLeft, tier } = useSubscription();
const runtimeConfig = useRuntimeConfig();
const route = useRoute();

const { data: subscription, refresh } = await useFetch('/api/subscription');
const isProcessing = ref(false);

const currentTier = computed(() => subscription.value?.tier || 'demo');

const tiers = [
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
      'Finance, HR & Payroll',
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
      'Finance (Forex, Crypto, Cross-Border)',
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

async function handlePaystackCheckout(planId: 'pro' | 'business') {
  if (!isAdmin.value) {
    toast.error('Permission denied', 'Only admins can manage subscriptions');
    return;
  }

  isProcessing.value = true;
  try {
    const callbackUrl = `${window.location.origin}/subscription?verify=true`;
    const email = settings.value?.businessEmail || settings.value?.email || '';

    const result = await $fetch('/api/subscription/initialize', {
      method: 'POST',
      body: {
        plan: planId,
        email,
        callbackUrl,
      },
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

async function verifyPayment(reference: string) {
  isProcessing.value = true;
  try {
    const result = await $fetch('/api/subscription/verify', {
      params: { reference },
    });

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

onMounted(async () => {
  const query = route.query;
  if (query.verify === 'true' && query.reference) {
    await verifyPayment(query.reference as string);
    navigateTo('/subscription', { replace: true });
  }
});
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Subscription</h1>
      <p class="mt-1 text-sm text-gray-500">Choose the plan that fits your business needs</p>
    </div>

    <!-- Demo Expired Banner -->
    <div v-if="isDemoExpired" class="rounded-xl border border-red-200 bg-red-50 px-6 py-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
          <Icon name="lucide:alert-triangle" class="h-5 w-5 text-red-600" />
        </div>
        <div>
          <p class="text-sm font-medium text-red-900">Demo Expired</p>
          <p class="text-sm text-red-700">Your 14-day trial has ended. Subscribe to continue using the app.</p>
        </div>
      </div>
    </div>

    <!-- Subscription Expired Banner -->
    <div v-else-if="isSubscriptionExpired" class="rounded-xl border border-amber-200 bg-amber-50 px-6 py-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
          <Icon name="lucide:clock" class="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p class="text-sm font-medium text-amber-900">Subscription Expired</p>
          <p class="text-sm text-amber-700">Please renew your subscription to regain access.</p>
        </div>
      </div>
    </div>

    <!-- Current Plan Banner -->
    <div v-else class="rounded-xl border border-primary-200 bg-primary-50 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
            <Icon name="lucide:crown" class="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-primary-900">Current Plan</p>
            <p class="text-lg font-bold text-primary-700">{{ currentTier.charAt(0).toUpperCase() + currentTier.slice(1) }}</p>
          </div>
        </div>
        <div class="text-right text-sm">
          <template v-if="currentTier === 'demo' && daysLeft !== null">
            <p class="font-medium" :class="daysLeft <= 3 ? 'text-red-600' : 'text-primary-600'">
              {{ daysLeft }} {{ daysLeft === 1 ? 'day' : 'days' }} left in trial
            </p>
          </template>
          <template v-else-if="subscription?.endDate">
            <p class="text-primary-600">Renews {{ subscription.endDate }}</p>
          </template>
          <template v-else-if="subscription?.startDate">
            <p class="text-primary-600">Active since {{ subscription.startDate }}</p>
          </template>
        </div>
      </div>
    </div>

    <!-- Processing overlay -->
    <div v-if="isProcessing" class="rounded-xl border border-gray-200 bg-white px-6 py-8 text-center">
      <div class="inline-flex items-center gap-3">
        <Icon name="lucide:loader-2" class="h-5 w-5 animate-spin text-primary-600" />
        <span class="text-sm font-medium text-gray-700">Processing payment...</span>
      </div>
    </div>

    <!-- Tier Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div
        v-for="t in tiers"
        :key="t.id"
        class="relative rounded-xl border bg-white overflow-hidden flex flex-col"
        :class="[
          t.id === currentTier ? 'border-primary-400 ring-2 ring-primary-100' : 'border-gray-200',
          t.popular ? 'shadow-lg' : 'shadow-sm',
        ]"
      >
        <!-- Popular badge -->
        <div v-if="t.popular" class="bg-primary-600 px-4 py-1.5 text-center text-xs font-semibold text-white uppercase tracking-wider">
          Most Popular
        </div>

        <div class="p-6 flex-1 flex flex-col">
          <!-- Header -->
          <div class="mb-6">
            <h3 class="text-lg font-bold text-gray-900">{{ t.name }}</h3>
            <p class="mt-1 text-sm text-gray-500">{{ t.description }}</p>
            <div class="mt-4">
              <span class="text-3xl font-bold text-gray-900">{{ t.price }}</span>
              <span class="text-sm text-gray-500 ml-1">{{ t.period }}</span>
            </div>
          </div>

          <!-- Features -->
          <div class="flex-1 space-y-3 mb-6">
            <div v-for="feature in t.features" :key="feature" class="flex items-start gap-2">
              <Icon name="lucide:check" class="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span class="text-sm text-gray-700">{{ feature }}</span>
            </div>
            <div v-for="feature in t.notIncluded" :key="feature" class="flex items-start gap-2">
              <Icon name="lucide:x" class="h-4 w-4 text-gray-300 mt-0.5 shrink-0" />
              <span class="text-sm text-gray-400">{{ feature }}</span>
            </div>
          </div>

          <!-- Action -->
          <div>
            <!-- Current plan button -->
            <button
              v-if="t.id === currentTier && !isDemoExpired && !isSubscriptionExpired"
              disabled
              class="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
              Current Plan
            </button>

            <!-- Demo card: no action needed -->
            <template v-else-if="t.id === 'demo'">
              <p class="text-center text-xs text-gray-400">Trial period only</p>
            </template>

            <!-- Paystack checkout for pro/business -->
            <template v-else>
              <UiButton
                v-if="isAdmin"
                :variant="t.popular ? 'primary' : 'secondary'"
                block
                :loading="isProcessing"
                @click="handlePaystackCheckout(t.id as 'pro' | 'business')"
              >
                <template v-if="t.id === currentTier && isSubscriptionExpired">
                  Renew {{ t.name }}
                </template>
                <template v-else-if="currentTier === 'demo' || isDemoExpired || isSubscriptionExpired">
                  Subscribe to {{ t.name }}
                </template>
                <template v-else>
                  {{ tiers.findIndex(x => x.id === t.id) > tiers.findIndex(x => x.id === currentTier) ? 'Upgrade' : 'Switch' }}
                  to {{ t.name }}
                </template>
              </UiButton>
              <p v-else class="text-center text-sm text-gray-400">
                Contact an admin to change plans
              </p>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment info -->
    <div class="rounded-xl border border-gray-100 bg-gray-50 px-6 py-4 text-center">
      <p class="text-xs text-gray-500">
        Payments processed securely by Paystack. All amounts in GHS. Subscriptions renew monthly.
      </p>
    </div>
  </div>
</template>
