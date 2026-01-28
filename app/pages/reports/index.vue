<script setup lang="ts">
import { Bar, Doughnut, Line } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';

const { settings, currencySymbol } = useSettings();
const { data: stats, pending: statsPending } = await useFetch('/api/dashboard/stats');
const { data: products, pending: productsPending } = await useFetch('/api/products');
const { data: movements, pending: movementsPending } = await useFetch('/api/movements');
const { data: suppliers } = await useFetch('/api/suppliers');
const { data: categories } = await useFetch('/api/categories');

// Active report tab
const activeTab = ref<'overview' | 'inventory' | 'movements' | 'profitability'>('overview');

// Date range filter for movements
const dateRange = ref<'7d' | '30d' | '90d' | 'all'>('30d');

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: settings.value?.currency || 'GHC',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyDetailed(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: settings.value?.currency || 'GHC',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// ============================================================================
// FILTERED MOVEMENTS
// ============================================================================
const filteredMovements = computed(() => {
  if (!movements.value) return [];
  if (dateRange.value === 'all') return movements.value;

  const now = new Date();
  const days = dateRange.value === '7d' ? 7 : dateRange.value === '30d' ? 30 : 90;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return movements.value.filter(m => new Date(m.createdAt) >= cutoff);
});

// ============================================================================
// OVERVIEW COMPUTATIONS
// ============================================================================

// Stock valuation by category
const stockByCategory = computed(() => {
  if (!products.value || !categories.value) return [];
  const map = new Map<string, { name: string; color: string; count: number; value: number; stock: number; costValue: number; sellingValue: number }>();

  for (const cat of categories.value) {
    map.set(cat.id, { name: cat.name, color: cat.color || '#6B7280', count: 0, value: 0, stock: 0, costValue: 0, sellingValue: 0 });
  }
  map.set('uncategorized', { name: 'Uncategorized', color: '#9CA3AF', count: 0, value: 0, stock: 0, costValue: 0, sellingValue: 0 });

  for (const p of products.value) {
    const key = p.categoryId || 'uncategorized';
    const entry = map.get(key) || { name: 'Unknown', color: '#9CA3AF', count: 0, value: 0, stock: 0, costValue: 0, sellingValue: 0 };
    entry.count++;
    entry.stock += p.stockQuantity || 0;
    entry.costValue += (p.stockQuantity || 0) * (p.costPrice || 0);
    entry.sellingValue += (p.stockQuantity || 0) * (p.sellingPrice || 0);
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
      totalCostValue: (p.stockQuantity || 0) * (p.costPrice || 0),
      totalSellingValue: (p.stockQuantity || 0) * (p.sellingPrice || 0),
      potentialProfit: (p.stockQuantity || 0) * ((p.sellingPrice || 0) - (p.costPrice || 0)),
      marginPercent: p.marginPercent || 0,
    }))
    .sort((a, b) => b.totalCostValue - a.totalCostValue)
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

// ============================================================================
// MOVEMENT ANALYTICS
// ============================================================================
const movementSummary = computed(() => {
  const mvs = filteredMovements.value;
  let totalIn = 0, totalOut = 0, totalAdjust = 0, inQty = 0, outQty = 0;
  let inValue = 0, outValue = 0;
  for (const m of mvs) {
    if (m.type === 'in') { totalIn++; inQty += Math.abs(m.quantity); inValue += Math.abs(m.quantity) * (m.unitCost || 0); }
    else if (m.type === 'out') { totalOut++; outQty += Math.abs(m.quantity); outValue += Math.abs(m.quantity) * (m.unitCost || 0); }
    else { totalAdjust++; }
  }
  return { totalIn, totalOut, totalAdjust, inQty, outQty, inValue, outValue };
});

// Movement trend chart data (daily aggregation)
const movementTrendData = computed<ChartData<'line'>>(() => {
  const mvs = filteredMovements.value;
  if (!mvs.length) return { labels: [], datasets: [] };

  const dayMap = new Map<string, { in: number; out: number }>();
  for (const m of mvs) {
    const day = new Date(m.createdAt).toISOString().split('T')[0];
    if (!dayMap.has(day)) dayMap.set(day, { in: 0, out: 0 });
    const entry = dayMap.get(day)!;
    if (m.type === 'in') entry.in += Math.abs(m.quantity);
    else if (m.type === 'out') entry.out += Math.abs(m.quantity);
  }

  const sorted = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const labels = sorted.map(([day]) => {
    const d = new Date(day);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  return {
    labels,
    datasets: [
      {
        label: 'Stock In',
        data: sorted.map(([, v]) => v.in),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'Stock Out',
        data: sorted.map(([, v]) => v.out),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };
});

const movementTrendOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'index' },
  plugins: {
    legend: { display: true, position: 'top', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } },
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
  },
};

// ============================================================================
// INVENTORY ANALYSIS
// ============================================================================

// ABC Analysis
const abcAnalysis = computed(() => {
  if (!products.value) return { a: [] as any[], b: [] as any[], c: [] as any[] };

  const sorted = [...products.value]
    .map(p => ({ ...p, value: (p.stockQuantity || 0) * (p.costPrice || 0) }))
    .filter(p => p.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalValue = sorted.reduce((sum, p) => sum + p.value, 0);
  let cumValue = 0;
  const a: typeof sorted = [];
  const b: typeof sorted = [];
  const c: typeof sorted = [];

  for (const p of sorted) {
    cumValue += p.value;
    const cumPercent = (cumValue / totalValue) * 100;
    if (cumPercent <= 80) a.push(p);
    else if (cumPercent <= 95) b.push(p);
    else c.push(p);
  }

  return { a, b, c };
});

// Category distribution chart
const categoryChartData = computed<ChartData<'doughnut'>>(() => {
  const cats = stockByCategory.value;
  return {
    labels: cats.map(c => c.name),
    datasets: [{
      data: cats.map(c => c.value),
      backgroundColor: cats.map(c => c.color),
      borderWidth: 0,
      hoverOffset: 4,
    }],
  };
});

const categoryChartOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: { display: true, position: 'right', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 10 } } },
    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}` } },
  },
};

// Top products bar chart
const topProductsChartData = computed<ChartData<'bar'>>(() => {
  const prods = topProducts.value;
  return {
    labels: prods.map(p => p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name),
    datasets: [
      {
        label: 'Cost Value',
        data: prods.map(p => p.totalCostValue),
        backgroundColor: '#3B82F6',
        borderRadius: 4,
        barThickness: 16,
      },
      {
        label: 'Selling Value',
        data: prods.map(p => p.totalSellingValue),
        backgroundColor: '#10B981',
        borderRadius: 4,
        barThickness: 16,
      },
    ],
  };
});

const topProductsChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: {
    legend: { display: true, position: 'top', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.x)}` } },
  },
  scales: {
    x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 }, callback: (v) => formatCurrency(v as number) } },
    y: { grid: { display: false }, ticks: { font: { size: 10 } } },
  },
};

