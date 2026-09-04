<script setup lang="ts">
const currentYear = new Date().getFullYear();
const filters = reactive({
  startDate: `${currentYear}-01-01`,
  endDate: new Date().toISOString().split('T')[0],
});

const { data: report, refresh } = await useFetch('/api/accounting/reports/profit-loss', {
  query: filters,
});

function fmt(n: number) {
  return (n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const exportColumns = [
  { key: 'section', label: 'Section' },
  { key: 'code', label: 'Code' },
  { key: 'account', label: 'Account' },
  { key: 'amount', label: 'Amount' },
];

const exportRows = computed(() => {
  if (!report.value) return [];
  const rows: Record<string, unknown>[] = [];
  for (const acct of report.value.revenue.accounts) {
    rows.push({ section: 'Revenue', code: acct.code, account: acct.name, amount: acct.amount.toFixed(2) });
  }
  rows.push({ section: 'Revenue', code: '', account: 'Total Revenue', amount: report.value.revenue.total.toFixed(2) });
  for (const acct of report.value.expenses.accounts) {
    rows.push({ section: 'Expenses', code: acct.code, account: acct.name, amount: acct.amount.toFixed(2) });
  }
  rows.push({ section: 'Expenses', code: '', account: 'Total Expenses', amount: report.value.expenses.total.toFixed(2) });
  rows.push({ section: '', code: '', account: 'Net Income', amount: report.value.netIncome.toFixed(2) });
  return rows;
});

const exportDateLabel = computed(() => `${filters.startDate}_to_${filters.endDate}`);
const exportSubtitle = computed(() => `Period: ${filters.startDate} to ${filters.endDate}`);
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4 border-b border-gray-200 pb-4">
      <NuxtLink to="/accounting/reports" class="text-gray-400 hover:text-gray-600">
        <Icon name="lucide:arrow-left" class="h-5 w-5" />
      </NuxtLink>
      <div class="flex-1">
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Profit & Loss Statement</h1>
        <p class="mt-1 text-sm text-gray-500">Income statement for the selected period</p>
      </div>
      <ReportExportMenu
        v-if="report"
        title="Profit and Loss Statement"
        :columns="exportColumns"
        :rows="exportRows"
        :date-label="exportDateLabel"
        :subtitle="exportSubtitle"
      />
    </div>

    <!-- Date Range -->
    <div class="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white px-6 py-4">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">From</label>
        <input type="date" v-model="filters.startDate" class="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">To</label>
        <input type="date" v-model="filters.endDate" class="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
    </div>

    <div v-if="report" class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <p class="text-xs font-medium text-gray-500 uppercase">Total Revenue</p>
          <p class="mt-2 text-2xl font-bold text-green-600">GHS {{ fmt(report.revenue.total) }}</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <p class="text-xs font-medium text-gray-500 uppercase">Total Expenses</p>
          <p class="mt-2 text-2xl font-bold text-red-600">GHS {{ fmt(report.expenses.total) }}</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <p class="text-xs font-medium text-gray-500 uppercase">Net Income</p>
          <p class="mt-2 text-2xl font-bold" :class="report.netIncome >= 0 ? 'text-green-600' : 'text-red-600'">
            GHS {{ fmt(report.netIncome) }}
          </p>
        </div>
      </div>

      <!-- Revenue Section -->
      <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div class="border-b border-gray-100 bg-green-50/50 px-6 py-3">
          <h2 class="text-xs font-bold text-green-700 uppercase tracking-wider">Revenue</h2>
        </div>
        <div class="divide-y divide-gray-50">
          <div v-for="acct in report.revenue.accounts" :key="acct.accountId" class="flex items-center justify-between px-6 py-3">
            <div class="flex items-center gap-3">
              <span class="text-sm font-mono text-gray-400 w-12">{{ acct.code }}</span>
              <span class="text-sm text-gray-900">{{ acct.name }}</span>
            </div>
            <span class="text-sm font-medium text-green-600">GHS {{ fmt(acct.amount) }}</span>
          </div>
          <div v-if="report.revenue.accounts.length === 0" class="px-6 py-4 text-sm text-gray-400 text-center">No revenue recorded</div>
        </div>
        <div class="border-t-2 border-green-200 px-6 py-3 flex justify-between font-bold text-sm">
          <span class="text-green-700">Total Revenue</span>
          <span class="text-green-700">GHS {{ fmt(report.revenue.total) }}</span>
        </div>
      </div>

      <!-- Expenses Section -->
      <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div class="border-b border-gray-100 bg-red-50/50 px-6 py-3">
          <h2 class="text-xs font-bold text-red-700 uppercase tracking-wider">Expenses</h2>
        </div>
        <div class="divide-y divide-gray-50">
          <div v-for="acct in report.expenses.accounts" :key="acct.accountId" class="flex items-center justify-between px-6 py-3">
            <div class="flex items-center gap-3">
              <span class="text-sm font-mono text-gray-400 w-12">{{ acct.code }}</span>
              <span class="text-sm text-gray-900">{{ acct.name }}</span>
            </div>
            <span class="text-sm font-medium text-red-600">GHS {{ fmt(acct.amount) }}</span>
          </div>
          <div v-if="report.expenses.accounts.length === 0" class="px-6 py-4 text-sm text-gray-400 text-center">No expenses recorded</div>
        </div>
        <div class="border-t-2 border-red-200 px-6 py-3 flex justify-between font-bold text-sm">
          <span class="text-red-700">Total Expenses</span>
          <span class="text-red-700">GHS {{ fmt(report.expenses.total) }}</span>
        </div>
      </div>

      <!-- Net Income -->
      <div class="rounded-xl border-2 px-6 py-4 flex justify-between items-center font-bold text-lg"
        :class="report.netIncome >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'">
        <span :class="report.netIncome >= 0 ? 'text-green-800' : 'text-red-800'">Net Income</span>
        <span :class="report.netIncome >= 0 ? 'text-green-700' : 'text-red-700'">GHS {{ fmt(report.netIncome) }}</span>
      </div>
    </div>
  </div>
</template>
