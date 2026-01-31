<script setup lang="ts">

const { data: transactions, refresh } = await useFetch('/api/finance/transactions');
const { toast } = useToast();

const showForm = ref(false);
const filter = ref('all');

const form = reactive({
  type: 'in' as 'in' | 'out',
  businessLine: 'appliance',
  description: '',
  amount: 0,
  currency: 'GHS',
  reference: '',
  notes: '',
});

const filtered = computed(() => {
  if (!transactions.value) return [];
  if (filter.value === 'all') return transactions.value;
  return transactions.value.filter((t: any) => t.businessLine === filter.value);
});

const formatGHS = (val: number) => `GHS ${(val || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function submit() {
  if (!form.description || !form.amount) return;
  await $fetch('/api/finance/transactions', { method: 'POST', body: form });
  toast({ title: 'Transaction recorded', type: 'success' });
  showForm.value = false;
  form.description = '';
  form.amount = 0;
  form.reference = '';
  form.notes = '';
  refresh();
}

async function remove(id: string) {
  if (!confirm('Delete this transaction?')) return;
  await $fetch(`/api/finance/transactions/${id}`, { method: 'DELETE' });
  toast({ title: 'Deleted', type: 'success' });
  refresh();
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">All Transactions</h1>
        <p class="text-sm text-gray-500 mt-1">Simple ins and outs across all business lines</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/finance" class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Icon name="lucide:arrow-left" class="h-4 w-4" /> Back
        </NuxtLink>
        <button @click="showForm = !showForm" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <Icon name="lucide:plus" class="h-4 w-4" /> Add Transaction
        </button>
      </div>
    </div>

    <!-- Form -->
    <div v-if="showForm" class="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <h3 class="font-semibold text-gray-900">New Transaction</h3>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select v-model="form.type" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="in">Money In</option>
            <option value="out">Money Out</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Business Line</label>
          <select v-model="form.businessLine" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="appliance">Appliance</option>
            <option value="cross_border">Cross-Border</option>
            <option value="forex">Forex</option>
            <option value="crypto">Crypto</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Amount (GHS)</label>
          <input v-model.number="form.amount" type="number" step="0.01" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div class="col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input v-model="form.description" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="What is this for?" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Reference</label>
          <input v-model="form.reference" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Invoice/receipt #" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea v-model="form.notes" rows="2" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Optional notes"></textarea>
      </div>
      <button @click="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
        Save Transaction
      </button>
    </div>

    <!-- Filter -->
    <div class="flex gap-2">
      <button v-for="f in [{v:'all',l:'All'},{v:'appliance',l:'Appliance'},{v:'cross_border',l:'Cross-Border'},{v:'forex',l:'Forex'},{v:'crypto',l:'Crypto'}]" :key="f.v" @click="filter = f.v"
        class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
        :class="filter === f.v ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
        {{ f.l }}
      </button>
    </div>

    <!-- Transactions List -->
    <div class="rounded-xl border border-gray-200 bg-white divide-y divide-gray-50">
      <div v-if="!filtered?.length" class="px-6 py-12 text-center text-gray-500">
        No transactions yet. Add your first one above.
      </div>
      <div v-for="txn in filtered" :key="txn.id" class="flex items-center justify-between px-6 py-3">
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-full" :class="txn.type === 'in' ? 'bg-green-50' : 'bg-red-50'">
            <Icon :name="txn.type === 'in' ? 'lucide:arrow-down-left' : 'lucide:arrow-up-right'" class="h-4 w-4" :class="txn.type === 'in' ? 'text-green-600' : 'text-red-600'" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900">{{ txn.description }}</p>
            <p class="text-xs text-gray-500">
              <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="{
                'bg-blue-50 text-blue-700': txn.businessLine === 'appliance',
                'bg-green-50 text-green-700': txn.businessLine === 'cross_border',
                'bg-yellow-50 text-yellow-700': txn.businessLine === 'forex',
                'bg-orange-50 text-orange-700': txn.businessLine === 'crypto',
              }">{{ txn.businessLine.replace('_', ' ') }}</span>
              <span class="ml-2" v-if="txn.reference">{{ txn.reference }}</span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <p class="text-sm font-semibold" :class="txn.type === 'in' ? 'text-green-600' : 'text-red-600'">
            {{ txn.type === 'in' ? '+' : '-' }}{{ formatGHS(txn.amount) }}
          </p>
          <button @click="remove(txn.id)" class="text-gray-400 hover:text-red-500">
            <Icon name="lucide:trash-2" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
