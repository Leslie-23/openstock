<script setup lang="ts">
const { daysLeft } = useSubscription();
const { subscription, currentTier, isProcessing, verifyPayment } = useSubscriptionCheckout();
const route = useRoute();

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

    <SubscriptionPlanGrid />

    <!-- Payment info -->
    <div class="rounded-xl border border-gray-100 bg-gray-50 px-6 py-4 text-center">
      <p class="text-xs text-gray-500">
        Payments processed securely by Paystack. All amounts in GHS. Subscriptions renew monthly.
      </p>
    </div>
  </div>
</template>
