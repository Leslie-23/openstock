<script setup lang="ts">

const { data: transactions, refresh } = await useFetch('/api/finance/crypto');
const { toast } = useToast();

const showForm = ref(false);

const form = reactive({
  type: 'buy' as 'buy' | 'sell',
  coin: 'BTC',
  coinAmount: 0,
  unitPrice: 0,
  totalGHS: 0,
  buyPricePerUnit: 0,
  profitGHS: 0,
  customerName: '',
  reference: '',
  notes: '',
});

// Auto-calculate total
watch([() => form.coinAmount, () => form.unitPrice], () => {
  if (form.coinAmount && form.unitPrice) {
    form.totalGHS = parseFloat((form.coinAmount * form.unitPrice).toFixed(2));
  }
});

// Auto-calculate profit on sell
watch([() => form.totalGHS, () => form.buyPricePerUnit, () => form.coinAmount, () => form.type], () => {
  if (form.type === 'sell' && form.buyPricePerUnit && form.coinAmount) {
    const costBasis = form.buyPricePerUnit * form.coinAmount;
    form.profitGHS = parseFloat((form.totalGHS - costBasis).toFixed(2));
  } else {
    form.profitGHS = 0;
  }
});

const formatGHS = (val: number) => `GHS ${(val || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function submit() {
  if (!form.coinAmount || !form.unitPrice) return;
  await $fetch('/api/finance/crypto', { method: 'POST', body: form });
  toast({ title: 'Crypto trade recorded', type: 'success' });
  showForm.value = false;
  form.coinAmount = 0;
  form.unitPrice = 0;
  form.totalGHS = 0;
  form.buyPricePerUnit = 0;
  form.profitGHS = 0;
  form.customerName = '';
  form.reference = '';
  form.notes = '';
  refresh();
}

const totalProfit = computed(() => (transactions.value || []).reduce((sum: number, t: any) => sum + (t.profitGHS || 0), 0));
const totalVolume = computed(() => (transactions.value || []).reduce((sum: number, t: any) => sum + t.totalGHS, 0));

const coins = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP'];
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Crypto Trading</h1>
        <p class="text-sm text-gray-500 mt-1">Buy and sell BTC and other crypto</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/finance" class="btn-secondary">
          <Icon name="lucide:arrow-left" class="h-4 w-4" /> Back
        </NuxtLink>
        <button @click="showForm = !showForm" class="btn-primary">
          <Icon name="lucide:plus" class="h-4 w-4" /> New Trade
        </button>
      </div>
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <p class="text-xs font-medium text-gray-500 uppercase">Total Trades</p>
        <p class="mt-2 text-2xl font-bold text-gray-900">{{ transactions?.length || 0 }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <p class="text-xs font-medium text-gray-500 uppercase">Total Volume</p>
        <p class="mt-2 text-2xl font-bold text-gray-900">{{ formatGHS(totalVolume) }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <p class="text-xs font-medium text-gray-500 uppercase">Total Profit</p>
        <p class="mt-2 text-2xl font-bold" :class="totalProfit >= 0 ? 'text-green-600' : 'text-red-600'">{{ formatGHS(totalProfit) }}</p>
      </div>
    </div>

    <!-- Form -->
    <div v-if="showForm" class="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <h3 class="font-semibold text-gray-900">New Crypto Trade</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select v-model="form.type" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Coin</label>
          <select v-model="form.coin" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option v-for="c in coins" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Amount ({{ form.coin }})</label>
          <input v-model.number="form.coinAmount" type="number" step="0.00000001" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Price per {{ form.coin }} (GHS)</label>
          <input v-model.number="form.unitPrice" type="number" step="0.01" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Total GHS</label>
          <input v-model.number="form.totalGHS" type="number" step="0.01" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50" />
        </div>
        <div v-if="form.type === 'sell'">
          <label class="block text-sm font-medium text-gray-700 mb-1">Buy Price (cost basis per unit)</label>
          <input v-model.number="form.buyPricePerUnit" type="number" step="0.01" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="What you paid per coin" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Customer</label>
          <input v-model="form.customerName" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div class="flex items-end" v-if="form.type === 'sell'">
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
      <button @click="submit" class="btn-primary">
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
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coin</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total GHS</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="!transactions?.length">
              <td colspan="7" class="px-4 py-12 text-center text-gray-500">No crypto trades yet</td>
            </tr>
            <tr v-for="txn in transactions" :key="txn.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <span class="badge" :class="txn.type === 'buy' ? 'badge-info' : 'badge-success'">
                  {{ txn.type === 'buy' ? 'BUY' : 'SELL' }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ txn.coin }}</td>
              <td class="px-4 py-3 text-sm text-right text-gray-900">{{ txn.coinAmount }}</td>
              <td class="px-4 py-3 text-sm text-right text-gray-600">{{ formatGHS(txn.unitPrice) }}</td>
              <td class="px-4 py-3 text-sm text-right text-gray-900">{{ formatGHS(txn.totalGHS) }}</td>
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
