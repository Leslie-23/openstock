<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

const { data: transactions, refresh } = await useFetch('/api/finance/cross-border');
const { toast } = useToast();

const showForm = ref(false);

const form = reactive({
  direction: 'ng_to_gh' as 'ng_to_gh' | 'gh_to_ng',
  description: '',
  sentAmount: 0,
  sentCurrency: 'NGN',
  receivedAmount: 0,
  receivedCurrency: 'GHS',
  exchangeRate: 0,
  fees: 0,
  otherCosts: 0,
  customerName: '',
  reference: '',
  notes: '',
});

// Auto-set currencies based on direction
watch(() => form.direction, (dir) => {
  if (dir === 'ng_to_gh') {
    form.sentCurrency = 'NGN';
    form.receivedCurrency = 'GHS';
  } else {
    form.sentCurrency = 'GHS';
    form.receivedCurrency = 'NGN';
  }
});

// Calculate profit
const calculatedProfit = computed(() => {
  if (form.direction === 'ng_to_gh') {
    // Customer sends NGN, receives GHS. We profit from the spread.
    // Profit = what customer pays us in GHS value - what we pay out in GHS - fees
    const costInGHS = form.exchangeRate > 0 ? form.sentAmount / form.exchangeRate : 0;
    return form.receivedAmount > 0 ? costInGHS - form.receivedAmount - form.fees - form.otherCosts : 0;
  } else {
    // Customer sends GHS, receives NGN.
    // Profit = GHS received - (NGN paid out / rate) - fees
    const payoutInGHS = form.exchangeRate > 0 ? form.receivedAmount / form.exchangeRate : 0;
    return form.sentAmount - payoutInGHS - form.fees - form.otherCosts;
  }
});

const formatGHS = (val: number) => `GHS ${(val || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatAmount = (val: number, cur: string) => `${cur} ${(val || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function submit() {
  if (!form.description || !form.sentAmount || !form.receivedAmount) return;
  await $fetch('/api/finance/cross-border', {
    method: 'POST',
    body: {
      ...form,
      profitGHS: calculatedProfit.value,
    },
  });
  toast({ title: 'Cross-border transaction recorded', type: 'success' });
  showForm.value = false;
  form.description = '';
  form.sentAmount = 0;
  form.receivedAmount = 0;
  form.exchangeRate = 0;
  form.fees = 0;
  form.otherCosts = 0;
  form.customerName = '';
  form.reference = '';
  form.notes = '';
  refresh();
}

const totalProfit = computed(() => {
  return (transactions.value || []).reduce((sum: number, t: any) => sum + t.profitGHS, 0);
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Cross-Border Transactions</h1>
        <p class="text-sm text-gray-500 mt-1">Nigeria &harr; Ghana transfers with profit per transaction</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/finance" class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Icon name="lucide:arrow-left" class="h-4 w-4" /> Back
        </NuxtLink>
        <button @click="showForm = !showForm" class="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          <Icon name="lucide:plus" class="h-4 w-4" /> New Transfer
        </button>
      </div>
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <p class="text-xs font-medium text-gray-500 uppercase">Total Transactions</p>
        <p class="mt-2 text-2xl font-bold text-gray-900">{{ transactions?.length || 0 }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <p class="text-xs font-medium text-gray-500 uppercase">Total Profit</p>
        <p class="mt-2 text-2xl font-bold text-green-600">{{ formatGHS(totalProfit) }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <p class="text-xs font-medium text-gray-500 uppercase">Avg Profit / Transaction</p>
        <p class="mt-2 text-2xl font-bold text-green-600">{{ formatGHS(transactions?.length ? totalProfit / transactions.length : 0) }}</p>
      </div>
    </div>

    <!-- Form -->
    <div v-if="showForm" class="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <h3 class="font-semibold text-gray-900">New Cross-Border Transfer</h3>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Direction</label>
          <select v-model="form.direction" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="ng_to_gh">Nigeria &rarr; Ghana</option>
            <option value="gh_to_ng">Ghana &rarr; Nigeria</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
          <input v-model="form.customerName" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Reference</label>
          <input v-model="form.reference" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Sent Amount ({{ form.sentCurrency }})</label>
          <input v-model.number="form.sentAmount" type="number" step="0.01" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Received Amount ({{ form.receivedCurrency }})</label>
          <input v-model.number="form.receivedAmount" type="number" step="0.01" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Exchange Rate</label>
          <input v-model.number="form.exchangeRate" type="number" step="0.0001" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="NGN per GHS" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Fees</label>
          <input v-model.number="form.fees" type="number" step="0.01" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Other Costs</label>
          <input v-model.number="form.otherCosts" type="number" step="0.01" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div class="flex items-end">
          <div class="rounded-lg border-2 px-4 py-2 w-full text-center" :class="calculatedProfit >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'">
            <p class="text-xs text-gray-500">Est. Profit</p>
            <p class="font-bold" :class="calculatedProfit >= 0 ? 'text-green-700' : 'text-red-700'">{{ formatGHS(calculatedProfit) }}</p>
          </div>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input v-model="form.description" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g., Transfer for customer goods" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea v-model="form.notes" rows="2" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"></textarea>
      </div>
      <button @click="submit" class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
        Record Transfer
      </button>
    </div>

    <!-- Transactions List -->
    <div class="rounded-xl border border-gray-200 bg-white">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direction</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sent</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="!transactions?.length">
              <td colspan="7" class="px-4 py-12 text-center text-gray-500">No cross-border transactions yet</td>
            </tr>
            <tr v-for="txn in transactions" :key="txn.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="txn.direction === 'ng_to_gh' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'">
                  {{ txn.direction === 'ng_to_gh' ? 'NG → GH' : 'GH → NG' }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-900">{{ txn.description }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ txn.customerName || '-' }}</td>
              <td class="px-4 py-3 text-sm text-right text-gray-900">{{ formatAmount(txn.sentAmount, txn.sentCurrency) }}</td>
              <td class="px-4 py-3 text-sm text-right text-gray-900">{{ formatAmount(txn.receivedAmount, txn.receivedCurrency) }}</td>
              <td class="px-4 py-3 text-sm text-right text-gray-600">{{ txn.exchangeRate }}</td>
              <td class="px-4 py-3 text-sm text-right font-semibold" :class="txn.profitGHS >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ formatGHS(txn.profitGHS) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
