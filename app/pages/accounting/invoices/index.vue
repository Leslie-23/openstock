<script setup lang="ts">
const toast = useToast();

const activeTab = ref('all');
const tabs = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'paid', label: 'Paid' },
  { key: 'overdue', label: 'Overdue' },
];

const queryParams = computed(() => {
  const params: Record<string, string> = {};
  if (activeTab.value !== 'all') params.status = activeTab.value;
  return params;
});

const { data: invoices, refresh } = await useFetch('/api/accounting/invoices', {
  query: queryParams,
});

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-blue-100 text-blue-700',
  partial: 'bg-orange-100 text-orange-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-100 text-gray-500',
};

function formatAmount(n: number) {
  return (n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' });
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between border-b border-gray-200 pb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Invoices</h1>
        <p class="mt-1 text-sm text-gray-500">Manage and track customer invoices</p>
      </div>
      <NuxtLink to="/accounting/invoices/new">
        <UiButton>
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          New Invoice
        </UiButton>
      </NuxtLink>
    </div>

    <!-- Status Tabs -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        :class="activeTab === tab.key
          ? 'bg-gray-900 text-white'
          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Invoice List -->
    <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div class="divide-y divide-gray-100">
        <NuxtLink
          v-for="invoice in (invoices as any[])"
          :key="invoice.id"
          :to="`/accounting/invoices/${invoice.id}`"
          class="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center gap-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Icon name="lucide:file-text" class="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-900">{{ invoice.invoiceNumber }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full" :class="statusColors[invoice.status]">
                  {{ invoice.status }}
                </span>
              </div>
              <p class="text-sm text-gray-500">{{ invoice.customer?.name || 'No customer' }}</p>
              <p class="text-xs text-gray-400">
                Issued {{ formatDate(invoice.issueDate) }}
                <span v-if="invoice.dueDate"> &middot; Due {{ formatDate(invoice.dueDate) }}</span>
              </p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-gray-900">GHS {{ formatAmount(invoice.totalAmount) }}</p>
            <p v-if="invoice.amountPaid > 0" class="text-xs text-green-600">
              Paid: GHS {{ formatAmount(invoice.amountPaid) }}
            </p>
            <p v-if="invoice.totalAmount - (invoice.amountPaid || 0) > 0 && invoice.status !== 'draft'" class="text-xs text-gray-400">
              Due: GHS {{ formatAmount(invoice.totalAmount - (invoice.amountPaid || 0)) }}
            </p>
          </div>
        </NuxtLink>
      </div>

      <div v-if="!invoices || (invoices as any[]).length === 0" class="px-6 py-12 text-center">
        <UiEmptyState title="No invoices found" description="Create your first invoice to start billing customers">
          <template #action>
            <NuxtLink to="/accounting/invoices/new">
              <UiButton><Icon name="lucide:plus" class="mr-2 h-4 w-4" />New Invoice</UiButton>
            </NuxtLink>
          </template>
        </UiEmptyState>
      </div>
    </div>
  </div>
</template>
