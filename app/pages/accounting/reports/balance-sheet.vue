<script setup lang="ts">
const filters = reactive({
  asOfDate: new Date().toISOString().split('T')[0],
});

const { data: report } = await useFetch('/api/accounting/reports/balance-sheet', {
  query: filters,
});

function fmt(n: number) {
  return (n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const sections = computed(() => {
  if (!report.value) return [];
  return [
    { key: 'assets', title: 'Assets', color: 'blue', data: report.value.assets },
    { key: 'liabilities', title: 'Liabilities', color: 'red', data: report.value.liabilities },
    { key: 'equity', title: 'Equity', color: 'purple', data: report.value.equity },
  ];
});

const exportColumns = [
  { key: 'section', label: 'Section' },
  { key: 'code', label: 'Code' },
  { key: 'account', label: 'Account' },
  { key: 'balance', label: 'Balance' },
];

const exportRows = computed(() => {
  if (!report.value) return [];
  const rows: Record<string, unknown>[] = [];
  for (const section of sections.value) {
    for (const acct of section.data.accounts) {
      rows.push({ section: section.title, code: acct.code || '', account: acct.name, balance: acct.balance.toFixed(2) });
    }
    rows.push({ section: section.title, code: '', account: `Total ${section.title}`, balance: section.data.total.toFixed(2) });
  }
  return rows;
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4 border-b border-gray-200 pb-4">
      <NuxtLink to="/accounting/reports" class="text-gray-400 hover:text-gray-600">
        <Icon name="lucide:arrow-left" class="h-5 w-5" />
      </NuxtLink>
      <div class="flex-1">
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Balance Sheet</h1>
        <p class="mt-1 text-sm text-gray-500">Financial position as of a specific date</p>
      </div>
      <ReportExportMenu
        v-if="report"
        title="Balance Sheet"
        :columns="exportColumns"
        :rows="exportRows"
        :date-label="filters.asOfDate"
        :subtitle="`As of ${filters.asOfDate}`"
      />
    </div>

    <div class="flex items-end gap-4 rounded-xl border border-gray-200 bg-white px-6 py-4">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">As of Date</label>
        <input type="date" v-model="filters.asOfDate" class="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div v-if="report" class="flex items-center gap-2 ml-auto">
        <div class="h-2 w-2 rounded-full" :class="report.isBalanced ? 'bg-green-500' : 'bg-red-500'"></div>
        <span class="text-sm" :class="report.isBalanced ? 'text-green-600' : 'text-red-600'">
          {{ report.isBalanced ? 'Balanced' : 'Out of balance' }}
        </span>
      </div>
    </div>

    <div v-if="report" class="space-y-6">
      <!-- Summary -->
      <div class="grid grid-cols-3 gap-4">
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <p class="text-xs font-medium text-gray-500 uppercase">Total Assets</p>
          <p class="mt-2 text-2xl font-bold text-blue-600">GHS {{ fmt(report.assets.total) }}</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <p class="text-xs font-medium text-gray-500 uppercase">Total Liabilities</p>
          <p class="mt-2 text-2xl font-bold text-red-600">GHS {{ fmt(report.liabilities.total) }}</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <p class="text-xs font-medium text-gray-500 uppercase">Total Equity</p>
          <p class="mt-2 text-2xl font-bold text-purple-600">GHS {{ fmt(report.equity.total) }}</p>
        </div>
      </div>

      <!-- Sections -->
      <div v-for="section in sections" :key="section.key" class="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div class="border-b border-gray-100 px-6 py-3" :class="`bg-${section.color}-50/50`">
          <h2 class="text-xs font-bold uppercase tracking-wider" :class="`text-${section.color}-700`">{{ section.title }}</h2>
        </div>
        <div class="divide-y divide-gray-50">
          <div v-for="acct in section.data.accounts" :key="acct.accountId || acct.name" class="flex items-center justify-between px-6 py-3">
            <div class="flex items-center gap-3">
              <span class="text-sm font-mono text-gray-400 w-12">{{ acct.code }}</span>
              <span class="text-sm text-gray-900" :class="{ 'italic': !acct.code }">{{ acct.name }}</span>
            </div>
            <span class="text-sm font-medium text-gray-900">GHS {{ fmt(acct.balance) }}</span>
          </div>
          <div v-if="section.data.accounts.length === 0" class="px-6 py-4 text-sm text-gray-400 text-center">No entries</div>
        </div>
        <div class="border-t-2 border-gray-200 px-6 py-3 flex justify-between font-bold text-sm">
          <span class="text-gray-700">Total {{ section.title }}</span>
          <span class="text-gray-900">GHS {{ fmt(section.data.total) }}</span>
        </div>
      </div>

      <!-- Equation Check -->
      <div class="rounded-xl border-2 border-gray-300 bg-gray-50 px-6 py-4 text-center">
        <p class="text-sm text-gray-600">
          <span class="font-bold text-blue-600">Assets ({{ fmt(report.assets.total) }})</span>
          <span class="mx-2">=</span>
          <span class="font-bold text-red-600">Liabilities ({{ fmt(report.liabilities.total) }})</span>
          <span class="mx-2">+</span>
          <span class="font-bold text-purple-600">Equity ({{ fmt(report.equity.total) }})</span>
        </p>
      </div>
    </div>
  </div>
</template>
