<script setup lang="ts">
const toast = useToast();
const { data: accounts, refresh } = await useFetch('/api/accounting/accounts');

const isModalOpen = ref(false);
const isSubmitting = ref(false);
const editing = ref(false);

const form = reactive({
  id: '',
  code: '',
  name: '',
  accountType: 'asset' as string,
  accountSubType: '' as string,
  parentId: '' as string,
  description: '',
  normalBalance: 'debit' as string,
});

const accountTypes = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expense' },
];

const subTypes: Record<string, { value: string; label: string }[]> = {
  asset: [
    { value: 'cash', label: 'Cash' },
    { value: 'bank', label: 'Bank' },
    { value: 'receivable', label: 'Receivable' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'other_current_asset', label: 'Other Current Asset' },
    { value: 'fixed_asset', label: 'Fixed Asset' },
  ],
  liability: [
    { value: 'payable', label: 'Payable' },
    { value: 'tax_payable', label: 'Tax Payable' },
    { value: 'other_current_liability', label: 'Other Current Liability' },
    { value: 'long_term_liability', label: 'Long Term Liability' },
  ],
  equity: [
    { value: 'owners_equity', label: "Owner's Equity" },
    { value: 'retained_earnings', label: 'Retained Earnings' },
  ],
  revenue: [
    { value: 'sales', label: 'Sales' },
    { value: 'other_income', label: 'Other Income' },
  ],
  expense: [
    { value: 'cogs', label: 'Cost of Goods Sold' },
    { value: 'operating_expense', label: 'Operating Expense' },
  ],
};

const typeColors: Record<string, string> = {
  asset: 'bg-blue-100 text-blue-700',
  liability: 'bg-red-100 text-red-700',
  equity: 'bg-purple-100 text-purple-700',
  revenue: 'bg-green-100 text-green-700',
  expense: 'bg-orange-100 text-orange-700',
};

watch(() => form.accountType, (newType) => {
  form.normalBalance = ['asset', 'expense'].includes(newType) ? 'debit' : 'credit';
  form.accountSubType = '';
});

const groupedAccounts = computed(() => {
  if (!accounts.value) return {};
  const groups: Record<string, any[]> = {
    asset: [], liability: [], equity: [], revenue: [], expense: [],
  };
  for (const acct of accounts.value as any[]) {
    if (groups[acct.accountType]) {
      groups[acct.accountType].push(acct);
    }
  }
  return groups;
});

const groupLabels: Record<string, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
};

function resetForm() {
  Object.assign(form, {
    id: '', code: '', name: '', accountType: 'asset',
    accountSubType: '', parentId: '', description: '', normalBalance: 'debit',
  });
}

function openCreateModal() {
  resetForm();
  editing.value = false;
  isModalOpen.value = true;
}

function openEditModal(acct: any) {
  Object.assign(form, {
    id: acct.id,
    code: acct.code,
    name: acct.name,
    accountType: acct.accountType,
    accountSubType: acct.accountSubType || '',
    parentId: acct.parentId || '',
    description: acct.description || '',
    normalBalance: acct.normalBalance,
  });
  editing.value = true;
  isModalOpen.value = true;
}

async function saveAccount() {
  if (!form.code.trim() || !form.name.trim()) {
    toast.error('Validation', 'Code and name are required');
    return;
  }
  isSubmitting.value = true;
  try {
    if (editing.value) {
      await $fetch(`/api/accounting/accounts/${form.id}`, {
        method: 'PUT',
        body: { name: form.name, description: form.description, accountSubType: form.accountSubType || null, parentId: form.parentId || null },
      });
      toast.success('Account updated');
    } else {
      await $fetch('/api/accounting/accounts', {
        method: 'POST',
        body: {
          code: form.code, name: form.name, accountType: form.accountType,
          accountSubType: form.accountSubType || null, parentId: form.parentId || null,
          description: form.description || null, normalBalance: form.normalBalance,
        },
      });
      toast.success('Account created');
    }
    isModalOpen.value = false;
    await refresh();
  } catch (e: any) {
    toast.error('Error', e.data?.message || 'Failed to save account');
  } finally {
    isSubmitting.value = false;
  }
}

async function deleteAccount(id: string) {
  if (!confirm('Are you sure you want to delete this account?')) return;
  try {
    await $fetch(`/api/accounting/accounts/${id}`, { method: 'DELETE' });
    toast.success('Account deleted');
    await refresh();
  } catch (e: any) {
    toast.error('Error', e.data?.message || 'Failed to delete account');
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between border-b border-gray-200 pb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Chart of Accounts</h1>
        <p class="mt-1 text-sm text-gray-500">Manage your accounting structure</p>
      </div>
      <UiButton @click="openCreateModal">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        New Account
      </UiButton>
    </div>

    <!-- Accounts by Type -->
    <div v-for="(typeAccounts, type) in groupedAccounts" :key="type" class="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div class="border-b border-gray-100 bg-gray-50/50 px-6 py-3 flex items-center justify-between">
        <h2 class="text-xs font-bold text-gray-700 uppercase tracking-wider">{{ groupLabels[type] }}</h2>
        <span class="text-xs text-gray-400">{{ typeAccounts.length }} accounts</span>
      </div>
      <div class="divide-y divide-gray-50">
        <div v-for="acct in typeAccounts" :key="acct.id" class="flex items-center justify-between px-6 py-3 hover:bg-gray-50 group">
          <div class="flex items-center gap-4">
            <span class="text-sm font-mono font-medium text-gray-500 w-14">{{ acct.code }}</span>
            <div>
              <p class="text-sm font-medium text-gray-900">{{ acct.name }}</p>
              <p v-if="acct.description" class="text-xs text-gray-400">{{ acct.description }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs px-2 py-0.5 rounded-full" :class="typeColors[acct.accountType]">
              {{ acct.normalBalance }}
            </span>
            <span v-if="acct.isSystemAccount" class="text-xs text-gray-400">
              <Icon name="lucide:lock" class="h-3 w-3" />
            </span>
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click="openEditModal(acct)" class="p-1 text-gray-400 hover:text-gray-600">
                <Icon name="lucide:pencil" class="h-4 w-4" />
              </button>
              <button v-if="!acct.isSystemAccount" @click="deleteAccount(acct.id)" class="p-1 text-gray-400 hover:text-red-600">
                <Icon name="lucide:trash-2" class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div v-if="typeAccounts.length === 0" class="px-6 py-4 text-center text-sm text-gray-400">
          No accounts in this category
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <UiModal v-model:open="isModalOpen" :title="editing ? 'Edit Account' : 'New Account'" size="md">
      <form id="account-form" class="space-y-4" @submit.prevent="saveAccount">
        <div class="grid grid-cols-2 gap-4">
          <UiInput v-model="form.code" label="Code" placeholder="e.g. 1050" :disabled="editing" />
          <UiInput v-model="form.name" label="Name" placeholder="e.g. Petty Cash" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
            <select v-model="form.accountType" :disabled="editing" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option v-for="t in accountTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Sub-Type</label>
            <select v-model="form.accountSubType" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">None</option>
              <option v-for="st in (subTypes[form.accountType] || [])" :key="st.value" :value="st.value">{{ st.label }}</option>
            </select>
          </div>
        </div>
        <UiInput v-model="form.description" label="Description" placeholder="Optional description" />
      </form>
      <template #footer>
        <UiButton variant="secondary" @click="isModalOpen = false">Cancel</UiButton>
        <UiButton type="submit" form="account-form" :loading="isSubmitting">
          {{ editing ? 'Update' : 'Create' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
