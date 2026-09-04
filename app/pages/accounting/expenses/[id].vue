<script setup lang="ts">
const route = useRoute();
const toast = useToast();
const router = useRouter();

const { data: expense, refresh } = await useFetch(`/api/accounting/expenses/${route.params.id}`);

function fmt(n: number) {
  return (n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' });
}

const voiding = ref(false);

async function voidExpense() {
  if (!confirm('Void this expense? This will create a reversing journal entry.')) return;
  voiding.value = true;
  try {
    await $fetch(`/api/accounting/expenses/${route.params.id}`, { method: 'DELETE' });
    toast.add({ title: 'Expense voided', color: 'green' });
    await refresh();
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Failed to void', color: 'red' });
  } finally {
    voiding.value = false;
  }
}

const statusColors: Record<string, string> = {
  recorded: 'bg-green-100 text-green-700',
  voided: 'bg-gray-100 text-gray-500',
};
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <div class="flex items-center gap-4 border-b border-gray-200 pb-4">
      <NuxtLink to="/accounting/expenses" class="text-gray-400 hover:text-gray-600">
        <Icon name="lucide:arrow-left" class="h-5 w-5" />
      </NuxtLink>
      <div class="flex-1">
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">{{ (expense as any)?.expenseNumber }}</h1>
        <p class="mt-1 text-sm text-gray-500">Expense detail</p>
      </div>
      <span v-if="expense" class="text-xs px-3 py-1 rounded-full font-medium" :class="statusColors[(expense as any).status]">
        {{ (expense as any).status }}
      </span>
    </div>

    <div v-if="expense" class="space-y-4">
      <div class="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-xs text-gray-500 uppercase">Date</p>
            <p class="text-sm font-medium text-gray-900">{{ formatDate((expense as any).date) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase">Account</p>
            <p class="text-sm font-medium text-gray-900">{{ (expense as any).account?.name || '-' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase">Payment Method</p>
            <p class="text-sm font-medium text-gray-900">{{ (expense as any).paymentMethod || '-' }}</p>
          </div>
          <div v-if="(expense as any).categoryName">
            <p class="text-xs text-gray-500 uppercase">Category</p>
            <p class="text-sm font-medium text-gray-900">{{ (expense as any).categoryName }}</p>
          </div>
        </div>
        <div>
          <p class="text-xs text-gray-500 uppercase">Description</p>
          <p class="text-sm text-gray-900">{{ (expense as any).description }}</p>
        </div>
        <div v-if="(expense as any).reference">
          <p class="text-xs text-gray-500 uppercase">Reference</p>
          <p class="text-sm text-gray-900">{{ (expense as any).reference }}</p>
        </div>
        <div v-if="(expense as any).notes">
          <p class="text-xs text-gray-500 uppercase">Notes</p>
          <p class="text-sm text-gray-900">{{ (expense as any).notes }}</p>
        </div>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-6 space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Amount</span>
          <span class="text-gray-900">GHS {{ fmt((expense as any).amount) }}</span>
        </div>
        <div v-if="(expense as any).taxAmount > 0" class="flex justify-between text-sm">
          <span class="text-gray-500">Tax ({{ (expense as any).taxRate }}%)</span>
          <span class="text-gray-900">GHS {{ fmt((expense as any).taxAmount) }}</span>
        </div>
        <div class="flex justify-between text-base font-bold border-t border-gray-200 pt-2">
          <span class="text-gray-700">Total</span>
          <span class="text-red-600">GHS {{ fmt((expense as any).totalAmount) }}</span>
        </div>
      </div>

      <div v-if="(expense as any).journalEntryId" class="rounded-xl border border-gray-200 bg-white p-6">
        <div class="flex items-center justify-between">
          <p class="text-xs text-gray-500 uppercase">Journal Entry</p>
          <NuxtLink :to="`/accounting/journal/${(expense as any).journalEntryId}`" class="text-sm text-primary-600 hover:underline">
            View Entry
          </NuxtLink>
        </div>
      </div>

      <div v-if="(expense as any).status === 'recorded'" class="flex justify-end">
        <UiButton variant="outline" color="red" :disabled="voiding" @click="voidExpense">
          {{ voiding ? 'Voiding...' : 'Void Expense' }}
        </UiButton>
      </div>
    </div>
  </div>
</template>