// ============================================================================
// PROFITABILITY
// ============================================================================
const profitabilityMetrics = computed(() => {
  if (!products.value) return { totalCost: 0, totalSelling: 0, potentialProfit: 0, avgMargin: 0, highestMargin: null as any, lowestMargin: null as any };

  let totalCost = 0, totalSelling = 0;
  const withMargin = products.value
    .filter(p => (p.stockQuantity || 0) > 0 && (p.costPrice || 0) > 0)
    .map(p => {
      const costVal = (p.stockQuantity || 0) * (p.costPrice || 0);
      const sellVal = (p.stockQuantity || 0) * (p.sellingPrice || 0);
      totalCost += costVal;
      totalSelling += sellVal;
      return { ...p, costVal, sellVal, effectiveMargin: p.costPrice ? ((p.sellingPrice || 0) - p.costPrice) / p.costPrice * 100 : 0 };
    })
    .sort((a, b) => b.effectiveMargin - a.effectiveMargin);

  const avgMargin = totalCost > 0 ? ((totalSelling - totalCost) / totalCost * 100) : 0;

  return {
    totalCost,
    totalSelling,
    potentialProfit: totalSelling - totalCost,
    avgMargin,
    highestMargin: withMargin[0] || null,
    lowestMargin: withMargin[withMargin.length - 1] || null,
    products: withMargin,
  };
});

