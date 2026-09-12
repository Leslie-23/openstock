<script setup lang="ts">
const { trialNotStarted, isDemoExpired, isSubscriptionExpired } = useSubscription();

const shouldShow = computed(() => trialNotStarted.value || isDemoExpired.value || isSubscriptionExpired.value);

const note = computed(() => {
  if (isDemoExpired.value) {
    return {
      icon: 'lucide:alert-triangle',
      tone: 'red',
      title: 'Your demo has expired',
      body: 'Select a plan to continue using the app.',
    };
  }
  if (isSubscriptionExpired.value) {
    return {
      icon: 'lucide:clock',
      tone: 'amber',
      title: 'Your subscription has expired',
      body: 'Renew a plan to continue using the app.',
    };
  }
  return {
    icon: 'lucide:rocket',
    tone: 'primary',
    title: 'Select a plan to continue',
    body: 'Start a free 14-day trial or subscribe directly — you need a plan before using Inventra.',
  };
});
</script>

<template>
  <div
    v-if="shouldShow"
    class="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-gray-950/60 backdrop-blur-sm p-3 py-8 sm:p-6"
  >
    <div class="w-full max-w-4xl rounded-2xl bg-white p-4 shadow-2xl sm:p-8">
      <!-- Note -->
      <div
        class="mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 sm:mb-6 sm:px-6 sm:py-4"
        :class="{
          'border-primary-200 bg-primary-50': note.tone === 'primary',
          'border-red-200 bg-red-50': note.tone === 'red',
          'border-amber-200 bg-amber-50': note.tone === 'amber',
        }"
      >
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10"
          :class="{
            'bg-primary-100': note.tone === 'primary',
            'bg-red-100': note.tone === 'red',
            'bg-amber-100': note.tone === 'amber',
          }"
        >
          <Icon
            :name="note.icon"
            class="h-4 w-4 sm:h-5 sm:w-5"
            :class="{
              'text-primary-600': note.tone === 'primary',
              'text-red-600': note.tone === 'red',
              'text-amber-600': note.tone === 'amber',
            }"
          />
        </div>
        <div class="min-w-0">
          <p
            class="text-sm font-medium sm:text-base"
            :class="{
              'text-primary-900': note.tone === 'primary',
              'text-red-900': note.tone === 'red',
              'text-amber-900': note.tone === 'amber',
            }"
          >
            {{ note.title }}
          </p>
          <p
            class="text-xs sm:text-sm"
            :class="{
              'text-primary-700': note.tone === 'primary',
              'text-red-700': note.tone === 'red',
              'text-amber-700': note.tone === 'amber',
            }"
          >
            {{ note.body }}
          </p>
        </div>
      </div>

      <SubscriptionPlanGrid />

      <p class="mt-4 text-center text-[10px] text-gray-400 sm:mt-6 sm:text-xs">
        Payments processed securely by Paystack. All amounts in GHS. Subscriptions renew monthly.
      </p>
    </div>
  </div>
</template>
