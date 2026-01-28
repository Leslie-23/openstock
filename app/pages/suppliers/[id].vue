<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const toast = useToast();
const { currencySymbol } = useSettings();

const supplierId = route.params.id as string;

const { data: supplier, pending, refresh, error } = await useFetch(`/api/suppliers/${supplierId}`);
const { data: products } = await useFetch('/api/products');

// Products supplied by this supplier
const suppliedProducts = computed(() => {
  if (!products.value) return [];
  return products.value.filter(p => p.supplierId === supplierId);
});

const isEditing = ref(false);
const isSubmitting = ref(false);

const form = reactive({
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postalCode: '',
  country: '',
  notes: '',
});

function startEditing() {
  if (supplier.value) {
    Object.assign(form, {
      name: supplier.value.name || '',
      email: supplier.value.email || '',
      phone: supplier.value.phone || '',
      address: supplier.value.address || '',
      city: supplier.value.city || '',
      postalCode: supplier.value.postalCode || '',
      country: supplier.value.country || '',
      notes: supplier.value.notes || '',
    });
    isEditing.value = true;
  }
}

async function saveChanges() {
  if (!form.name.trim()) {
    toast.error('Supplier name is required');
    return;
  }
  isSubmitting.value = true;
  try {
    await $fetch(`/api/suppliers/${supplierId}`, {
      method: 'PUT',
      body: form,
    });
    toast.success('Supplier updated');
    isEditing.value = false;
    refresh();
  } catch (e: any) {
    toast.error('Error', e.data?.message || 'Failed to update supplier.');
  } finally {
    isSubmitting.value = false;
  }
}

async function deleteSupplier() {
  if (!confirm(`Delete "${supplier.value?.name}"? This cannot be undone.`)) return;
  try {
    await $fetch(`/api/suppliers/${supplierId}`, { method: 'DELETE' });
    toast.success('Supplier deleted');
    router.push('/suppliers');
  } catch (e: any) {
    toast.error('Error', 'Failed to delete supplier.');
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <UiButton variant="ghost" size="icon" @click="router.back()">
          <Icon name="lucide:arrow-left" class="h-5 w-5" />
        </UiButton>
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-gray-900">{{ supplier?.name }}</h1>
          <p class="text-sm text-gray-500 flex items-center gap-2">
            <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', supplier?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">
              {{ supplier?.isActive ? 'Active' : 'Inactive' }}
            </span>
            <span v-if="supplier?.city || supplier?.country" class="text-gray-400">
              {{ [supplier?.city, supplier?.country].filter(Boolean).join(', ') }}
            </span>
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <UiButton variant="outline" @click="startEditing">
          <Icon name="lucide:pencil" class="h-4 w-4 mr-2" />
          Edit
        </UiButton>
        <UiButton variant="outline" @click="deleteSupplier" class="text-red-600 hover:bg-red-50">
          <Icon name="lucide:trash-2" class="h-4 w-4 mr-2" />
          Delete
        </UiButton>
      </div>
    </div>

    <div v-if="pending" class="flex justify-center py-12">
      <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-gray-400" />
    </div>

    <div v-else-if="error" class="text-center py-12 text-red-600">
      <p>Supplier not found.</p>
      <UiButton variant="outline" class="mt-4" @click="router.push('/suppliers')">Back to Suppliers</UiButton>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Contact Info -->
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Contact Information</h2>
          <div class="grid grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-500">Email</label>
              <p class="mt-1 text-sm text-gray-900">
                <a v-if="supplier?.email" :href="`mailto:${supplier.email}`" class="text-primary-600 hover:underline">{{ supplier.email }}</a>
                <span v-else class="text-gray-400">Not provided</span>
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-500">Phone</label>
              <p class="mt-1 text-sm text-gray-900">
                <a v-if="supplier?.phone" :href="`tel:${supplier.phone}`" class="text-primary-600 hover:underline">{{ supplier.phone }}</a>
                <span v-else class="text-gray-400">Not provided</span>
              </p>
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-500">Address</label>
              <p class="mt-1 text-sm text-gray-900">
                <template v-if="supplier?.address || supplier?.city">
                  {{ [supplier?.address, supplier?.city, supplier?.postalCode, supplier?.country].filter(Boolean).join(', ') }}
                </template>
                <span v-else class="text-gray-400">Not provided</span>
              </p>
            </div>
            <div class="col-span-2" v-if="supplier?.notes">
              <label class="block text-sm font-medium text-gray-500">Notes</label>
              <p class="mt-1 text-sm text-gray-900">{{ supplier.notes }}</p>
            </div>
          </div>
        </div>

        <!-- Products from this supplier -->
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 class="text-lg font-medium text-gray-900">
              Products
              <span class="text-sm font-normal text-gray-500 ml-2">({{ suppliedProducts.length }})</span>
            </h2>
          </div>
          <div v-if="suppliedProducts.length === 0" class="p-8 text-center text-gray-500 text-sm">
            No products are directly assigned to this supplier.
          </div>
          <div v-else class="divide-y divide-gray-100">
            <NuxtLink
              v-for="p in suppliedProducts"
              :key="p.id"
              :to="`/products/${p.id}`"
              class="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50">
                  <Icon name="lucide:box" class="h-4 w-4 text-gray-400" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ p.name }}</p>
                  <p class="text-xs text-gray-500 font-mono">{{ p.sku || 'No SKU' }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium font-mono text-gray-900">{{ p.sellingPrice?.toFixed(2) }} {{ currencySymbol }}</p>
                <p class="text-xs text-gray-500">{{ p.stockQuantity }} in stock</p>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="space-y-6">
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Summary</h2>
          <div class="space-y-3">
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-sm text-gray-500">Products Supplied</span>
              <span class="font-medium">{{ suppliedProducts.length }}</span>
            </div>
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-sm text-gray-500">Status</span>
              <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', supplier?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">
                {{ supplier?.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="flex justify-between items-center py-2">
              <span class="text-sm text-gray-500">Location</span>
              <span class="text-sm font-medium text-gray-900">{{ supplier?.country || '—' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <UiModal v-model:open="isEditing" title="Edit Supplier" size="lg">
      <form id="edit-supplier-form" class="space-y-4" @submit.prevent="saveChanges">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Name <span class="text-red-500">*</span></label>
          <UiInput v-model="form.name" placeholder="Supplier name" />
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <UiInput v-model="form.email" type="email" placeholder="email@supplier.com" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <UiInput v-model="form.phone" placeholder="+1 234 567 890" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <UiInput v-model="form.address" placeholder="123 Main Street" />
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
            <UiInput v-model="form.city" placeholder="City" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
            <UiInput v-model="form.postalCode" placeholder="12345" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <UiInput v-model="form.country" placeholder="Country" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea v-model="form.notes" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm min-h-[60px] resize-none" placeholder="Additional notes..." />
        </div>
      </form>
      <template #footer>
        <UiButton variant="secondary" @click="isEditing = false">Cancel</UiButton>
        <UiButton type="submit" form="edit-supplier-form" :loading="isSubmitting">Save Changes</UiButton>
      </template>
    </UiModal>
  </div>
</template>
