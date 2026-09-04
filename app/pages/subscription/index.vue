<script setup lang="ts">
const { isAdmin } = useAuth();
const toast = useToast();
const { settings, refresh: refreshSettings } = useSettings();

const { data: subscription, refresh } = await useFetch('/api/subscription');
const isUpdating = ref(false);

const currentTier = computed(() => subscription.value?.tier || 'free');

const tiers = [
  {
    id: 'free',
    name: 'Free',
    price: 'GHS 0',
    period: 'forever',
    description: 'Get started with basic inventory management',
    features: [
      'Up to 25 products',
      'Dashboard & stock overview',
      'Basic stock movements',
      'Categories & suppliers',
      '1 user',
    ],
    notIncluded: [
      'Finance module',
      'HR & Payroll',
      'Invoicing',
      'Expense tracking',
      'Accounting & reports',
    ],
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
      'Everything in Free',
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

async function changeTier(tierId: string) {
  if (!isAdmin.value) {
    toast.error('Permission denied', 'Only admins can change the subscription');
    return;
  }
  isUpdating.value = true;
  try {
    await $fetch('/api/subscription', { method: 'POST', body: { tier: tierId } });
    await refresh();
    await refreshSettings();
    toast.success('Plan updated', `Switched to ${tierId.charAt(0).toUpperCase() + tierId.slice(1)} plan`);
  } catch (e: any) {
    toast.error('Failed to update plan', e.data?.message || 'Please try again');
  } finally {
    isUpdating.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Subscription</h1>
      <p class="mt-1 text-sm text-gray-500">Choose the plan that fits your business needs</p>
    </div>

    <!-- Current Plan Banner -->
    <div class="rounded-xl border border-primary-200 bg-primary-50 px-6 py-4">
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
        <div v-if="subscription?.startDate" class="text-right text-sm text-primary-600">
          <p>Active since {{ subscription.startDate }}</p>
        </div>
      </div>
    </div>

    <!-- Tier Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div
        v-for="tier in tiers"
        :key="tier.id"
        class="relative rounded-xl border bg-white overflow-hidden flex flex-col"
        :class="[
          tier.id === currentTier ? 'border-primary-400 ring-2 ring-primary-100' : 'border-gray-200',
          tier.popular ? 'shadow-lg' : 'shadow-sm',
        ]"
      >
        <!-- Popular badge -->
        <div v-if="tier.popular" class="bg-primary-600 px-4 py-1.5 text-center text-xs font-semibold text-white uppercase tracking-wider">
          Most Popular
        </div>

        <div class="p-6 flex-1 flex flex-col">
          <!-- Header -->
          <div class="mb-6">
            <h3 class="text-lg font-bold text-gray-900">{{ tier.name }}</h3>
            <p class="mt-1 text-sm text-gray-500">{{ tier.description }}</p>
            <div class="mt-4">
              <span class="text-3xl font-bold text-gray-900">{{ tier.price }}</span>
              <span v-if="tier.period !== 'forever'" class="text-sm text-gray-500">{{ tier.period }}</span>
              <span v-else class="text-sm text-gray-500 ml-1">{{ tier.period }}</span>
            </div>
          </div>

          <!-- Features -->
          <div class="flex-1 space-y-3 mb-6">
            <div v-for="feature in tier.features" :key="feature" class="flex items-start gap-2">
              <Icon name="lucide:check" class="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span class="text-sm text-gray-700">{{ feature }}</span>
            </div>
            <div v-for="feature in tier.notIncluded" :key="feature" class="flex items-start gap-2">
              <Icon name="lucide:x" class="h-4 w-4 text-gray-300 mt-0.5 shrink-0" />
              <span class="text-sm text-gray-400">{{ feature }}</span>
            </div>
          </div>

          <!-- Action -->
          <div>
            <button
              v-if="tier.id === currentTier"
              disabled
              class="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
              Current Plan
            </button>
            <UiButton
              v-else-if="isAdmin"
              :variant="tier.popular ? 'primary' : 'secondary'"
              block
              :loading="isUpdating"
              @click="changeTier(tier.id)"
            >
              {{ tiers.findIndex(t => t.id === tier.id) > tiers.findIndex(t => t.id === currentTier) ? 'Upgrade' : 'Downgrade' }}
              to {{ tier.name }}
            </UiButton>
            <p v-else class="text-center text-sm text-gray-400">
              Contact an admin to change plans
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
