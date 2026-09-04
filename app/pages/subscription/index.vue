<script setup lang="ts">
const { isAdmin, user } = useAuth();
const toast = useToast();
const { settings, refresh: refreshSettings } = useSettings();
const { trialNotStarted, isDemoExpired, isSubscriptionExpired, daysLeft, tier } = useSubscription();
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
    navigateTo('/');
  } catch (e: any) {
    toast.error('Could not start trial', e.data?.message || 'Please try again');
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

    <!-- Welcome / Choose a Plan Banner -->
    <div v-if="trialNotStarted" class="rounded-xl border border-primary-200 bg-primary-50 px-6 py-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
          <Icon name="lucide:rocket" class="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <p class="text-sm font-medium text-primary-900">Welcome!</p>
          <p class="text-sm text-primary-700">Choose a plan to get started — start a free 14-day trial or subscribe directly.</p>
        </div>
      </div>
    </div>

    <!-- Demo Expired Banner -->
    <div v-else-if="isDemoExpired" class="rounded-xl border border-red-200 bg-red-50 px-6 py-4">
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
    <div class="grid grid-cols-3 gap-2 sm:gap-6">
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
        <div v-if="t.popular" class="bg-primary-600 px-1 py-1 text-center text-[8px] sm:px-4 sm:py-1.5 sm:text-xs font-semibold text-white uppercase tracking-wider">
          <span class="sm:hidden">Popular</span>
          <span class="hidden sm:inline">Most Popular</span>
        </div>

        <div class="p-2 sm:p-6 flex-1 flex flex-col">
          <!-- Header -->
          <div class="mb-2 sm:mb-6">
            <h3 class="text-xs sm:text-lg font-bold text-gray-900">{{ t.name }}</h3>
            <p class="mt-1 hidden text-sm text-gray-500 sm:block">{{ t.description }}</p>
            <div class="mt-1 sm:mt-4">
              <span class="text-sm sm:text-3xl font-bold text-gray-900">{{ t.price }}</span>
              <span class="block text-[9px] text-gray-500 sm:ml-1 sm:inline sm:text-sm">{{ t.period }}</span>
            </div>
          </div>

          <!-- Features -->
          <div class="flex-1 space-y-1 sm:space-y-3 mb-2 sm:mb-6">
            <div v-for="feature in t.features" :key="feature" class="flex items-start gap-1 sm:gap-2">
              <Icon name="lucide:check" class="h-2.5 w-2.5 sm:h-4 sm:w-4 text-green-500 mt-0.5 shrink-0" />
              <span class="text-[9px] leading-tight sm:text-sm sm:leading-normal text-gray-700">{{ feature }}</span>
            </div>
            <div v-for="feature in t.notIncluded" :key="feature" class="hidden items-start gap-2 sm:flex">
              <Icon name="lucide:x" class="h-4 w-4 text-gray-300 mt-0.5 shrink-0" />
              <span class="text-sm text-gray-400">{{ feature }}</span>
            </div>
          </div>

          <!-- Action -->
          <div>
            <!-- Current plan button -->
            <button
              v-if="t.id === currentTier && !trialNotStarted && !isDemoExpired && !isSubscriptionExpired"
              disabled
              class="w-full rounded-lg border border-gray-200 bg-gray-50 px-1 py-1.5 text-[9px] sm:px-4 sm:py-2.5 sm:text-sm font-medium text-gray-400 cursor-not-allowed"
            >
              Current Plan
            </button>

            <!-- Demo card: start the trial, or explain it's trial-only once a plan is active -->
            <template v-else-if="t.id === 'demo'">
              <button
                v-if="trialNotStarted && isAdmin"
                :disabled="isProcessing"
                class="w-full rounded-lg bg-gray-100 px-1 py-1.5 text-[9px] leading-tight sm:px-4 sm:py-2.5 sm:text-sm font-medium text-gray-900 hover:bg-gray-200/80 disabled:opacity-50"
                @click="startTrial"
              >
                Start Free Trial
              </button>
              <p v-else-if="trialNotStarted" class="text-center text-[9px] leading-tight sm:text-sm text-gray-400">
                Ask an admin to activate a plan
              </p>
              <p v-else class="text-center text-[9px] sm:text-xs text-gray-400">Trial only</p>
            </template>

            <!-- Paystack checkout for pro/business -->
            <template v-else>
              <button
                v-if="isAdmin"
                :disabled="isProcessing"
                class="w-full rounded-lg px-1 py-1.5 text-[9px] leading-tight sm:px-4 sm:py-2.5 sm:text-sm font-medium disabled:opacity-50"
                :class="t.popular ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm' : 'bg-gray-100 text-gray-900 hover:bg-gray-200/80'"
                @click="handlePaystackCheckout(t.id as 'pro' | 'business')"
              >
                <template v-if="t.id === currentTier && isSubscriptionExpired">
                  <span class="sm:hidden">Renew</span>
                  <span class="hidden sm:inline">Renew {{ t.name }}</span>
                </template>
                <template v-else-if="currentTier === 'demo' || isDemoExpired || isSubscriptionExpired">
                  <span class="sm:hidden">Subscribe</span>
                  <span class="hidden sm:inline">Subscribe to {{ t.name }}</span>
                </template>
                <template v-else>
                  <span class="sm:hidden">{{ tiers.findIndex(x => x.id === t.id) > tiers.findIndex(x => x.id === currentTier) ? 'Upgrade' : 'Switch' }}</span>
                  <span class="hidden sm:inline">{{ tiers.findIndex(x => x.id === t.id) > tiers.findIndex(x => x.id === currentTier) ? 'Upgrade' : 'Switch' }} to {{ t.name }}</span>
                </template>
              </button>
              <p v-else class="text-center text-[9px] leading-tight sm:text-sm text-gray-400">
                <span class="sm:hidden">Contact admin</span>
                <span class="hidden sm:inline">Contact an admin to change plans</span>
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
