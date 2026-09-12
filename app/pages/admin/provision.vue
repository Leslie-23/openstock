<script setup lang="ts">
const toast = useToast();

const provisionKey = ref('');
const keyUnlocked = ref(false);

onMounted(() => {
  const stored = sessionStorage.getItem('provision-key');
  if (stored) {
    provisionKey.value = stored;
    keyUnlocked.value = true;
  }
});

function unlock() {
  if (!provisionKey.value.trim()) return;
  sessionStorage.setItem('provision-key', provisionKey.value.trim());
  keyUnlocked.value = true;
}

function lock() {
  sessionStorage.removeItem('provision-key');
  provisionKey.value = '';
  keyUnlocked.value = false;
}

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
      headers: { 'x-provision-key': provisionKey.value },
      body: form,
    });
    result.value = res;
    toast.success('Provisioning started', `Workflow dispatched for ${form.customerSlug}`);
  } catch (e: any) {
    if (e.statusCode === 403) {
      toast.error('Invalid provisioning key', 'Locking the portal — re-enter it.');
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
      <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Provision New Customer</h1>
      <p class="mt-1 text-sm text-gray-500">
        Creates a fully isolated deployment (own D1 database, KV namespace, Cloudflare Pages project) for a new customer via a GitHub Actions workflow.
      </p>
    </div>

    <!-- Key gate -->
    <div v-if="!keyUnlocked" class="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
      <label class="block text-sm font-medium text-gray-700">Provisioning key</label>
      <UiInput v-model="provisionKey" type="password" placeholder="Enter the provisioning key" @keyup.enter="unlock" />
      <UiButton :disabled="!provisionKey.trim()" @click="unlock">Unlock</UiButton>
    </div>

    <template v-else>
      <div class="flex justify-end">
        <button class="text-xs text-gray-400 hover:text-gray-600" @click="lock">Lock portal</button>
      </div>

      <form class="rounded-xl border border-gray-200 bg-white p-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Customer slug</label>
          <UiInput v-model="form.customerSlug" placeholder="acme" />
          <p class="mt-1 text-xs text-gray-400">
            Becomes <span class="font-mono">{{ form.customerSlug || 'acme' }}.pages.dev</span>,
            <span class="font-mono">{{ form.customerSlug || 'acme' }}-db</span>,
            <span class="font-mono">{{ form.customerSlug || 'acme' }}_kv</span>
          </p>
          <p v-if="form.customerSlug && !slugValid" class="mt-1 text-xs text-red-500">
            Lowercase letters, digits, and hyphens only (2-50 chars).
          </p>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Business name</label>
          <UiInput v-model="form.businessName" placeholder="Acme Corp" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Currency</label>
            <select v-model="form.currency" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="GHC">GHS (₵)</option>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Trial days</label>
            <UiInput v-model.number="form.trialDays" type="number" />
          </div>
        </div>

        <UiButton type="submit" :loading="isSubmitting" block>
          Deploy new customer
        </UiButton>
      </form>

      <div v-if="result" class="rounded-xl border border-green-200 bg-green-50 p-6 space-y-2">
        <p class="text-sm font-medium text-green-900">Workflow dispatched for "{{ result.projectName }}"</p>
        <p class="text-sm text-green-700">
          Provisioning takes a few minutes. Track progress on
          <a :href="result.actionsUrl" target="_blank" rel="noopener noreferrer" class="underline">GitHub Actions</a>.
          Once it finishes, the app will be live at
          <a :href="result.expectedUrl" target="_blank" rel="noopener noreferrer" class="underline">{{ result.expectedUrl }}</a>.
        </p>
      </div>
    </template>
  </div>
</template>
