<script setup lang="ts">

const { data: summary, refresh } = await useFetch('/api/finance/summary');

const formatGHS = (val: number) => {
  return `GHS ${(val || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const businessLines = computed(() => {
  if (!summary.value) return [];
  const s = summary.value.summary;
  return [
    { name: 'Appliance', key: 'appliance', icon: 'lucide:tv', color: 'bg-blue-500', ...s.appliance },
    { name: 'Cross-Border', key: 'cross_border', icon: 'lucide:globe', color: 'bg-green-500', ...s.cross_border },
    { name: 'Forex (USD/GHS)', key: 'forex', icon: 'lucide:banknote', color: 'bg-yellow-500', ...s.forex },
    { name: 'Crypto', key: 'crypto', icon: 'lucide:bitcoin', color: 'bg-orange-500', ...s.crypto },
  ];
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Finance Overview</h1>
        <p class="text-sm text-gray-500 mt-1">Track money in & out across all business lines</p>
      </div>
      <button @click="refresh()" class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
        <Icon name="lucide:refresh-cw" class="h-4 w-4" />
        Refresh
      </button>
    </div>

    <!-- Overall Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4" v-if="summary">
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <p class="text-xs font-medium text-gray-500 uppercase">Total Money In</p>
        <p class="mt-2 text-2xl font-bold text-green-600">{{ formatGHS(summary.summary.overall.totalIn) }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <p class="text-xs font-medium text-gray-500 uppercase">Total Money Out</p>
        <p class="mt-2 text-2xl font-bold text-red-600">{{ formatGHS(summary.summary.overall.totalOut) }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <p class="text-xs font-medium text-gray-500 uppercase">Net Position</p>
        <p class="mt-2 text-2xl font-bold" :class="summary.summary.overall.net >= 0 ? 'text-green-600' : 'text-red-600'">
          {{ formatGHS(summary.summary.overall.net) }}
        </p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <p class="text-xs font-medium text-gray-500 uppercase">Total Profit (Trading)</p>
        <p class="mt-2 text-2xl font-bold text-primary-600">{{ formatGHS(summary.profits.total) }}</p>
      </div>
    </div>

    <!-- Profit Breakdown -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4" v-if="summary">
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <div class="flex items-center gap-3 mb-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
            <Icon name="lucide:globe" class="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900">Cross-Border Profit</p>
            <p class="text-xs text-gray-500">{{ summary.counts.crossBorder }} transactions</p>
          </div>
        </div>
        <p class="text-xl font-bold text-green-600">{{ formatGHS(summary.profits.crossBorder) }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <div class="flex items-center gap-3 mb-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
            <Icon name="lucide:banknote" class="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900">Forex Profit</p>
            <p class="text-xs text-gray-500">{{ summary.counts.forex }} trades</p>
          </div>
        </div>
        <p class="text-xl font-bold text-yellow-600">{{ formatGHS(summary.profits.forex) }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <div class="flex items-center gap-3 mb-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
            <Icon name="lucide:bitcoin" class="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900">Crypto Profit</p>
            <p class="text-xs text-gray-500">{{ summary.counts.crypto }} trades</p>
          </div>
        </div>
        <p class="text-xl font-bold text-orange-600">{{ formatGHS(summary.profits.crypto) }}</p>
      </div>
    </div>

    <!-- Business Line Breakdown -->
    <div class="rounded-xl border border-gray-200 bg-white">
      <div class="border-b border-gray-100 px-6 py-4">
        <h2 class="text-lg font-semibold text-gray-900">Money Flow by Business</h2>
      </div>
      <div class="divide-y divide-gray-100">
        <div v-for="biz in businessLines" :key="biz.key" class="flex items-center justify-between px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg" :class="biz.color + '/10'">
              <Icon :name="biz.icon" class="h-5 w-5" :class="biz.color.replace('bg-', 'text-')" />
            </div>
            <span class="font-medium text-gray-900">{{ biz.name }}</span>
          </div>
          <div class="flex items-center gap-8 text-sm">
            <div class="text-right">
              <p class="text-gray-500">In</p>
              <p class="font-semibold text-green-600">{{ formatGHS(biz.totalIn) }}</p>
            </div>
            <div class="text-right">
              <p class="text-gray-500">Out</p>
              <p class="font-semibold text-red-600">{{ formatGHS(biz.totalOut) }}</p>
            </div>
            <div class="text-right">
              <p class="text-gray-500">Net</p>
              <p class="font-semibold" :class="biz.net >= 0 ? 'text-green-600' : 'text-red-600'">{{ formatGHS(biz.net) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="rounded-xl border border-gray-200 bg-white" v-if="summary?.recentTransactions?.length">
      <div class="border-b border-gray-100 px-6 py-4">
        <h2 class="text-lg font-semibold text-gray-900">Recent Transactions</h2>
      </div>
      <div class="divide-y divide-gray-50">
        <div v-for="txn in summary.recentTransactions" :key="txn.id" class="flex items-center justify-between px-6 py-3">
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-full" :class="txn.type === 'in' ? 'bg-green-50' : 'bg-red-50'">
              <Icon :name="txn.type === 'in' ? 'lucide:arrow-down-left' : 'lucide:arrow-up-right'" class="h-4 w-4" :class="txn.type === 'in' ? 'text-green-600' : 'text-red-600'" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">{{ txn.description }}</p>
              <p class="text-xs text-gray-500">{{ txn.businessLine.replace('_', ' ') }} &middot; {{ txn.reference || 'No ref' }}</p>
            </div>
          </div>
          <p class="text-sm font-semibold" :class="txn.type === 'in' ? 'text-green-600' : 'text-red-600'">
            {{ txn.type === 'in' ? '+' : '-' }}{{ formatGHS(txn.amount) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Quick Links -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <NuxtLink to="/finance/transactions" class="rounded-xl border border-gray-200 bg-white p-5 hover:border-primary-300 hover:shadow-sm transition-all text-center">
        <Icon name="lucide:list" class="h-6 w-6 text-gray-400 mx-auto mb-2" />
        <p class="text-sm font-medium text-gray-900">All Transactions</p>
        <p class="text-xs text-gray-500">Ins & Outs</p>
      </NuxtLink>
      <NuxtLink to="/finance/cross-border" class="rounded-xl border border-gray-200 bg-white p-5 hover:border-green-300 hover:shadow-sm transition-all text-center">
        <Icon name="lucide:globe" class="h-6 w-6 text-green-400 mx-auto mb-2" />
        <p class="text-sm font-medium text-gray-900">Cross-Border</p>
        <p class="text-xs text-gray-500">NG &harr; GH</p>
      </NuxtLink>
      <NuxtLink to="/finance/forex" class="rounded-xl border border-gray-200 bg-white p-5 hover:border-yellow-300 hover:shadow-sm transition-all text-center">
        <Icon name="lucide:banknote" class="h-6 w-6 text-yellow-400 mx-auto mb-2" />
        <p class="text-sm font-medium text-gray-900">Forex</p>
        <p class="text-xs text-gray-500">USD &harr; GHS</p>
      </NuxtLink>
      <NuxtLink to="/finance/crypto" class="rounded-xl border border-gray-200 bg-white p-5 hover:border-orange-300 hover:shadow-sm transition-all text-center">
        <Icon name="lucide:bitcoin" class="h-6 w-6 text-orange-400 mx-auto mb-2" />
        <p class="text-sm font-medium text-gray-900">Crypto</p>
        <p class="text-xs text-gray-500">BTC & Others</p>
      </NuxtLink>
    </div>
  </div>
</template>
