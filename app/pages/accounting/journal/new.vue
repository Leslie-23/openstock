<script setup lang="ts">
const router = useRouter();
const toast = useToast();

const { data: accounts } = await useFetch('/api/accounting/accounts');

const form = reactive({
  date: new Date().toISOString().split('T')[0],
  description: '',
  reference: '',
  notes: '',
});

interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
  description: string;
}

const lines = ref<JournalLine[]>([
  { accountId: '', debit: 0, credit: 0, description: '' },
  { accountId: '', debit: 0, credit: 0, description: '' },
]);

const totalDebit = computed(() =>
  Math.round(lines.value.reduce((s, l) => s + (l.debit || 0), 0) * 100) / 100
);

const totalCredit = computed(() =>
  Math.round(lines.value.reduce((s, l) => s + (l.credit || 0), 0) * 100) / 100
);

const isBalanced = computed(() => Math.abs(totalDebit.value - totalCredit.value) < 0.01);
const difference = computed(() => Math.round((totalDebit.value - totalCredit.value) * 100) / 100);

function addLine() {
  lines.value.push({ accountId: '', debit: 0, credit: 0, description: '' });
}

function removeLine(index: number) {
  if (lines.value.length <= 2) return;
  lines.value.splice(index, 1);
}

function getAccountName(id: string) {
  const acct = (accounts.value as any[])?.find((a) => a.id === id);
  return acct ? `${acct.code} - ${acct.name}` : '';
}

const isSubmitting = ref(false);

async function save(postImmediately: boolean) {
  if (!form.date || !form.description.trim()) {
    toast.error('Validation', 'Date and description are required');
    return;
  }

  const validLines = lines.value.filter((l) => l.accountId && (l.debit > 0 || l.credit > 0));
  if (validLines.length < 2) {
    toast.error('Validation', 'At least 2 lines with accounts and amounts are required');
    return;
  }

  if (!isBalanced.value) {
    toast.error('Validation', `Entry is not balanced. Difference: ${difference.value}`);
    return;
  }

  isSubmitting.value = true;
  try {
    const result = await $fetch('/api/accounting/journal-entries', {
      method: 'POST',
      body: {
        date: form.date,
        description: form.description,
        reference: form.reference || null,
        referenceType: 'manual',
        lines: validLines,
        status: postImmediately ? 'posted' : 'draft',
      },
    });
    toast.success('Journal entry created', `${(result as any).entryNumber}`);
    router.push(`/accounting/journal/${(result as any).id}`);
  } catch (e: any) {
    toast.error('Error', e.data?.message || 'Failed to create entry');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4 border-b border-gray-200 pb-4">
      <NuxtLink to="/accounting/journal" class="text-gray-400 hover:text-gray-600">
        <Icon name="lucide:arrow-left" class="h-5 w-5" />
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">New Journal Entry</h1>
        <p class="mt-1 text-sm text-gray-500">Create a manual double-entry journal entry</p>
      </div>
    </div>

    <!-- Header Fields -->
    <div class="rounded-xl border border-gray-200 bg-white p-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UiInput v-model="form.date" label="Date" type="date" />
        <div class="md:col-span-2">
          <UiInput v-model="form.description" label="Description" placeholder="e.g. Monthly rent payment" />
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <UiInput v-model="form.reference" label="Reference" placeholder="Optional reference number" />
        <UiInput v-model="form.notes" label="Notes" placeholder="Optional notes" />
      </div>
    </div>

    <!-- Lines -->
    <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div class="border-b border-gray-100 bg-gray-50/50 px-6 py-3 flex items-center justify-between">
        <h2 class="text-xs font-bold text-gray-700 uppercase tracking-wider">Entry Lines</h2>
        <button @click="addLine" class="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
          <Icon name="lucide:plus" class="h-4 w-4" />
          Add Line
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 w-[40%]">Account</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 w-32">Debit</th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 w-32">Credit</th>
              <th class="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="(line, i) in lines" :key="i">
              <td class="px-4 py-2">
                <select v-model="line.accountId" class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="">Select account...</option>
                  <option v-for="acct in (accounts as any[])" :key="acct.id" :value="acct.id">
                    {{ acct.code }} - {{ acct.name }}
                  </option>
                </select>
              </td>
              <td class="px-4 py-2">
                <input v-model="line.description" type="text" placeholder="Line memo" class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
              </td>
              <td class="px-4 py-2">
                <input v-model.number="line.debit" type="number" step="0.01" min="0" class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-right" @focus="line.debit === 0 ? (line.debit = null) : undefined" />
              </td>
              <td class="px-4 py-2">
                <input v-model.number="line.credit" type="number" step="0.01" min="0" class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-right" @focus="line.credit === 0 ? (line.credit = null) : undefined" />
              </td>
              <td class="px-4 py-2">
                <button v-if="lines.length > 2" @click="removeLine(i)" class="text-gray-400 hover:text-red-500">
                  <Icon name="lucide:x" class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-200 font-semibold">
              <td class="px-4 py-3 text-sm text-gray-900" colspan="2">Totals</td>
              <td class="px-4 py-3 text-sm text-right text-gray-900">{{ totalDebit.toFixed(2) }}</td>
              <td class="px-4 py-3 text-sm text-right text-gray-900">{{ totalCredit.toFixed(2) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Balance indicator -->
      <div class="border-t border-gray-100 px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="h-2 w-2 rounded-full" :class="isBalanced ? 'bg-green-500' : 'bg-red-500'"></div>
          <span class="text-sm" :class="isBalanced ? 'text-green-600' : 'text-red-600'">
            {{ isBalanced ? 'Balanced' : `Out of balance by ${Math.abs(difference).toFixed(2)}` }}
          </span>
        </div>
        <div class="flex gap-3">
          <UiButton variant="secondary" :loading="isSubmitting" @click="save(false)">
            Save as Draft
          </UiButton>
          <UiButton :loading="isSubmitting" :disabled="!isBalanced" @click="save(true)">
            Post Entry
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>
