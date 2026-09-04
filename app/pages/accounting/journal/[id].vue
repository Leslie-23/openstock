<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const toast = useToast();
const id = route.params.id as string;

const { data: entry, refresh } = await useFetch(`/api/accounting/journal-entries/${id}`);

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-700',
  posted: 'bg-green-100 text-green-700',
  voided: 'bg-red-100 text-red-700',
};

const isActioning = ref(false);

function formatAmount(n: number) {
  return (n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const totalDebit = computed(() =>
  (entry.value as any)?.lines?.reduce((s: number, l: any) => s + (l.debit || 0), 0) || 0
);

const totalCredit = computed(() =>
  (entry.value as any)?.lines?.reduce((s: number, l: any) => s + (l.credit || 0), 0) || 0
);

async function postEntry() {
  isActioning.value = true;
  try {
    await $fetch(`/api/accounting/journal-entries/${id}/post`, { method: 'POST' });
    toast.success('Entry posted');
    await refresh();
  } catch (e: any) {
    toast.error('Error', e.data?.message || 'Failed to post');
  } finally {
    isActioning.value = false;
  }
}

async function voidEntry() {
  if (!confirm('Are you sure you want to void this entry? A reversing entry will be created.')) return;
  isActioning.value = true;
  try {
    await $fetch(`/api/accounting/journal-entries/${id}/void`, { method: 'POST' });
    toast.success('Entry voided', 'A reversing entry has been created');
    await refresh();
  } catch (e: any) {
    toast.error('Error', e.data?.message || 'Failed to void');
  } finally {
    isActioning.value = false;
  }
}
</script>

<template>
  <div class="space-y-6" v-if="entry">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200 pb-4">
      <div class="flex items-center gap-4">
        <NuxtLink to="/accounting/journal" class="text-gray-400 hover:text-gray-600">
          <Icon name="lucide:arrow-left" class="h-5 w-5" />
        </NuxtLink>
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-semibold tracking-tight text-gray-900">{{ (entry as any).entryNumber }}</h1>
            <span class="text-xs px-2 py-0.5 rounded-full" :class="statusColors[(entry as any).status]">
              {{ (entry as any).status }}
            </span>
          </div>
          <p class="mt-1 text-sm text-gray-500">{{ (entry as any).description }}</p>
        </div>
      </div>
      <div class="flex gap-3">
        <UiButton v-if="(entry as any).status === 'draft'" variant="primary" :loading="isActioning" @click="postEntry">
          <Icon name="lucide:check" class="mr-2 h-4 w-4" />
          Post Entry
        </UiButton>
        <UiButton v-if="(entry as any).status === 'posted'" variant="destructive" :loading="isActioning" @click="voidEntry">
          <Icon name="lucide:ban" class="mr-2 h-4 w-4" />
          Void Entry
        </UiButton>
      </div>
    </div>

    <!-- Entry Details -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="rounded-xl border border-gray-200 bg-white p-4">
        <p class="text-xs text-gray-500">Date</p>
        <p class="text-sm font-medium text-gray-900 mt-1">{{ (entry as any).date }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-4">
        <p class="text-xs text-gray-500">Reference</p>
        <p class="text-sm font-medium text-gray-900 mt-1">{{ (entry as any).reference || '-' }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-4">
        <p class="text-xs text-gray-500">Type</p>
        <p class="text-sm font-medium text-gray-900 mt-1">{{ (entry as any).referenceType || 'manual' }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-4">
        <p class="text-xs text-gray-500">Total</p>
        <p class="text-sm font-bold text-gray-900 mt-1">GHS {{ formatAmount(totalDebit) }}</p>
      </div>
    </div>

    <!-- Lines Table -->
    <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div class="border-b border-gray-100 bg-gray-50/50 px-6 py-3">
        <h2 class="text-xs font-bold text-gray-700 uppercase tracking-wider">Entry Lines</h2>
      </div>
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-100">
            <th class="px-6 py-2 text-left text-xs font-medium text-gray-500">Account</th>
            <th class="px-6 py-2 text-left text-xs font-medium text-gray-500">Description</th>
            <th class="px-6 py-2 text-right text-xs font-medium text-gray-500">Debit</th>
            <th class="px-6 py-2 text-right text-xs font-medium text-gray-500">Credit</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="line in (entry as any).lines" :key="line.id">
            <td class="px-6 py-3">
              <span class="text-sm font-medium text-gray-900">{{ line.account?.code }} - {{ line.account?.name }}</span>
            </td>
            <td class="px-6 py-3 text-sm text-gray-500">{{ line.description || '-' }}</td>
            <td class="px-6 py-3 text-sm text-right font-medium" :class="line.debit > 0 ? 'text-gray-900' : 'text-gray-300'">
              {{ formatAmount(line.debit) }}
            </td>
            <td class="px-6 py-3 text-sm text-right font-medium" :class="line.credit > 0 ? 'text-gray-900' : 'text-gray-300'">
              {{ formatAmount(line.credit) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="border-t-2 border-gray-200 font-bold">
            <td class="px-6 py-3 text-sm" colspan="2">Totals</td>
            <td class="px-6 py-3 text-sm text-right">{{ formatAmount(totalDebit) }}</td>
            <td class="px-6 py-3 text-sm text-right">{{ formatAmount(totalCredit) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Notes -->
    <div v-if="(entry as any).notes" class="rounded-xl border border-gray-200 bg-white p-6">
      <h3 class="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Notes</h3>
      <p class="text-sm text-gray-600">{{ (entry as any).notes }}</p>
    </div>
  </div>
</template>
