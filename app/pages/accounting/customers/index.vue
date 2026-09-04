<script setup lang="ts">
const toast = useToast();
const { data: customers, refresh } = await useFetch('/api/accounting/customers');

const showModal = ref(false);
const editingCustomer = ref<any>(null);
const form = reactive({
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: 'Ghana',
  taxId: '',
  notes: '',
});

function openNew() {
  editingCustomer.value = null;
  Object.assign(form, { name: '', email: '', phone: '', address: '', city: '', country: 'Ghana', taxId: '', notes: '' });
  showModal.value = true;
}

function openEdit(cust: any) {
  editingCustomer.value = cust;
  Object.assign(form, {
    name: cust.name || '',
    email: cust.email || '',
    phone: cust.phone || '',
    address: cust.address || '',
    city: cust.city || '',
    country: cust.country || 'Ghana',
    taxId: cust.taxId || '',
    notes: cust.notes || '',
  });
  showModal.value = true;
}

const submitting = ref(false);

async function save() {
  if (!form.name) {
    toast.add({ title: 'Name is required', color: 'red' });
    return;
  }
  submitting.value = true;
  try {
    if (editingCustomer.value) {
      await $fetch(`/api/accounting/customers/${editingCustomer.value.id}`, { method: 'PUT', body: form });
      toast.add({ title: 'Customer updated', color: 'green' });
    } else {
      await $fetch('/api/accounting/customers', { method: 'POST', body: form });
      toast.add({ title: 'Customer created', color: 'green' });
    }
    showModal.value = false;
    await refresh();
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Failed to save', color: 'red' });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between border-b border-gray-200 pb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Customers</h1>
        <p class="mt-1 text-sm text-gray-500">Manage your customer directory</p>
      </div>
      <UiButton @click="openNew">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        Add Customer
      </UiButton>
    </div>

    <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div class="divide-y divide-gray-100">
        <div
          v-for="cust in (customers as any[])"
          :key="cust.id"
          class="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
        >
          <NuxtLink :to="`/accounting/customers/${cust.id}`" class="flex items-center gap-4 flex-1">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600 font-bold text-sm">
              {{ cust.name?.charAt(0)?.toUpperCase() }}
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">{{ cust.name }}</p>
              <p class="text-xs text-gray-500">
                <span v-if="cust.email">{{ cust.email }}</span>
                <span v-if="cust.email && cust.phone"> &middot; </span>
                <span v-if="cust.phone">{{ cust.phone }}</span>
              </p>
              <p v-if="cust.city" class="text-xs text-gray-400">{{ cust.city }}<span v-if="cust.country">, {{ cust.country }}</span></p>
            </div>
          </NuxtLink>
          <button @click="openEdit(cust)" class="text-gray-400 hover:text-gray-600 p-2">
            <Icon name="lucide:pencil" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div v-if="!customers || (customers as any[]).length === 0" class="px-6 py-12 text-center">
        <UiEmptyState title="No customers yet" description="Add your first customer to start invoicing">
          <template #action>
            <UiButton @click="openNew"><Icon name="lucide:plus" class="mr-2 h-4 w-4" />Add Customer</UiButton>
          </template>
        </UiEmptyState>
      </div>
    </div>

    <!-- Modal -->
    <UiModal v-model="showModal" :title="editingCustomer ? 'Edit Customer' : 'New Customer'">
      <form @submit.prevent="save" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input type="text" v-model="form.name" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" v-model="form.email" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="text" v-model="form.phone" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input type="text" v-model="form.address" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input type="text" v-model="form.city" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <input type="text" v-model="form.country" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tax ID / TIN</label>
          <input type="text" v-model="form.taxId" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea v-model="form.notes" rows="2" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"></textarea>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <UiButton variant="outline" type="button" @click="showModal = false">Cancel</UiButton>
          <UiButton type="submit" :disabled="submitting">{{ submitting ? 'Saving...' : 'Save' }}</UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>
