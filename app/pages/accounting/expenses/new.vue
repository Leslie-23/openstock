<script setup lang="ts">
const toast = useToast();
const router = useRouter();

const { data: accountsList } = await useFetch('/api/accounting/accounts', {
  query: { type: 'expense' },
});
const { data: taxesList } = await useFetch('/api/taxes');

const form = reactive({
  accountId: '',
  description: '',
  amount: '' as string | number,
  taxId: '',
  date: new Date().toISOString().split('T')[0],
  paymentMethod: 'cash' as string,
  categoryName: '',
  reference: '',
  notes: '',
});

const selectedTax = computed(() => {
  if (!form.taxId || !taxesList.value) return null;
  return (taxesList.value as any[]).find((t) => t.id === form.taxId);
});

const taxAmount = computed(() => {
  const amt = Number(form.amount) || 0;
  if (!selectedTax.value) return 0;
  return Math.round(amt * selectedTax.value.rate) / 100;
});

const totalAmount = computed(() => {
  return (Number(form.amount) || 0) + taxAmount.value;
});

const submitting = ref(false);

async function submit() {
  if (!form.accountId || !form.description || !form.amount || !form.date) {
    toast.add({ title: 'Please fill all required fields', color: 'red' });
    return;
  }
  submitting.value = true;
  try {
    const res = await $fetch('/api/accounting/expenses', {
      method: 'POST',
      body: {
        accountId: form.accountId,
        description: form.description,
        amount: Number(form.amount),
        taxId: form.taxId || undefined,
        date: form.date,
        paymentMethod: form.paymentMethod,
        categoryName: form.categoryName || undefined,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
      },
    });
    toast.add({ title: `Expense ${(res as any).expenseNumber} recorded`, color: 'green' });
    router.push('/accounting/expenses');
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Failed to create expense', color: 'red' });
  } finally {
    submitting.value = false;
  }
}

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <div class="flex items-center gap-4 border-b border-gray-200 pb-4">
      <NuxtLink to="/accounting/expenses" class="text-gray-400 hover:text-gray-600">
        <Icon name="lucide:arrow-left" class="h-5 w-5" />
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Record Expense</h1>
        <p class="mt-1 text-sm text-gray-500">Creates a journal entry automatically</p>
      </div>
    </div>

    <form @submit.prevent="submit" class="space-y-4">
      <div class="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Expense Account *</label>
            <select v-model="form.accountId" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select account</option>
              <option v-for="acct in (accountsList as any[])" :key="acct.id" :value="acct.id">
                {{ acct.code }} — {{ acct.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input type="date" v-model="form.date" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <input type="text" v-model="form.description" required placeholder="What was this expense for?" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Amount (GHS) *</label>
            <input type="number" v-model="form.amount" required step="0.01" min="0.01" placeholder="0.00" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tax</label>
            <select v-model="form.taxId" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">No tax</option>
              <option v-for="tax in (taxesList as any[])" :key="tax.id" :value="tax.id">
                {{ tax.name }} ({{ tax.rate }}%)
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select v-model="form.paymentMethod" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option v-for="m in paymentMethods" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input type="text" v-model="form.categoryName" placeholder="e.g. Office, Travel" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Reference</label>
            <input type="text" v-model="form.reference" placeholder="Receipt #, PO #" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea v-model="form.notes" rows="2" placeholder="Additional notes" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"></textarea>
        </div>
      </div>

      <!-- Totals -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Amount</span>
          <span class="text-gray-900">GHS {{ (Number(form.amount) || 0).toFixed(2) }}</span>
        </div>
        <div v-if="taxAmount > 0" class="flex justify-between text-sm">
          <span class="text-gray-500">Tax ({{ selectedTax?.name }})</span>
          <span class="text-gray-900">GHS {{ taxAmount.toFixed(2) }}</span>
        </div>
        <div class="flex justify-between text-base font-bold border-t border-gray-200 pt-2">
          <span class="text-gray-700">Total</span>
          <span class="text-red-600">GHS {{ totalAmount.toFixed(2) }}</span>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <NuxtLink to="/accounting/expenses">
          <UiButton variant="outline">Cancel</UiButton>
        </NuxtLink>
        <UiButton type="submit" :disabled="submitting">
          {{ submitting ? 'Recording...' : 'Record Expense' }}
        </UiButton>
      </div>
    </form>
  </div>
</template>
