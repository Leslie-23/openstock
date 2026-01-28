<script setup lang="ts">
const { settings } = useSettings();
const { data: stats, pending: statsPending } = await useFetch('/api/dashboard/stats');
const { data: products, pending: productsPending } = await useFetch('/api/products');
const { data: movements, pending: movementsPending } = await useFetch('/api/movements');
const { data: suppliers } = await useFetch('/api/suppliers');
const { data: categories } = await useFetch('/api/categories');

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: settings.value?.currency || 'GHC',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Stock valuation by category
const stockByCategory = computed(() => {
  if (!products.value || !categories.value) return [];
  const map = new Map<string, { name: string; count: number; value: number; stock: number }>();

  for (const cat of categories.value) {
    map.set(cat.id, { name: cat.name, count: 0, value: 0, stock: 0 });
  }
  map.set('uncategorized', { name: 'Uncategorized', count: 0, value: 0, stock: 0 });

  for (const p of products.value) {
    const key = p.categoryId || 'uncategorized';
    const entry = map.get(key) || { name: 'Unknown', count: 0, value: 0, stock: 0 };
    entry.count++;
    entry.stock += p.stockQuantity || 0;
    entry.value += (p.stockQuantity || 0) * (p.costPrice || 0);
    map.set(key, entry);
  }

  return Array.from(map.values()).filter(e => e.count > 0).sort((a, b) => b.value - a.value);
});

