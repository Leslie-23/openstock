<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

const { data: transactions, refresh } = await useFetch('/api/finance/forex');
const { toast } = useToast();

const showForm = ref(false);

const form = reactive({
  type: 'buy' as 'buy' | 'sell',
  usdAmount: 0,
  ghsAmount: 0,
  exchangeRate: 0,
  marketRate: 0,
  profitGHS: 0,
  customerName: '',
  reference: '',
  notes: '',
});

// Auto-calculate GHS when rate or USD changes
watch([() => form.usdAmount, () => form.exchangeRate], () => {
  if (form.usdAmount && form.exchangeRate) {
    form.ghsAmount = parseFloat((form.usdAmount * form.exchangeRate).toFixed(2));
  }
});

// Auto-calculate profit when market rate is provided
watch([() => form.ghsAmount, () => form.marketRate, () => form.exchangeRate, () => form.usdAmount], () => {
  if (form.marketRate && form.exchangeRate && form.usdAmount) {
    if (form.type === 'buy') {
      // Buying USD: profit = (marketRate - ourRate) * usdAmount (we bought cheap)
      form.profitGHS = parseFloat(((form.marketRate - form.exchangeRate) * form.usdAmount).toFixed(2));
    } else {
      // Selling USD: profit = (ourRate - marketRate) * usdAmount (we sold expensive)
      form.profitGHS = parseFloat(((form.exchangeRate - form.marketRate) * form.usdAmount).toFixed(2));
    }
  }
});

const formatGHS = (val: number) => `GHS ${(val || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatUSD = (val: number) => `$${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function submit() {
  if (!form.usdAmount || !form.ghsAmount) return;
  await $fetch('/api/finance/forex', { method: 'POST', body: form });
  toast({ title: 'Forex trade recorded', type: 'success' });
  showForm.value = false;
  form.usdAmount = 0;
  form.ghsAmount = 0;
  form.exchangeRate = 0;
  form.marketRate = 0;
  form.profitGHS = 0;
  form.customerName = '';
  form.reference = '';
  form.notes = '';
  refresh();
}

const totalProfit = computed(() => (transactions.value || []).reduce((sum: number, t: any) => sum + (t.profitGHS || 0), 0));
const totalUSD = computed(() => {
  if (!transactions.value) return { bought: 0, sold: 0 };
  return {
    bought: transactions.value.filter((t: any) => t.type === 'buy').reduce((s: number, t: any) => s + t.usdAmount, 0),
    sold: transactions.value.filter((t: any) => t.type === 'sell').reduce((s: number, t: any) => s + t.usdAmount, 0),
  };
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Forex Trading</h1>
        <p class="text-sm text-gray-500 mt-1">USD &harr; GHS buy and sell</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/finance" class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Icon name="lucide:arrow-left" class="h-4 w-4" /> Back
        </NuxtLink>
        <button @click="showForm = !showForm" class="inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700">
          <Icon name="lucide:plus" class="h-4 w-4" /> New Trade
        </button>
      </div>
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <p class="text-xs font-medium text-gray-500 uppercase">Total Trades</p>
        <p class="mt-2 text-2xl font-bold text-gray-900">{{ transactions?.length || 0 }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <p class="text-xs font-medium text-gray-500 uppercase">USD Bought</p>
        <p class="mt-2 text-2xl font-bold text-blue-600">{{ formatUSD(totalUSD.bought) }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <p class="text-xs font-medium text-gray-500 uppercase">USD Sold</p>
        <p class="mt-2 text-2xl font-bold text-green-600">{{ formatUSD(totalUSD.sold) }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <p class="text-xs font-medium text-gray-500 uppercase">Total Profit</p>
        <p class="mt-2 text-2xl font-bold" :class="totalProfit >= 0 ? 'text-green-600' : 'text-red-600'">{{ formatGHS(totalProfit) }}</p>
      </div>
    </div>

    <!-- Form -->
    <div v-if="showForm" class="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <h3 class="font-semibold text-gray-900">New Forex Trade</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select v-model="form.type" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="buy">Buy USD</option>
            <option value="sell">Sell USD</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">USD Amount</label>
          <input v-model.number="form.usdAmount" type="number" step="0.01" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Our Rate (GHS/USD)</label>
          <input v-model.number="form.exchangeRate" type="number" step="0.01" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">GHS Total</label>
          <input v-model.number="form.ghsAmount" type="number" step="0.01" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Market Rate (optional)</label>
          <input v-model.number="form.marketRate" type="number" step="0.01" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="For profit calc" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Customer</label>
          <input v-model="form.customerName" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Reference</label>
          <input v-model="form.reference" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div class="flex items-end">
          <div class="rounded-lg border-2 px-4 py-2 w-full text-center" :class="form.profitGHS >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'">
            <p class="text-xs text-gray-500">Profit</p>
            <p class="font-bold" :class="form.profitGHS >= 0 ? 'text-green-700' : 'text-red-700'">{{ formatGHS(form.profitGHS) }}</p>
          </div>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea v-model="form.notes" rows="2" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"></textarea>
      </div>
      <button @click="submit" class="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700">
        Record Trade
      </button>
    </div>

    <!-- Trades List -->
    <div class="rounded-xl border border-gray-200 bg-white">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">USD</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">GHS</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Market Rate</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="!transactions?.length">
              <td colspan="7" class="px-4 py-12 text-center text-gray-500">No forex trades yet</td>
            </tr>
            <tr v-for="txn in transactions" :key="txn.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="txn.type === 'buy' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'">
                  {{ txn.type === 'buy' ? 'BUY' : 'SELL' }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-right text-gray-900">{{ formatUSD(txn.usdAmount) }}</td>
              <td class="px-4 py-3 text-sm text-right text-gray-600">{{ txn.exchangeRate }}</td>
              <td class="px-4 py-3 text-sm text-right text-gray-900">{{ formatGHS(txn.ghsAmount) }}</td>
              <td class="px-4 py-3 text-sm text-right text-gray-500">{{ txn.marketRate || '-' }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ txn.customerName || '-' }}</td>
              <td class="px-4 py-3 text-sm text-right font-semibold" :class="(txn.profitGHS || 0) >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ formatGHS(txn.profitGHS || 0) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