// Supplier summary
const supplierSummary = computed(() => {
  if (!products.value || !suppliers.value) return [];
  const map = new Map<string, { name: string; productCount: number; totalValue: number }>();

  for (const s of suppliers.value) {
    map.set(s.id, { name: s.name, productCount: 0, totalValue: 0 });
  }

  for (const p of products.value) {
    if (p.supplierId && map.has(p.supplierId)) {
      const entry = map.get(p.supplierId)!;
      entry.productCount++;
      entry.totalValue += (p.stockQuantity || 0) * (p.costPrice || 0);
    }
  }

  return Array.from(map.values()).filter(s => s.productCount > 0).sort((a, b) => b.totalValue - a.totalValue);
});

// ============================================================================
// EXPORT
// ============================================================================
function exportCSV() {
  if (!products.value) return;

  const headers = ['Name', 'SKU', 'Category', 'Stock', 'Min Stock', 'Cost Price', 'Selling Price', 'Margin %', 'Stock Value (Cost)', 'Stock Value (Selling)', 'Potential Profit', 'Status'];
  const rows = products.value.map(p => {
    const stock = p.stockQuantity || 0;
    const costVal = stock * (p.costPrice || 0);
    const sellVal = stock * (p.sellingPrice || 0);
    const status = stock <= 0 ? 'Out of stock' : (p.stockMin && stock <= p.stockMin ? 'Low stock' : 'In stock');
    return [
      p.name,
      p.sku || '',
      p.category?.name || 'Uncategorized',
      stock,
      p.stockMin || 0,
      (p.costPrice || 0).toFixed(2),
      (p.sellingPrice || 0).toFixed(2),
      (p.marginPercent || 0).toFixed(1),
      costVal.toFixed(2),
      sellVal.toFixed(2),
      (sellVal - costVal).toFixed(2),
      status,
    ];
  });

  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportMovementsCSV() {
  const mvs = filteredMovements.value;
  if (!mvs.length) return;

  const headers = ['Date', 'Product', 'Type', 'Quantity', 'Stock Before', 'Stock After', 'Unit Cost', 'Reference', 'Reason'];
  const rows = mvs.map(m => [
    new Date(m.createdAt).toISOString().split('T')[0],
    m.product?.name || '',
    m.type,
    m.quantity,
    m.stockBefore,
    m.stockAfter,
    (m.unitCost || 0).toFixed(2),
    m.reference || '',
    m.reason || '',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `movements-report-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Most active products by movement count
const mostActiveProducts = computed(() => {
  const mvs = filteredMovements.value;
  if (!mvs.length) return [];

  const map = new Map<string, { name: string; inCount: number; outCount: number; inQty: number; outQty: number }>();
  for (const m of mvs) {
    const id = m.productId;
    if (!map.has(id)) map.set(id, { name: m.product?.name || 'Unknown', inCount: 0, outCount: 0, inQty: 0, outQty: 0 });
    const entry = map.get(id)!;
    if (m.type === 'in') { entry.inCount++; entry.inQty += Math.abs(m.quantity); }
    else if (m.type === 'out') { entry.outCount++; entry.outQty += Math.abs(m.quantity); }
  }

  return Array.from(map.values())
    .sort((a, b) => (b.inCount + b.outCount) - (a.inCount + a.outCount))
    .slice(0, 10);
});

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
        <p class="mt-1 text-sm text-gray-500">Interactive inventory analytics, profitability insights, and export tools.</p>
      </div>
      <div class="flex gap-2">
        <UiButton variant="outline" @click="exportMovementsCSV" v-if="activeTab === 'movements'">
          <Icon name="lucide:download" class="mr-2 h-4 w-4" />
          Export Movements
        </UiButton>
        <UiButton @click="exportCSV">
          <Icon name="lucide:download" class="mr-2 h-4 w-4" />
          Export Inventory
        </UiButton>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200">
      <nav class="flex gap-6 -mb-px">
        <button
          v-for="tab in [
            { key: 'overview', label: 'Overview', icon: 'lucide:layout-dashboard' },
            { key: 'inventory', label: 'Inventory Analysis', icon: 'lucide:package-search' },
            { key: 'movements', label: 'Stock Movements', icon: 'lucide:arrow-left-right' },
            { key: 'profitability', label: 'Profitability', icon: 'lucide:trending-up' },
          ]"
          :key="tab.key"
          @click="activeTab = tab.key as any"
          class="flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === tab.key
            ? 'border-gray-900 text-gray-900'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
        >
          <Icon :name="tab.icon" class="h-4 w-4" />
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <!-- ================================================================== -->
    <!-- OVERVIEW TAB -->
    <!-- ================================================================== -->
    <div v-if="activeTab === 'overview'" class="space-y-6">
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
          <p class="text-xs text-gray-400 mt-1">Potential selling: {{ formatCurrency(profitabilityMetrics.totalSelling) }}</p>
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

      <!-- Charts Row -->
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Category Value Distribution -->
        <div :class="ui.card">
          <div :class="ui.cardHeader">
            <div :class="ui.cardTitle">
              <Icon name="lucide:pie-chart" class="h-3.5 w-3.5 text-gray-500" />
              <span>Value by Category</span>
            </div>
          </div>
          <div :class="ui.cardBody">
            <div v-if="stockByCategory.length > 0" class="h-56">
              <Doughnut :data="categoryChartData" :options="categoryChartOptions" />
            </div>
            <div v-else class="h-56 flex items-center justify-center text-sm text-gray-400">No category data</div>
          </div>
        </div>

        <!-- Top Products Chart -->
        <div :class="ui.card">
          <div :class="ui.cardHeader">
            <div :class="ui.cardTitle">
              <Icon name="lucide:bar-chart-3" class="h-3.5 w-3.5 text-gray-500" />
              <span>Top 10 Products (Cost vs Selling Value)</span>
            </div>
          </div>
          <div :class="ui.cardBody">
            <div v-if="topProducts.length > 0" class="h-72">
              <Bar :data="topProductsChartData" :options="topProductsChartOptions" />
            </div>
            <div v-else class="h-56 flex items-center justify-center text-sm text-gray-400">No products yet</div>
          </div>
        </div>
      </div>

      <!-- Category Breakdown Table -->
      <div :class="ui.card">
        <div :class="ui.cardHeader">
          <div :class="ui.cardTitle">
            <Icon name="lucide:folder-tree" class="h-3.5 w-3.5 text-gray-500" />
            <span>Stock by Category</span>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Category</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Products</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Units</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Cost Value</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Selling Value</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Profit Potential</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="cat in stockByCategory" :key="cat.name" class="hover:bg-gray-50/50 transition-colors">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: cat.color }"></span>
                    <span class="text-sm font-medium text-gray-900">{{ cat.name }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-right font-mono text-sm text-gray-600">{{ cat.count }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm text-gray-600">{{ cat.stock }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm font-bold text-gray-900">{{ formatCurrency(cat.costValue) }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm text-gray-900">{{ formatCurrency(cat.sellingValue) }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm font-bold text-green-600">{{ formatCurrency(cat.sellingValue - cat.costValue) }}</td>
              </tr>
              <tr v-if="stockByCategory.length === 0">
                <td colspan="6" class="p-8 text-center text-gray-400 text-sm">No data available.</td>
              </tr>
            </tbody>
            <tfoot v-if="stockByCategory.length > 0" class="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td class="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
                <td class="px-4 py-3 text-right font-mono text-sm font-bold text-gray-900">{{ stockByCategory.reduce((s, c) => s + c.count, 0) }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm font-bold text-gray-900">{{ stockByCategory.reduce((s, c) => s + c.stock, 0) }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm font-bold text-gray-900">{{ formatCurrency(stockByCategory.reduce((s, c) => s + c.costValue, 0)) }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm font-bold text-gray-900">{{ formatCurrency(stockByCategory.reduce((s, c) => s + c.sellingValue, 0)) }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm font-bold text-green-600">{{ formatCurrency(stockByCategory.reduce((s, c) => s + (c.sellingValue - c.costValue), 0)) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- INVENTORY ANALYSIS TAB -->
    <!-- ================================================================== -->
    <div v-if="activeTab === 'inventory'" class="space-y-6">
      <!-- ABC Analysis -->
      <div :class="ui.card">
        <div :class="ui.cardHeader">
          <div :class="ui.cardTitle">
            <Icon name="lucide:layers" class="h-3.5 w-3.5 text-gray-500" />
            <span>ABC Analysis (Inventory Classification)</span>
          </div>
        </div>
        <div :class="ui.cardBody">
          <p class="text-sm text-gray-500 mb-4">Products classified by their contribution to total inventory value. <strong>A</strong> items = top 80% of value, <strong>B</strong> = next 15%, <strong>C</strong> = remaining 5%.</p>
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="p-4 rounded-lg border-2 border-green-200 bg-green-50/50">
              <div class="flex justify-between items-center mb-2">
                <span class="text-lg font-bold text-green-700">Class A</span>
                <span class="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">80% Value</span>
              </div>
              <p class="text-3xl font-bold text-green-800 font-mono">{{ abcAnalysis.a.length }}</p>
              <p class="text-xs text-green-600 mt-1">High-value items requiring close monitoring</p>
              <p class="text-sm font-mono text-green-700 mt-2">{{ formatCurrency(abcAnalysis.a.reduce((s: number, p: any) => s + p.value, 0)) }}</p>
            </div>
            <div class="p-4 rounded-lg border-2 border-amber-200 bg-amber-50/50">
              <div class="flex justify-between items-center mb-2">
                <span class="text-lg font-bold text-amber-700">Class B</span>
                <span class="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">15% Value</span>
              </div>
              <p class="text-3xl font-bold text-amber-800 font-mono">{{ abcAnalysis.b.length }}</p>
              <p class="text-xs text-amber-600 mt-1">Moderate-value items with standard controls</p>
              <p class="text-sm font-mono text-amber-700 mt-2">{{ formatCurrency(abcAnalysis.b.reduce((s: number, p: any) => s + p.value, 0)) }}</p>
            </div>
            <div class="p-4 rounded-lg border-2 border-gray-200 bg-gray-50/50">
              <div class="flex justify-between items-center mb-2">
                <span class="text-lg font-bold text-gray-700">Class C</span>
                <span class="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">5% Value</span>
              </div>
              <p class="text-3xl font-bold text-gray-800 font-mono">{{ abcAnalysis.c.length }}</p>
              <p class="text-xs text-gray-600 mt-1">Low-value items with minimal controls</p>
              <p class="text-sm font-mono text-gray-700 mt-2">{{ formatCurrency(abcAnalysis.c.reduce((s: number, p: any) => s + p.value, 0)) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Products Table with more detail -->
      <div :class="ui.card">
        <div :class="ui.cardHeader">
          <div :class="ui.cardTitle">
            <Icon name="lucide:trophy" class="h-3.5 w-3.5 text-gray-500" />
            <span>Top Products by Value</span>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 w-8">#</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Qty</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Cost</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Sell Price</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Margin</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Stock Value</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Profit Potential</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(p, i) in topProducts" :key="p.id" class="hover:bg-gray-50/50 transition-colors">
                <td class="px-4 py-3 text-xs font-bold text-gray-400">{{ i + 1 }}</td>
                <td class="px-4 py-3">
                  <NuxtLink :to="`/products/${p.id}`" class="text-sm font-medium text-gray-900 hover:text-primary-600">{{ p.name }}</NuxtLink>
                  <p class="text-xs text-gray-400 font-mono">{{ p.sku || 'No SKU' }}</p>
                </td>
                <td class="px-4 py-3 text-right font-mono text-sm text-gray-600">{{ p.stockQuantity }}</td>
                <td class="px-4 py-3 text-right font-mono text-xs text-gray-500">{{ formatCurrencyDetailed(p.costPrice || 0) }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm text-gray-900">{{ formatCurrencyDetailed(p.sellingPrice || 0) }}</td>
                <td class="px-4 py-3 text-right">
                  <span class="text-xs font-medium px-1.5 py-0.5 rounded" :class="p.marginPercent >= 30 ? 'bg-green-100 text-green-700' : p.marginPercent >= 15 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'">
                    {{ p.marginPercent.toFixed(0) }}%
                  </span>
                </td>
                <td class="px-4 py-3 text-right font-mono text-sm font-bold text-gray-900">{{ formatCurrency(p.totalCostValue) }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm font-bold text-green-600">{{ formatCurrency(p.potentialProfit) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Low Stock & Out of Stock Table -->
      <div :class="ui.card">
        <div :class="ui.cardHeader">
          <div :class="ui.cardTitle">
            <Icon name="lucide:alert-triangle" class="h-3.5 w-3.5 text-amber-600" />
            <span>Low Stock &amp; Out of Stock Items ({{ outOfStockProducts.length + lowStockProducts.filter(lp => (lp.stockQuantity || 0) > 0).length }})</span>
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
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Deficit</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Reorder Cost</th>
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
                <td class="px-4 py-2.5 text-right font-mono text-sm font-bold text-red-600">{{ Math.max(0, (p.stockMin || 0) - (p.stockQuantity || 0)) }}</td>
                <td class="px-4 py-2.5 text-right font-mono text-xs text-gray-600">{{ formatCurrencyDetailed(Math.max(0, (p.stockMin || 0) - (p.stockQuantity || 0)) * (p.costPrice || 0)) }}</td>
                <td class="px-4 py-2.5">
                  <span v-if="(p.stockQuantity || 0) <= 0" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Out of stock</span>
                  <span v-else class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Low stock</span>
                </td>
              </tr>
              <tr v-if="outOfStockProducts.length === 0 && lowStockProducts.length === 0">
                <td colspan="7" class="p-8 text-center text-gray-400 text-sm">All products are well-stocked.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Supplier Summary -->
      <div v-if="supplierSummary.length > 0" :class="ui.card">
        <div :class="ui.cardHeader">
          <div :class="ui.cardTitle">
            <Icon name="lucide:truck" class="h-3.5 w-3.5 text-gray-500" />
            <span>Supplier Breakdown</span>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Supplier</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Products</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Stock Value</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="s in supplierSummary" :key="s.name" class="hover:bg-gray-50/50">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ s.name }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm text-gray-600">{{ s.productCount }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm font-bold text-gray-900">{{ formatCurrency(s.totalValue) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- MOVEMENTS TAB -->
    <!-- ================================================================== -->
    <div v-if="activeTab === 'movements'" class="space-y-6">
      <!-- Date Range Filter -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500">Period:</span>
        <div class="flex rounded-md border border-gray-200 overflow-hidden">
          <button
            v-for="range in [
              { key: '7d', label: '7 Days' },
              { key: '30d', label: '30 Days' },
              { key: '90d', label: '90 Days' },
              { key: 'all', label: 'All Time' },
            ]"
            :key="range.key"
            @click="dateRange = range.key as any"
            class="px-3 py-1.5 text-xs font-medium transition-colors"
            :class="dateRange === range.key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'"
          >
            {{ range.label }}
          </button>
        </div>
        <span class="text-xs text-gray-400 ml-2">{{ filteredMovements.length }} movements</span>
      </div>

      <!-- Movement Summary -->
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-100">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
            <Icon name="lucide:arrow-down" class="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-green-900">Stock In</p>
            <p class="text-xs text-green-600">{{ movementSummary.totalIn }} transactions &middot; {{ movementSummary.inQty }} units</p>
            <p class="text-xs font-mono font-bold text-green-700 mt-0.5">{{ formatCurrency(movementSummary.inValue) }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-100">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
            <Icon name="lucide:arrow-up" class="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-red-900">Stock Out</p>
            <p class="text-xs text-red-600">{{ movementSummary.totalOut }} transactions &middot; {{ movementSummary.outQty }} units</p>
            <p class="text-xs font-mono font-bold text-red-700 mt-0.5">{{ formatCurrency(movementSummary.outValue) }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-100">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
            <Icon name="lucide:settings-2" class="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-amber-900">Adjustments</p>
            <p class="text-xs text-amber-600">{{ movementSummary.totalAdjust }} transactions</p>
          </div>
        </div>
      </div>

      <!-- Movement Trend Chart -->
      <div :class="ui.card">
        <div :class="ui.cardHeader">
          <div :class="ui.cardTitle">
            <Icon name="lucide:activity" class="h-3.5 w-3.5 text-gray-500" />
            <span>Movement Trend</span>
          </div>
        </div>
        <div :class="ui.cardBody">
          <div v-if="movementTrendData.labels?.length" class="h-64">
            <Line :data="movementTrendData" :options="movementTrendOptions" />
          </div>
          <div v-else class="h-64 flex items-center justify-center text-sm text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
            <div class="text-center">
              <Icon name="lucide:bar-chart-2" class="h-8 w-8 mb-2 mx-auto opacity-20" />
              <p>No movement data for selected period</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Most Active Products -->
      <div :class="ui.card">
        <div :class="ui.cardHeader">
          <div :class="ui.cardTitle">
            <Icon name="lucide:zap" class="h-3.5 w-3.5 text-gray-500" />
            <span>Most Active Products</span>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">In (Txns)</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">In (Qty)</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Out (Txns)</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Out (Qty)</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Total Activity</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="p in mostActiveProducts" :key="p.name" class="hover:bg-gray-50/50">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ p.name }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm text-green-600">{{ p.inCount }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm text-green-700 font-bold">+{{ p.inQty }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm text-red-600">{{ p.outCount }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm text-red-700 font-bold">-{{ p.outQty }}</td>
                <td class="px-4 py-3 text-right font-mono text-sm font-bold text-gray-900">{{ p.inCount + p.outCount }}</td>
              </tr>
              <tr v-if="mostActiveProducts.length === 0">
                <td colspan="6" class="p-8 text-center text-gray-400 text-sm">No movement data for selected period.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- PROFITABILITY TAB -->
    <!-- ================================================================== -->
    <div v-if="activeTab === 'profitability'" class="space-y-6">
      <!-- Profit Overview Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="p-5 rounded-lg border border-gray-200 bg-white shadow-sm">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Cost Value</p>
          <p class="text-2xl font-bold text-gray-900 font-mono mt-2">{{ formatCurrency(profitabilityMetrics.totalCost) }}</p>
          <p class="text-xs text-gray-400 mt-1">Capital invested in stock</p>
        </div>
        <div class="p-5 rounded-lg border border-gray-200 bg-white shadow-sm">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Selling Value</p>
          <p class="text-2xl font-bold text-gray-900 font-mono mt-2">{{ formatCurrency(profitabilityMetrics.totalSelling) }}</p>
          <p class="text-xs text-gray-400 mt-1">Revenue if all stock sold</p>
        </div>
        <div class="p-5 rounded-lg border border-green-200 bg-green-50/30 shadow-sm">
          <p class="text-xs font-medium text-green-700 uppercase tracking-wide">Potential Profit</p>
          <p class="text-2xl font-bold text-green-700 font-mono mt-2">{{ formatCurrency(profitabilityMetrics.potentialProfit) }}</p>
          <p class="text-xs text-green-600 mt-1">If entire inventory is sold</p>
        </div>
        <div class="p-5 rounded-lg border border-primary-200 bg-primary-50/30 shadow-sm">
          <p class="text-xs font-medium text-primary-700 uppercase tracking-wide">Average Margin</p>
          <p class="text-2xl font-bold text-primary-700 font-mono mt-2">{{ profitabilityMetrics.avgMargin.toFixed(1) }}%</p>
          <p class="text-xs text-primary-600 mt-1">Weighted across all products</p>
        </div>
      </div>

      <!-- Margin Distribution -->
      <div class="grid gap-6 lg:grid-cols-2">
        <div :class="ui.card">
          <div :class="ui.cardHeader">
            <div :class="ui.cardTitle">
              <Icon name="lucide:arrow-up-circle" class="h-3.5 w-3.5 text-green-500" />
              <span>Highest Margin Product</span>
            </div>
          </div>
          <div :class="ui.cardBody">
            <div v-if="profitabilityMetrics.highestMargin" class="flex items-center justify-between">
              <div>
                <NuxtLink :to="`/products/${profitabilityMetrics.highestMargin.id}`" class="text-lg font-semibold text-gray-900 hover:text-primary-600">
                  {{ profitabilityMetrics.highestMargin.name }}
                </NuxtLink>
                <p class="text-sm text-gray-500 mt-1">
                  Cost: {{ formatCurrencyDetailed(profitabilityMetrics.highestMargin.costPrice || 0) }}
                  &rarr; Sell: {{ formatCurrencyDetailed(profitabilityMetrics.highestMargin.sellingPrice || 0) }}
                </p>
              </div>
              <span class="text-2xl font-bold text-green-600 font-mono">{{ profitabilityMetrics.highestMargin.effectiveMargin.toFixed(1) }}%</span>
            </div>
            <p v-else class="text-sm text-gray-400">No data</p>
          </div>
        </div>

        <div :class="ui.card">
          <div :class="ui.cardHeader">
            <div :class="ui.cardTitle">
              <Icon name="lucide:arrow-down-circle" class="h-3.5 w-3.5 text-red-500" />
              <span>Lowest Margin Product</span>
            </div>
          </div>
          <div :class="ui.cardBody">
            <div v-if="profitabilityMetrics.lowestMargin" class="flex items-center justify-between">
              <div>
                <NuxtLink :to="`/products/${profitabilityMetrics.lowestMargin.id}`" class="text-lg font-semibold text-gray-900 hover:text-primary-600">
                  {{ profitabilityMetrics.lowestMargin.name }}
                </NuxtLink>
                <p class="text-sm text-gray-500 mt-1">
                  Cost: {{ formatCurrencyDetailed(profitabilityMetrics.lowestMargin.costPrice || 0) }}
                  &rarr; Sell: {{ formatCurrencyDetailed(profitabilityMetrics.lowestMargin.sellingPrice || 0) }}
                </p>
              </div>
              <span class="text-2xl font-bold font-mono" :class="profitabilityMetrics.lowestMargin.effectiveMargin < 10 ? 'text-red-600' : 'text-amber-600'">
                {{ profitabilityMetrics.lowestMargin.effectiveMargin.toFixed(1) }}%
              </span>
            </div>
            <p v-else class="text-sm text-gray-400">No data</p>
          </div>
        </div>
      </div>

      <!-- All Products Profitability Table -->
      <div :class="ui.card">
        <div :class="ui.cardHeader">
          <div :class="ui.cardTitle">
            <Icon name="lucide:table" class="h-3.5 w-3.5 text-gray-500" />
            <span>Product Profitability (Sorted by Margin)</span>
          </div>
        </div>
        <div class="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Cost</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Selling</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Margin</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Qty</th>
                <th class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Profit Potential</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="p in profitabilityMetrics.products" :key="p.id" class="hover:bg-gray-50/50">
                <td class="px-4 py-2.5">
                  <NuxtLink :to="`/products/${p.id}`" class="text-sm font-medium text-gray-900 hover:text-primary-600">{{ p.name }}</NuxtLink>
                </td>
                <td class="px-4 py-2.5 text-right font-mono text-xs text-gray-500">{{ formatCurrencyDetailed(p.costPrice || 0) }}</td>
                <td class="px-4 py-2.5 text-right font-mono text-sm text-gray-900">{{ formatCurrencyDetailed(p.sellingPrice || 0) }}</td>
                <td class="px-4 py-2.5 text-right">
                  <span class="text-xs font-bold px-1.5 py-0.5 rounded" :class="p.effectiveMargin >= 30 ? 'bg-green-100 text-green-700' : p.effectiveMargin >= 15 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'">
                    {{ p.effectiveMargin.toFixed(1) }}%
                  </span>
                </td>
                <td class="px-4 py-2.5 text-right font-mono text-sm text-gray-600">{{ p.stockQuantity }}</td>
                <td class="px-4 py-2.5 text-right font-mono text-sm font-bold text-green-600">{{ formatCurrency(p.sellVal - p.costVal) }}</td>
              </tr>
              <tr v-if="!profitabilityMetrics.products?.length">
                <td colspan="6" class="p-8 text-center text-gray-400 text-sm">No products with stock to analyze.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
