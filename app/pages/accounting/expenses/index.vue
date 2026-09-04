<script setup lang="ts">
const { data: expenses, refresh } = await useFetch('/api/accounting/expenses');

function fmt(n: number) {
  return (n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' });
}

const statusColors: Record<string, string> = {
  recorded: 'bg-green-100 text-green-700',
  voided: 'bg-gray-100 text-gray-500',
};

const totalExpenses = computed(() => {
  if (!expenses.value) return 0;
  return (expenses.value as any[])
    .filter((e) => e.status === 'recorded')
    .reduce((sum, e) => sum + (e.totalAmount || 0), 0);
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between border-b border-gray-200 pb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Expenses</h1>
        <p class="mt-1 text-sm text-gray-500">Track and manage business expenses</p>
      </div>
      <NuxtLink to="/accounting/expenses/new">
        <UiButton>
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          Record Expense
        </UiButton>
      </NuxtLink>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <p class="text-xs font-medium text-gray-500 uppercase">Total Expenses</p>
        <p class="mt-2 text-2xl font-bold text-red-600">GHS {{ fmt(totalExpenses) }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <p class="text-xs font-medium text-gray-500 uppercase">Count</p>
        <p class="mt-2 text-2xl font-bold text-gray-900">{{ (expenses as any[])?.filter(e => e.status === 'recorded').length || 0 }}</p>
      </div>
    </div>

    <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div class="divide-y divide-gray-100">
        <NuxtLink
          v-for="exp in (expenses as any[])"
          :key="exp.id"
          :to="`/accounting/expenses/${exp.id}`"
          class="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center gap-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <Icon name="lucide:receipt" class="h-5 w-5 text-red-500" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-900">{{ exp.expenseNumber }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full" :class="statusColors[exp.status]">{{ exp.status }}</span>
              </div>
              <p class="text-sm text-gray-700">{{ exp.description }}</p>
              <p class="text-xs text-gray-400">{{ formatDate(exp.date) }} <span v-if="exp.account">&middot; {{ exp.account.name }}</span></p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-gray-900">GHS {{ fmt(exp.totalAmount) }}</p>
            <p v-if="exp.taxAmount > 0" class="text-xs text-gray-400">Tax: GHS {{ fmt(exp.taxAmount) }}</p>
          </div>
        </NuxtLink>
      </div>

      <div v-if="!expenses || (expenses as any[]).length === 0" class="px-6 py-12 text-center">
        <UiEmptyState title="No expenses recorded" description="Record your first business expense">
          <template #action>
            <NuxtLink to="/accounting/expenses/new">
              <UiButton><Icon name="lucide:plus" class="mr-2 h-4 w-4" />Record Expense</UiButton>
            </NuxtLink>
          </template>
        </UiEmptyState>
      </div>
    </div>
  </div>
</template>