// Top products by stock value
const topProducts = computed(() => {
  if (!products.value) return [];
  return [...products.value]
    .map(p => ({
      ...p,
      totalValue: (p.stockQuantity || 0) * (p.costPrice || 0),
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10);
});

// Low stock products
const lowStockProducts = computed(() => {
  if (!products.value) return [];
  return products.value.filter(p => {
    if (p.stockMin && p.stockQuantity !== null) {
      return p.stockQuantity <= p.stockMin;
    }
    return false;
  });
});

// Out of stock products
const outOfStockProducts = computed(() => {
  if (!products.value) return [];
  return products.value.filter(p => (p.stockQuantity || 0) <= 0);
});

// Movement summary
const movementSummary = computed(() => {
  if (!movements.value) return { totalIn: 0, totalOut: 0, totalAdjust: 0, inQty: 0, outQty: 0 };
  let totalIn = 0, totalOut = 0, totalAdjust = 0, inQty = 0, outQty = 0;
  for (const m of movements.value) {
    if (m.type === 'in') { totalIn++; inQty += Math.abs(m.quantity); }
    else if (m.type === 'out') { totalOut++; outQty += Math.abs(m.quantity); }
    else { totalAdjust++; }
  }
  return { totalIn, totalOut, totalAdjust, inQty, outQty };
});

// Export as CSV
function exportCSV() {
  if (!products.value) return;

  const headers = ['Name', 'SKU', 'Category', 'Stock', 'Cost Price', 'Selling Price', 'Stock Value'];
  const rows = products.value.map(p => [
    p.name,
    p.sku || '',
    p.category?.name || 'Uncategorized',
    p.stockQuantity || 0,
    p.costPrice || 0,
    p.sellingPrice || 0,
    ((p.stockQuantity || 0) * (p.costPrice || 0)).toFixed(2),
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const ui = {
  card: 'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden',
  cardHeader: 'px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between',
  cardTitle: 'text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2',
  cardBody: 'p-4',
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between border-b border-gray-200 pb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Reports</h1>
        <p class="mt-1 text-sm text-gray-500">Inventory analytics and export tools.</p>
      </div>
      <UiButton @click="exportCSV">
        <Icon name="lucide:download" class="mr-2 h-4 w-4" />
        Export CSV
      </UiButton>
    </div>

    <!-- Summary Cards -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="p-5 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div class="flex justify-between items-start">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Products</p>
          <Icon name="lucide:package" class="h-4 w-4 text-gray-400" />
        </div>
        <div class="mt-2">
          <span class="text-2xl font-bold text-gray-900 font-mono">{{ products?.length ?? 0 }}</span>
        </div>
      </div>

      <div class="p-5 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div class="flex justify-between items-start">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Valuation</p>
          <Icon name="lucide:banknote" class="h-4 w-4 text-gray-400" />
        </div>
        <div class="mt-2">
          <span class="text-2xl font-bold text-gray-900 font-mono">{{ formatCurrency(stats?.totalStockValue ?? 0) }}</span>
        </div>
      </div>

      <div class="p-5 rounded-lg border border-amber-200 bg-amber-50/30 shadow-sm">
        <div class="flex justify-between items-start">
          <p class="text-xs font-medium text-amber-700 uppercase tracking-wide">Low Stock</p>
          <Icon name="lucide:alert-triangle" class="h-4 w-4 text-amber-600" />
        </div>
        <div class="mt-2">
          <span class="text-2xl font-bold text-amber-700 font-mono">{{ lowStockProducts.length }}</span>
        </div>
      </div>

      <div class="p-5 rounded-lg border border-red-100 bg-red-50/30 shadow-sm">
        <div class="flex justify-between items-start">
          <p class="text-xs font-medium text-red-700 uppercase tracking-wide">Out of Stock</p>
          <Icon name="lucide:package-x" class="h-4 w-4 text-red-500" />
        </div>
        <div class="mt-2">
          <span class="text-2xl font-bold text-red-700 font-mono">{{ outOfStockProducts.length }}</span>
        </div>
      </div>
    </div>

    <!-- Movement Summary -->
    <div :class="ui.card">
      <div :class="ui.cardHeader">
        <div :class="ui.cardTitle">
          <Icon name="lucide:arrow-left-right" class="h-3.5 w-3.5 text-gray-500" />
          <span>Movement Summary</span>
        </div>
      </div>
      <div :class="ui.cardBody">
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Icon name="lucide:arrow-down" class="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p class="text-sm font-medium text-green-900">Stock In</p>
              <p class="text-xs text-green-600">{{ movementSummary.totalIn }} transactions &middot; {{ movementSummary.inQty }} units</p>
            </div>
          </div>
          <div class="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <Icon name="lucide:arrow-up" class="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p class="text-sm font-medium text-red-900">Stock Out</p>
              <p class="text-xs text-red-600">{{ movementSummary.totalOut }} transactions &middot; {{ movementSummary.outQty }} units</p>
            </div>
          </div>
          <div class="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Icon name="lucide:settings-2" class="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p class="text-sm font-medium text-amber-900">Adjustments</p>
              <p class="text-xs text-amber-600">{{ movementSummary.totalAdjust }} transactions</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Stock by Category -->
      <div :class="ui.card">
        <div :class="ui.cardHeader">
          <div :class="ui.cardTitle">
            <Icon name="lucide:folder-tree" class="h-3.5 w-3.5 text-gray-500" />
            <span>Stock by Category</span>
          </div>
        </div>
        <div class="divide-y divide-gray-100">
          <div v-for="cat in stockByCategory" :key="cat.name" class="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors">
            <div>
              <p class="text-sm font-medium text-gray-900">{{ cat.name }}</p>
              <p class="text-xs text-gray-500">{{ cat.count }} products &middot; {{ cat.stock }} units</p>
            </div>
            <span class="text-sm font-bold font-mono text-gray-900">{{ formatCurrency(cat.value) }}</span>
          </div>
          <div v-if="stockByCategory.length === 0" class="p-8 text-center text-gray-400 text-sm">No data available.</div>
        </div>
      </div>

      <!-- Top Products by Value -->
      <div :class="ui.card">
        <div :class="ui.cardHeader">
          <div :class="ui.cardTitle">
            <Icon name="lucide:trophy" class="h-3.5 w-3.5 text-gray-500" />
            <span>Top Products by Value</span>
          </div>
        </div>
        <div class="divide-y divide-gray-100">
          <NuxtLink v-for="(p, i) in topProducts" :key="p.id" :to="`/products/${p.id}`" class="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors">
            <div class="flex items-center gap-3 min-w-0">
              <span class="flex-shrink-0 text-xs font-bold text-gray-400 w-5 text-right">{{ i + 1 }}</span>
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{{ p.name }}</p>
                <p class="text-xs text-gray-500 font-mono">{{ p.stockQuantity }} &times; {{ p.costPrice?.toFixed(2) }}</p>
              </div>
            </div>
            <span class="text-sm font-bold font-mono text-gray-900">{{ formatCurrency(p.totalValue) }}</span>
          </NuxtLink>
          <div v-if="topProducts.length === 0" class="p-8 text-center text-gray-400 text-sm">No products yet.</div>
        </div>
      </div>
    </div>

    <!-- Low Stock Table -->
    <div :class="ui.card">
      <div :class="ui.cardHeader">
        <div :class="ui.cardTitle">
          <Icon name="lucide:alert-triangle" class="h-3.5 w-3.5 text-amber-600" />
          <span>Low Stock &amp; Out of Stock Items</span>
        </div>
        <NuxtLink to="/products?filter=low-stock" class="text-xs font-medium text-gray-500 hover:text-gray-900 hover:underline">
          View in Products
        </NuxtLink>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
              <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">SKU</th>
              <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Current Stock</th>
              <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Min Stock</th>
              <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="p in [...outOfStockProducts, ...lowStockProducts.filter(lp => (lp.stockQuantity || 0) > 0)]" :key="p.id" class="hover:bg-gray-50/50">
              <td class="px-4 py-2.5">
                <NuxtLink :to="`/products/${p.id}`" class="text-sm font-medium text-gray-900 hover:text-primary-600">{{ p.name }}</NuxtLink>
              </td>
              <td class="px-4 py-2.5 font-mono text-xs text-gray-500">{{ p.sku || '—' }}</td>
              <td class="px-4 py-2.5 text-right font-mono text-sm font-bold" :class="(p.stockQuantity || 0) <= 0 ? 'text-red-600' : 'text-amber-600'">{{ p.stockQuantity || 0 }}</td>
              <td class="px-4 py-2.5 text-right font-mono text-sm text-gray-500">{{ p.stockMin || 0 }}</td>
              <td class="px-4 py-2.5">
                <span v-if="(p.stockQuantity || 0) <= 0" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Out of stock</span>
                <span v-else class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Low stock</span>
              </td>
            </tr>
            <tr v-if="outOfStockProducts.length === 0 && lowStockProducts.length === 0">
              <td colspan="5" class="p-8 text-center text-gray-400 text-sm">All products are well-stocked.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
