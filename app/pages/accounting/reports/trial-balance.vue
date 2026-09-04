<script setup lang="ts">
const filters = reactive({
  startDate: '' as string,
  endDate: '' as string,
});

const { data: report } = await useFetch('/api/accounting/reports/trial-balance', {
  query: filters,
});

function fmt(n: number) {
  return (n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const typeLabels: Record<string, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expense',
};

const exportColumns = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Account' },
  { key: 'type', label: 'Type' },
  { key: 'debit', label: 'Debit' },
  { key: 'credit', label: 'Credit' },
  { key: 'balance', label: 'Balance' },
];

const exportRows = computed(() => {
  if (!report.value) return [];
  const rows = report.value.accounts.map((a) => ({
    code: a.code,
    name: a.name,
    type: typeLabels[a.accountType] || a.accountType,
    debit: a.totalDebit.toFixed(2),
    credit: a.totalCredit.toFixed(2),
    balance: a.balance.toFixed(2),
  }));
  rows.push({
    code: '',
    name: 'Totals',
    type: '',
    debit: report.value.totals.debit.toFixed(2),
    credit: report.value.totals.credit.toFixed(2),
    balance: '',
  });
  return rows;
});

const exportDateLabel = computed(() =>
  filters.startDate && filters.endDate ? `${filters.startDate}_to_${filters.endDate}` : undefined,
);
const exportSubtitle = computed(() =>
  filters.startDate && filters.endDate ? `Period: ${filters.startDate} to ${filters.endDate}` : 'All time',
);
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4 border-b border-gray-200 pb-4">
      <NuxtLink to="/accounting/reports" class="text-gray-400 hover:text-gray-600">
        <Icon name="lucide:arrow-left" class="h-5 w-5" />
      </NuxtLink>
      <div class="flex-1">
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Trial Balance</h1>
        <p class="mt-1 text-sm text-gray-500">Verify that debits equal credits across all accounts</p>
      </div>
      <ReportExportMenu
        v-if="report"
        title="Trial Balance"
        :columns="exportColumns"
        :rows="exportRows"
        :date-label="exportDateLabel"
        :subtitle="exportSubtitle"
      />
    </div>

    <div class="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white px-6 py-4">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">From</label>
        <input type="date" v-model="filters.startDate" class="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">To</label>
        <input type="date" v-model="filters.endDate" class="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div v-if="report" class="flex items-center gap-2 sm:ml-auto">
        <div class="h-2 w-2 rounded-full" :class="report.totals.isBalanced ? 'bg-green-500' : 'bg-red-500'"></div>
        <span class="text-sm font-medium" :class="report.totals.isBalanced ? 'text-green-600' : 'text-red-600'">
          {{ report.totals.isBalanced ? 'Balanced' : 'Out of balance!' }}
        </span>
      </div>
    </div>

    <div v-if="report" class="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50/50">
            <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Code</th>
            <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Account</th>
            <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
            <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Debit</th>
            <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Credit</th>
            <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Balance</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="acct in report.accounts" :key="acct.accountId" class="hover:bg-gray-50">
            <td class="px-6 py-3 text-sm font-mono text-gray-500">{{ acct.code }}</td>
            <td class="px-6 py-3 text-sm font-medium text-gray-900">{{ acct.name }}</td>
            <td class="px-6 py-3">
              <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{{ typeLabels[acct.accountType] }}</span>
            </td>
            <td class="px-6 py-3 text-sm text-right" :class="acct.totalDebit > 0 ? 'text-gray-900' : 'text-gray-300'">
              {{ fmt(acct.totalDebit) }}
            </td>
            <td class="px-6 py-3 text-sm text-right" :class="acct.totalCredit > 0 ? 'text-gray-900' : 'text-gray-300'">
              {{ fmt(acct.totalCredit) }}
            </td>
            <td class="px-6 py-3 text-sm text-right font-medium text-gray-900">{{ fmt(acct.balance) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="border-t-2 border-gray-300 bg-gray-50 font-bold">
            <td class="px-6 py-3 text-sm" colspan="3">Totals</td>
            <td class="px-6 py-3 text-sm text-right">{{ fmt(report.totals.debit) }}</td>
            <td class="px-6 py-3 text-sm text-right">{{ fmt(report.totals.credit) }}</td>
            <td class="px-6 py-3 text-sm text-right">-</td>
          </tr>
        </tfoot>
      </table>
      </div>
      <div v-if="report.accounts.length === 0" class="px-6 py-12 text-center">
        <UiEmptyState title="No transactions" description="Post journal entries to see the trial balance" />
      </div>
    </div>
  </div>
</template>
