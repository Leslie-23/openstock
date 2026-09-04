<script setup lang="ts">
const { data: arData } = await useFetch('/api/accounting/receivables');

function fmt(n: number) {
  return (n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' });
}

const agingBuckets = [
  { key: 'current', label: 'Current', color: 'text-green-600' },
  { key: 'days1to30', label: '1-30 Days', color: 'text-yellow-600' },
  { key: 'days31to60', label: '31-60 Days', color: 'text-orange-600' },
  { key: 'days61to90', label: '61-90 Days', color: 'text-red-500' },
  { key: 'days90plus', label: '90+ Days', color: 'text-red-700' },
];

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  partial: 'bg-orange-100 text-orange-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  written_off: 'bg-gray-100 text-gray-500',
};
</script>

<template>
  <div class="space-y-6">
    <div class="border-b border-gray-200 pb-4">
      <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Accounts Receivable</h1>
      <p class="mt-1 text-sm text-gray-500">Outstanding amounts owed by customers</p>
    </div>

    <div v-if="arData" class="space-y-6">
      <!-- Aging Summary -->
      <div class="grid grid-cols-6 gap-3">
        <div v-for="bucket in agingBuckets" :key="bucket.key" class="rounded-xl border border-gray-200 bg-white p-4">
          <p class="text-xs font-medium text-gray-500">{{ bucket.label }}</p>
          <p class="mt-1 text-lg font-bold" :class="bucket.color">
            GHS {{ fmt((arData as any).summary[bucket.key]) }}
          </p>
        </div>
        <div class="rounded-xl border-2 border-gray-300 bg-gray-50 p-4">
          <p class="text-xs font-bold text-gray-500 uppercase">Total</p>
          <p class="mt-1 text-lg font-bold text-gray-900">GHS {{ fmt((arData as any).summary.totalOutstanding) }}</p>
        </div>
      </div>

      <!-- Records -->
      <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50/50">
              <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Customer</th>
              <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Invoice</th>
              <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Due Date</th>
              <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Aging</th>
              <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Original</th>
              <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Balance Due</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="rec in (arData as any).records" :key="rec.id" class="hover:bg-gray-50">
              <td class="px-6 py-3 text-sm font-medium text-gray-900">{{ rec.customer?.name || '-' }}</td>
              <td class="px-6 py-3">
                <NuxtLink v-if="rec.invoice" :to="`/accounting/invoices/${rec.invoiceId}`" class="text-sm text-primary-600 hover:underline">
                  {{ rec.invoice.invoiceNumber }}
                </NuxtLink>
                <span v-else class="text-sm text-gray-400">-</span>
              </td>
              <td class="px-6 py-3 text-sm text-gray-500">{{ formatDate(rec.dueDate) }}</td>
              <td class="px-6 py-3">
                <span class="text-xs px-2 py-0.5 rounded-full" :class="statusColors[rec.status]">{{ rec.status }}</span>
              </td>
              <td class="px-6 py-3">
                <span v-if="rec.daysOverdue > 0" class="text-xs font-medium text-red-600">{{ rec.daysOverdue }}d overdue</span>
                <span v-else class="text-xs text-green-600">Current</span>
              </td>
              <td class="px-6 py-3 text-sm text-right text-gray-500">GHS {{ fmt(rec.originalAmount) }}</td>
              <td class="px-6 py-3 text-sm text-right font-medium text-gray-900">GHS {{ fmt(rec.balanceDue) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="(arData as any).records.length === 0" class="px-6 py-12 text-center">
          <p class="text-sm text-gray-400">No outstanding receivables</p>
        </div>
      </div>
    </div>
  </div>
</template>
