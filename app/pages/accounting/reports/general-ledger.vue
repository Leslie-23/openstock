<script setup lang="ts">
const currentYear = new Date().getFullYear();

const filters = reactive({
  accountId: '' as string,
  startDate: `${currentYear}-01-01`,
  endDate: new Date().toISOString().split('T')[0],
});

const { data: accountsList } = await useFetch('/api/accounting/accounts');

const { data: report, status } = await useFetch('/api/accounting/reports/general-ledger', {
  query: filters,
  immediate: false,
  watch: false,
});

async function loadLedger() {
  if (!filters.accountId) return;
  await $fetch('/api/accounting/reports/general-ledger', { query: filters }).then((data) => {
    report.value = data as any;
  });
}

function fmt(n: number) {
  return (n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const exportColumns = [
  { key: 'date', label: 'Date' },
  { key: 'entryNumber', label: 'Entry #' },
  { key: 'description', label: 'Description' },
  { key: 'referenceType', label: 'Ref' },
  { key: 'debit', label: 'Debit' },
  { key: 'credit', label: 'Credit' },
  { key: 'balance', label: 'Balance' },
];

const exportRows = computed(() => {
  if (!report.value) return [];
  return report.value.entries.map((e) => ({
    date: e.date,
    entryNumber: e.entryNumber,
    description: e.description,
    referenceType: e.referenceType || '-',
    debit: e.debit.toFixed(2),
    credit: e.credit.toFixed(2),
    balance: e.balance.toFixed(2),
  }));
});

const exportTitle = computed(() =>
  report.value ? `General Ledger - ${report.value.account.code} ${report.value.account.name}` : 'General Ledger',
);
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
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">General Ledger</h1>
        <p class="mt-1 text-sm text-gray-500">Detailed transaction history for a specific account</p>
      </div>
      <ReportExportMenu
        v-if="report"
        :title="exportTitle"
        :columns="exportColumns"
        :rows="exportRows"
        :date-label="exportDateLabel"
        :subtitle="exportSubtitle"
      />
    </div>

    <div class="flex items-end gap-4 rounded-xl border border-gray-200 bg-white px-6 py-4">
      <div class="flex-1 max-w-xs">
        <label class="block text-xs font-medium text-gray-500 mb-1">Account</label>
        <select v-model="filters.accountId" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">Select an account</option>
          <option v-for="acct in accountsList" :key="acct.id" :value="acct.id">
            {{ acct.code }} — {{ acct.name }}
          </option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">From</label>
        <input type="date" v-model="filters.startDate" class="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">To</label>
        <input type="date" v-model="filters.endDate" class="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <button @click="loadLedger" :disabled="!filters.accountId" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed">
        Load
      </button>
    </div>

    <div v-if="!report && !filters.accountId" class="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
      <Icon name="lucide:book-open" class="mx-auto h-12 w-12 text-gray-300" />
      <p class="mt-4 text-sm text-gray-500">Select an account and click Load to view its ledger</p>
    </div>

    <div v-if="report" class="space-y-4">
      <div class="rounded-xl border border-gray-200 bg-white p-5 flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500">{{ report.account.code }}</p>
          <p class="text-lg font-semibold text-gray-900">{{ report.account.name }}</p>
          <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{{ report.account.accountType }} &middot; {{ report.account.normalBalance }} balance</span>
        </div>
        <div class="text-right">
          <p class="text-xs text-gray-500 uppercase">Closing Balance</p>
          <p class="text-2xl font-bold text-gray-900">GHS {{ fmt(report.closingBalance) }}</p>
        </div>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50/50">
                <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Entry #</th>
                <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Description</th>
                <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Ref</th>
                <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Debit</th>
                <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Credit</th>
                <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="entry in report.entries" :key="entry.entryId" class="hover:bg-gray-50">
                <td class="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{{ entry.date }}</td>
                <td class="px-6 py-3">
                  <NuxtLink :to="`/accounting/journal/${entry.entryId}`" class="text-sm text-primary-600 hover:underline">
                    {{ entry.entryNumber }}
                  </NuxtLink>
                </td>
                <td class="px-6 py-3 text-sm text-gray-900 max-w-xs truncate">{{ entry.description }}</td>
                <td class="px-6 py-3 text-xs text-gray-400">{{ entry.referenceType || '-' }}</td>
                <td class="px-6 py-3 text-sm text-right" :class="entry.debit > 0 ? 'text-gray-900' : 'text-gray-300'">
                  {{ fmt(entry.debit) }}
                </td>
                <td class="px-6 py-3 text-sm text-right" :class="entry.credit > 0 ? 'text-gray-900' : 'text-gray-300'">
                  {{ fmt(entry.credit) }}
                </td>
                <td class="px-6 py-3 text-sm text-right font-medium text-gray-900">{{ fmt(entry.balance) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="report.entries.length === 0" class="px-6 py-12 text-center">
          <p class="text-sm text-gray-400">No posted transactions for this period</p>
        </div>
        <div v-if="report.entries.length > 0" class="border-t-2 border-gray-300 bg-gray-50 px-6 py-3 flex justify-end font-bold text-sm">
          <span class="text-gray-900">Closing Balance: GHS {{ fmt(report.closingBalance) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
