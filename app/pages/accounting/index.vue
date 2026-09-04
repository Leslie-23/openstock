<script setup lang="ts">
const currentYear = new Date().getFullYear();

const { data: plReport } = await useFetch('/api/accounting/reports/profit-loss', {
  query: { startDate: `${currentYear}-01-01`, endDate: new Date().toISOString().split('T')[0] },
});

const { data: arData } = await useFetch('/api/accounting/receivables');
const { data: apData } = await useFetch('/api/accounting/payables');

const { data: recentEntries } = await useFetch('/api/accounting/journal-entries', {
  query: { status: 'posted' },
});

function fmt(n: number) {
  return (n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GH', { month: 'short', day: 'numeric' });
}

const stats = computed(() => [
  {
    title: 'Revenue (YTD)',
    value: plReport.value ? (plReport.value as any).revenue?.total || 0 : 0,
    color: 'text-green-600',
    bg: 'bg-green-50',
    icon: 'lucide:trending-up',
  },
  {
    title: 'Expenses (YTD)',
    value: plReport.value ? (plReport.value as any).expenses?.total || 0 : 0,
    color: 'text-red-600',
    bg: 'bg-red-50',
    icon: 'lucide:trending-down',
  },
  {
    title: 'Net Income',
    value: plReport.value ? (plReport.value as any).netIncome || 0 : 0,
    color: plReport.value && (plReport.value as any).netIncome >= 0 ? 'text-green-600' : 'text-red-600',
    bg: plReport.value && (plReport.value as any).netIncome >= 0 ? 'bg-green-50' : 'bg-red-50',
    icon: 'lucide:wallet',
  },
  {
    title: 'AR Outstanding',
    value: arData.value ? (arData.value as any).summary?.totalOutstanding || 0 : 0,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    icon: 'lucide:arrow-down-left',
  },
  {
    title: 'AP Outstanding',
    value: apData.value ? (apData.value as any).summary?.totalOutstanding || 0 : 0,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    icon: 'lucide:arrow-up-right',
  },
]);

const quickLinks = [
  { name: 'New Invoice', href: '/accounting/invoices/new', icon: 'lucide:file-plus', color: 'bg-blue-100 text-blue-600' },
  { name: 'Record Expense', href: '/accounting/expenses/new', icon: 'lucide:receipt', color: 'bg-red-100 text-red-600' },
  { name: 'Journal Entry', href: '/accounting/journal/new', icon: 'lucide:book-open', color: 'bg-purple-100 text-purple-600' },
  { name: 'Reports', href: '/accounting/reports', icon: 'lucide:bar-chart-3', color: 'bg-green-100 text-green-600' },
];
</script>

<template>
  <div class="space-y-6">
    <div class="border-b border-gray-200 pb-4">
      <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Accounting Dashboard</h1>
      <p class="mt-1 text-sm text-gray-500">Financial overview for {{ currentYear }}</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-5 gap-4">
      <div v-for="stat in stats" :key="stat.title" class="rounded-xl border border-gray-200 bg-white p-5">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg" :class="stat.bg">
            <Icon :name="stat.icon" class="h-5 w-5" :class="stat.color" />
          </div>
          <div>
            <p class="text-xs font-medium text-gray-500">{{ stat.title }}</p>
            <p class="text-lg font-bold" :class="stat.color">GHS {{ fmt(stat.value) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Links -->
    <div class="grid grid-cols-4 gap-4">
      <NuxtLink
        v-for="link in quickLinks"
        :key="link.href"
        :to="link.href"
        class="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-primary-300 hover:shadow-sm transition-all"
      >
        <div class="flex h-10 w-10 items-center justify-center rounded-lg" :class="link.color">
          <Icon :name="link.icon" class="h-5 w-5" />
        </div>
        <span class="text-sm font-medium text-gray-900">{{ link.name }}</span>
      </NuxtLink>
    </div>

    <!-- Recent Entries -->
    <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div class="border-b border-gray-100 px-6 py-3 bg-gray-50/50 flex items-center justify-between">
        <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Recent Journal Entries</h2>
        <NuxtLink to="/accounting/journal" class="text-xs text-primary-600 hover:underline">View All</NuxtLink>
      </div>
      <div class="divide-y divide-gray-50">
        <NuxtLink
          v-for="entry in ((recentEntries as any[])?.slice(0, 8) || [])"
          :key="entry.id"
          :to="`/accounting/journal/${entry.id}`"
          class="flex items-center justify-between px-6 py-3 hover:bg-gray-50"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-mono text-gray-400 w-20">{{ entry.entryNumber }}</span>
            <span class="text-sm text-gray-900">{{ entry.description }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="entry.referenceType" class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{{ entry.referenceType }}</span>
            <span class="text-xs text-gray-400">{{ formatDate(entry.date) }}</span>
          </div>
        </NuxtLink>
      </div>
      <div v-if="!recentEntries || (recentEntries as any[]).length === 0" class="px-6 py-8 text-center text-sm text-gray-400">
        No journal entries yet
      </div>
    </div>
  </div>
</template>
