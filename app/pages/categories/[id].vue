<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const toast = useToast();
const { currencySymbol } = useSettings();

const categoryId = route.params.id as string;

const { data: categories, refresh: refreshCategories } = await useFetch('/api/categories');
const { data: products } = await useFetch('/api/products');

const category = computed(() => categories.value?.find(c => c.id === categoryId));

// Products in this category
const categoryProducts = computed(() => {
  if (!products.value) return [];
  return products.value.filter(p => p.categoryId === categoryId);
});

const totalStock = computed(() => categoryProducts.value.reduce((sum, p) => sum + (p.stockQuantity || 0), 0));
const totalValue = computed(() => categoryProducts.value.reduce((sum, p) => sum + ((p.stockQuantity || 0) * (p.costPrice || 0)), 0));

const isEditing = ref(false);
const isSubmitting = ref(false);

const form = reactive({
  name: '',
  description: '',
  color: '#6B7280',
});

function startEditing() {
  if (category.value) {
    form.name = category.value.name || '';
    form.description = category.value.description || '';
    form.color = category.value.color || '#6B7280';
    isEditing.value = true;
  }
}

async function saveChanges() {
  if (!form.name.trim()) {
    toast.error('Category name is required');
    return;
  }
  isSubmitting.value = true;
  try {
    await $fetch(`/api/categories/${categoryId}`, {
      method: 'PUT',
      body: form,
    });
    toast.success('Category updated');
    isEditing.value = false;
    refreshCategories();
  } catch (e: any) {
    toast.error('Error', e.data?.message || 'Failed to update category.');
  } finally {
    isSubmitting.value = false;
  }
}

async function deleteCategory() {
  if (!confirm(`Delete "${category.value?.name}"? Products in this category will become uncategorized.`)) return;
  try {
    await $fetch(`/api/categories/${categoryId}`, { method: 'DELETE' });
    toast.success('Category deleted');
    router.push('/categories');
  } catch (e: any) {
    toast.error('Error', 'Failed to delete category.');
  }
}

function formatCurrency(value: number): string {
  return value.toFixed(2);
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
          <div class="flex items-center gap-2">
            <span v-if="category?.color" class="h-3 w-3 rounded-full" :style="{ backgroundColor: category.color }" />
            <h1 class="text-2xl font-semibold tracking-tight text-gray-900">{{ category?.name }}</h1>
          </div>
          <p v-if="category?.description" class="text-sm text-gray-500">{{ category.description }}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <UiButton variant="outline" @click="startEditing">
          <Icon name="lucide:pencil" class="h-4 w-4 mr-2" />
          Edit
        </UiButton>
        <UiButton variant="outline" @click="deleteCategory" class="text-red-600 hover:bg-red-50">
          <Icon name="lucide:trash-2" class="h-4 w-4 mr-2" />
          Delete
        </UiButton>
      </div>
    </div>

    <div v-if="!category" class="text-center py-12 text-gray-500">
      <p>Category not found.</p>
      <UiButton variant="outline" class="mt-4" @click="router.push('/categories')">Back to Categories</UiButton>
    </div>

    <template v-else>
      <!-- Summary Cards -->
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="p-5 rounded-lg border border-gray-200 bg-white shadow-sm">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Products</p>
          <p class="mt-2 text-2xl font-bold text-gray-900 font-mono">{{ categoryProducts.length }}</p>
        </div>
        <div class="p-5 rounded-lg border border-gray-200 bg-white shadow-sm">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Stock</p>
          <p class="mt-2 text-2xl font-bold text-gray-900 font-mono">{{ totalStock }}</p>
        </div>
        <div class="p-5 rounded-lg border border-gray-200 bg-white shadow-sm">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Stock Value</p>
          <p class="mt-2 text-2xl font-bold text-gray-900 font-mono">{{ formatCurrency(totalValue) }} {{ currencySymbol }}</p>
        </div>
      </div>

      <!-- Products Table -->
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">Products in this Category</h2>
        </div>
        <div v-if="categoryProducts.length === 0" class="p-8 text-center text-gray-500">
          <div class="rounded-full bg-gray-100 p-3 inline-block mb-3">
            <Icon name="lucide:package-open" class="h-5 w-5 text-gray-400" />
          </div>
          <p class="text-sm">No products in this category yet.</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">SKU</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Stock</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Price</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="p in categoryProducts" :key="p.id" class="hover:bg-gray-50">
                <td class="px-4 py-3">
                  <NuxtLink :to="`/products/${p.id}`" class="text-sm font-medium text-gray-900 hover:text-primary-600">{{ p.name }}</NuxtLink>
                </td>
                <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ p.sku || '—' }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm" :class="(p.stockQuantity || 0) <= 0 ? 'text-red-600 font-bold' : 'text-gray-900'">{{ p.stockQuantity || 0 }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm text-gray-900">{{ p.sellingPrice?.toFixed(2) }} {{ currencySymbol }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Edit Modal -->
    <UiModal v-model:open="isEditing" title="Edit Category">
      <form id="edit-category-form" class="space-y-4" @submit.prevent="saveChanges">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Name <span class="text-red-500">*</span></label>
          <UiInput v-model="form.name" placeholder="Category name" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea v-model="form.description" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm min-h-[60px] resize-none" placeholder="Optional description..." />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Color</label>
          <input v-model="form.color" type="color" class="h-9 w-16 rounded border border-gray-300 cursor-pointer" />
        </div>
      </form>
      <template #footer>
        <UiButton variant="secondary" @click="isEditing = false">Cancel</UiButton>
        <UiButton type="submit" form="edit-category-form" :loading="isSubmitting">Save Changes</UiButton>
      </template>
    </UiModal>
  </div>
</template>
