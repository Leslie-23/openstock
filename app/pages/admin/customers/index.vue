<script setup lang="ts">
definePageMeta({ layout: 'admin' });

const toast = useToast();
const { keyUnlocked, authHeaders, lock } = useAdminConsole();

const customers = ref<any[]>([]);
const isLoading = ref(false);

async function load() {
  if (!keyUnlocked.value) return;
  isLoading.value = true;
  try {
    customers.value = await $fetch('/api/admin/customers', { headers: authHeaders() });
  } catch (e: any) {
    if (e.statusCode === 403) {
      toast.error('Invalid provisioning key', 'Locking the console — re-enter it.');
      lock();
    } else {
      toast.error('Failed to load customers', e.data?.message || 'Please try again');
    }
  } finally {
    isLoading.value = false;
  }
}

watch(keyUnlocked, (v) => { if (v) load(); }, { immediate: true });

function fmtDate(d: string | null) {
  if (!d) return '—';
  return d;
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-white">Customers</h1>
        <p class="mt-1 text-sm text-gray-400">Every deployment provisioned through this console.</p>
      </div>
      <button
        v-if="keyUnlocked"
        class="rounded-md border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800"
        :disabled="isLoading"
        @click="load"
      >
        <Icon name="lucide:refresh-cw" class="mr-1.5 inline h-3.5 w-3.5" :class="{ 'animate-spin': isLoading }" />
        Refresh
      </button>
    </div>

    <AdminKeyGate>
      <div v-if="isLoading && !customers.length" class="py-16 text-center text-sm text-gray-500">
        Loading customers...
      </div>

      <div v-else-if="!customers.length" class="rounded-xl border border-dashed border-gray-800 py-16 text-center">
        <Icon name="lucide:building-2" class="mx-auto h-8 w-8 text-gray-700" />
        <p class="mt-3 text-sm text-gray-500">No customers provisioned yet.</p>
        <NuxtLink to="/admin/provision" class="mt-2 inline-block text-sm text-primary-400 hover:underline">
          Provision the first one
        </NuxtLink>
      </div>

      <div v-else class="space-y-3">
        <NuxtLink
          v-for="c in customers"
          :key="c.id"
          :to="`/admin/customers/${c.slug}`"
          class="block rounded-xl border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-gray-700"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <p class="font-medium text-white">{{ c.businessName }}</p>
                <span class="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-mono text-gray-400">{{ c.slug }}</span>
              </div>
              <a :href="c.url" target="_blank" rel="noopener noreferrer" class="text-xs text-gray-500 hover:underline" @click.stop>
                {{ c.url }}
              </a>
            </div>

            <div v-if="c.live" class="flex flex-wrap items-center gap-4 text-xs text-gray-400">
              <span class="rounded-full bg-primary-950 px-2 py-1 font-medium text-primary-400 capitalize">
                {{ c.live.subscriptionTier }}
              </span>
              <span>Trial ends: {{ fmtDate(c.live.trialEndsAt) }}</span>
              <span>{{ c.live.userCount }} users</span>
              <span>{{ c.live.productCount }} products</span>
            </div>
            <div v-else class="text-xs text-amber-400">
              {{ c.liveError || 'Not reachable yet' }}
            </div>
          </div>
        </NuxtLink>
      </div>
    </AdminKeyGate>
  </div>
</template>
