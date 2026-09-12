<script setup lang="ts">
const {
  isAdmin,
  currentTier,
  isProcessing,
  tiers,
  handlePaystackCheckout,
  startTrial,
} = useSubscriptionCheckout();

const { trialNotStarted, isDemoExpired, isSubscriptionExpired } = useSubscription();
</script>

<template>
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
</template>
