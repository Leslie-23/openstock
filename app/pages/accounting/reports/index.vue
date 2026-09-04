<script setup lang="ts">
const reports = [
  {
    title: 'Profit & Loss',
    description: 'Revenue minus expenses for a given period',
    icon: 'lucide:trending-up',
    color: 'bg-green-100 text-green-600',
    href: '/accounting/reports/profit-loss',
  },
  {
    title: 'Balance Sheet',
    description: 'Assets, liabilities, and equity as of a date',
    icon: 'lucide:scale',
    color: 'bg-blue-100 text-blue-600',
    href: '/accounting/reports/balance-sheet',
  },
  {
    title: 'Trial Balance',
    description: 'All account balances — debits must equal credits',
    icon: 'lucide:columns',
    color: 'bg-purple-100 text-purple-600',
    href: '/accounting/reports/trial-balance',
  },
  {
    title: 'General Ledger',
    description: 'Detailed transaction history per account',
    icon: 'lucide:book-open',
    color: 'bg-orange-100 text-orange-600',
    href: '/accounting/reports/general-ledger',
  },
];
</script>

<template>
  <div class="space-y-6">
    <div class="border-b border-gray-200 pb-4">
      <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Financial Reports</h1>
      <p class="mt-1 text-sm text-gray-500">Generate and view financial statements</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <NuxtLink
        v-for="report in reports"
        :key="report.href"
        :to="report.href"
        class="rounded-xl border border-gray-200 bg-white p-6 hover:border-primary-300 hover:shadow-sm transition-all group"
      >
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg" :class="report.color">
            <Icon :name="report.icon" class="h-6 w-6" />
          </div>
          <div class="flex-1">
            <h3 class="text-base font-semibold text-gray-900 group-hover:text-primary-700">{{ report.title }}</h3>
            <p class="mt-1 text-sm text-gray-500">{{ report.description }}</p>
          </div>
          <Icon name="lucide:chevron-right" class="h-5 w-5 text-gray-300 group-hover:text-primary-400 mt-1" />
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
