<script setup lang="ts">
const route = useRoute();

const { data: customer } = await useFetch(`/api/accounting/customers/${route.params.id}`);

function fmt(n: number) {
  return (n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' });
}

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-blue-100 text-blue-700',
  partial: 'bg-orange-100 text-orange-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-500',
};

const totalBilled = computed(() => {
  if (!(customer.value as any)?.invoices) return 0;
  return (customer.value as any).invoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
});

const totalPaid = computed(() => {
  if (!(customer.value as any)?.invoices) return 0;
  return (customer.value as any).invoices.reduce((sum: number, inv: any) => sum + (inv.amountPaid || 0), 0);
});

const balance = computed(() => totalBilled.value - totalPaid.value);
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4 border-b border-gray-200 pb-4">
      <NuxtLink to="/accounting/customers" class="text-gray-400 hover:text-gray-600">
        <Icon name="lucide:arrow-left" class="h-5 w-5" />
      </NuxtLink>
      <div class="flex-1">
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">{{ (customer as any)?.name }}</h1>
        <p class="mt-1 text-sm text-gray-500">Customer profile and invoice history</p>
      </div>
      <NuxtLink to="/accounting/invoices/new">
        <UiButton>
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          New Invoice
        </UiButton>
      </NuxtLink>
    </div>

    <div v-if="customer" class="space-y-6">
      <!-- Info + Stats -->
      <div class="grid grid-cols-3 gap-4">
        <div class="col-span-1 rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <h3 class="text-xs font-bold text-gray-500 uppercase">Contact</h3>
          <div class="space-y-1 text-sm">
            <p v-if="(customer as any).email" class="text-gray-700">{{ (customer as any).email }}</p>
            <p v-if="(customer as any).phone" class="text-gray-700">{{ (customer as any).phone }}</p>
            <p v-if="(customer as any).address" class="text-gray-500">{{ (customer as any).address }}</p>
            <p v-if="(customer as any).city" class="text-gray-500">
              {{ (customer as any).city }}<span v-if="(customer as any).country">, {{ (customer as any).country }}</span>
            </p>
            <p v-if="(customer as any).taxId" class="text-gray-400">TIN: {{ (customer as any).taxId }}</p>
          </div>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <p class="text-xs font-medium text-gray-500 uppercase">Total Billed</p>
          <p class="mt-2 text-2xl font-bold text-gray-900">GHS {{ fmt(totalBilled) }}</p>
          <p class="mt-1 text-xs text-green-600">Paid: GHS {{ fmt(totalPaid) }}</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <p class="text-xs font-medium text-gray-500 uppercase">Outstanding</p>
          <p class="mt-2 text-2xl font-bold" :class="balance > 0 ? 'text-red-600' : 'text-green-600'">GHS {{ fmt(balance) }}</p>
          <p class="mt-1 text-xs text-gray-400">{{ (customer as any).invoices?.length || 0 }} invoices</p>
        </div>
      </div>

      <!-- Invoice History -->
      <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div class="border-b border-gray-100 px-6 py-3 bg-gray-50/50">
          <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice History</h2>
        </div>
        <div class="divide-y divide-gray-100">
          <NuxtLink
            v-for="inv in (customer as any).invoices"
            :key="inv.id"
            :to="`/accounting/invoices/${inv.id}`"
            class="flex items-center justify-between px-6 py-3 hover:bg-gray-50"
          >
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium text-gray-900">{{ inv.invoiceNumber }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full" :class="statusColors[inv.status]">{{ inv.status }}</span>
              <span class="text-xs text-gray-400">{{ formatDate(inv.issueDate) }}</span>
            </div>
            <span class="text-sm font-medium text-gray-900">GHS {{ fmt(inv.total) }}</span>
          </NuxtLink>
        </div>
        <div v-if="!(customer as any).invoices?.length" class="px-6 py-8 text-center text-sm text-gray-400">
          No invoices for this customer yet
        </div>
      </div>

      <div v-if="(customer as any).notes" class="rounded-xl border border-gray-200 bg-white p-5">
        <h3 class="text-xs font-bold text-gray-500 uppercase mb-2">Notes</h3>
        <p class="text-sm text-gray-700">{{ (customer as any).notes }}</p>
      </div>
    </div>
  </div>
</template>
