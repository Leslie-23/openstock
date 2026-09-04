<script setup lang="ts">
const toast = useToast();

const filters = reactive({
  status: '' as string,
  startDate: '' as string,
  endDate: '' as string,
});

const queryParams = computed(() => {
  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  return params;
});

const { data: entries, refresh } = await useFetch('/api/accounting/journal-entries', {
  query: queryParams,
});

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-700',
  posted: 'bg-green-100 text-green-700',
  voided: 'bg-red-100 text-red-700',
};

function formatAmount(n: number) {
  return (n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getTotalDebit(entry: any) {
  return entry.lines?.reduce((s: number, l: any) => s + (l.debit || 0), 0) || 0;
}

function clearFilters() {
  Object.assign(filters, { status: '', startDate: '', endDate: '' });
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between border-b border-gray-200 pb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">General Journal</h1>
        <p class="mt-1 text-sm text-gray-500">All journal entries in the ledger</p>
      </div>
      <NuxtLink to="/accounting/journal/new">
        <UiButton>
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          New Entry
        </UiButton>
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white px-6 py-4">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Status</label>
        <select v-model="filters.status" class="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="posted">Posted</option>
          <option value="voided">Voided</option>
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
      <button v-if="filters.status || filters.startDate || filters.endDate" @click="clearFilters" class="text-sm text-gray-500 hover:text-gray-700 underline">
        Clear
      </button>
    </div>

    <!-- Entries List -->
    <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div class="divide-y divide-gray-100">
        <NuxtLink
          v-for="entry in (entries as any[])"
          :key="entry.id"
          :to="`/accounting/journal/${entry.id}`"
          class="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center gap-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Icon name="lucide:book" class="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-900">{{ entry.entryNumber }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full" :class="statusColors[entry.status]">{{ entry.status }}</span>
              </div>
              <p class="text-sm text-gray-500">{{ entry.description }}</p>
              <p class="text-xs text-gray-400">{{ entry.date }} &middot; {{ entry.lines?.length || 0 }} lines</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-gray-900">GHS {{ formatAmount(getTotalDebit(entry)) }}</p>
            <p v-if="entry.referenceType && entry.referenceType !== 'manual'" class="text-xs text-gray-400">{{ entry.referenceType }}</p>
          </div>
        </NuxtLink>
      </div>
      <div v-if="!entries || (entries as any[]).length === 0" class="px-6 py-12 text-center">
        <UiEmptyState title="No journal entries" description="Create your first journal entry to start tracking">
          <template #action>
            <NuxtLink to="/accounting/journal/new">
              <UiButton><Icon name="lucide:plus" class="mr-2 h-4 w-4" />New Entry</UiButton>
            </NuxtLink>
          </template>
        </UiEmptyState>
      </div>
    </div>
  </div>
</template>
