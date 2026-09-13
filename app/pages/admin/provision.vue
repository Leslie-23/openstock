<script setup lang="ts">
definePageMeta({ layout: 'admin' });

const toast = useToast();
const { authHeaders, lock } = useAdminConsole();

const form = reactive({
  customerSlug: '',
  businessName: '',
  currency: 'GHC',
  trialDays: 14,
});

const isSubmitting = ref(false);
const result = ref<{ projectName: string; expectedUrl: string; actionsUrl: string } | null>(null);

const slugValid = computed(() => /^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$/.test(form.customerSlug));

async function submit() {
  if (!slugValid.value) {
    toast.error('Invalid slug', 'Lowercase letters, digits, and hyphens only.');
    return;
  }
  if (!form.businessName.trim()) {
    toast.error('Business name required');
    return;
  }

  isSubmitting.value = true;
  result.value = null;
  try {
    const res = await $fetch('/api/admin/provision', {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    });
    result.value = res;
    toast.success('Provisioning started', `Workflow dispatched for ${form.customerSlug}`);
  } catch (e: any) {
    if (e.statusCode === 403) {
      toast.error('Invalid provisioning key', 'Locking the console — re-enter it.');
      lock();
    } else {
      toast.error('Failed to start provisioning', e.data?.message || 'Please try again');
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <div>
      <h1 class="text-xl font-semibold tracking-tight text-white">Provision New Customer</h1>
      <p class="mt-1 text-sm text-gray-400">
        Creates a fully isolated deployment (own D1 database, KV namespace, Cloudflare Pages project) for a new customer via a GitHub Actions workflow.
      </p>
    </div>

    <AdminKeyGate>
      <form class="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1">Customer slug</label>
          <input
            v-model="form.customerSlug"
            placeholder="acme"
            class="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <p class="mt-1 text-xs text-gray-500">
            Becomes <span class="font-mono">{{ form.customerSlug || 'acme' }}.pages.dev</span>,
            <span class="font-mono">{{ form.customerSlug || 'acme' }}-db</span>,
            <span class="font-mono">{{ form.customerSlug || 'acme' }}_kv</span>
          </p>
          <p v-if="form.customerSlug && !slugValid" class="mt-1 text-xs text-red-400">
            Lowercase letters, digits, and hyphens only (2-50 chars).
          </p>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1">Business name</label>
          <input
            v-model="form.businessName"
            placeholder="Acme Corp"
            class="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1">Currency</label>
            <select
              v-model="form.currency"
              class="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="GHC">GHS (₵)</option>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1">Trial days</label>
            <input
              v-model.number="form.trialDays"
              type="number"
              class="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Icon v-if="isSubmitting" name="lucide:loader-2" class="mr-2 inline h-4 w-4 animate-spin" />
          Deploy new customer
        </button>
      </form>

      <div v-if="result" class="mt-6 rounded-xl border border-green-800 bg-green-950/50 p-6 space-y-2">
        <p class="text-sm font-medium text-green-300">Workflow dispatched for "{{ result.projectName }}"</p>
        <p class="text-sm text-green-400">
          Provisioning takes a few minutes. Track progress on
          <a :href="result.actionsUrl" target="_blank" rel="noopener noreferrer" class="underline">GitHub Actions</a>,
          or check it on the
          <NuxtLink to="/admin/customers" class="underline">Customers</NuxtLink> page once it's live.
        </p>
      </div>
    </AdminKeyGate>
  </div>
</template>
