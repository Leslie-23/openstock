<script setup lang="ts">
const toast = useToast();

const { data: periods, pending, refresh } = await useFetch('/api/payroll/periods');

const isModalOpen = ref(false);
const isGenerating = ref(false);
const isSubmitting = ref(false);

const form = reactive({
  name: '',
  startDate: '',
  endDate: '',
  notes: '',
});

const columns = [
  { key: 'period', label: 'Period' },
  { key: 'dates', label: 'Date Range' },
  { key: 'employees', label: 'Employees' },
  { key: 'totalGross', label: 'Total Gross' },
  { key: 'totalNet', label: 'Total Net' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', class: 'w-40' },
];

const statusColors: Record<string, string> = {
  draft: 'badge-neutral',
  processing: 'badge-info',
  completed: 'badge-success',
  cancelled: 'badge-danger',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount);
}

function getTotals(period: any) {
  const runs = period.payrollRuns || [];
  return {
    count: runs.length,
    gross: runs.reduce((sum: number, r: any) => sum + (r.grossPay || 0), 0),
    net: runs.reduce((sum: number, r: any) => sum + (r.netPay || 0), 0),
  };
}

function openCreateModal() {
  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  Object.assign(form, {
    name: `Payroll - ${monthName}`,
    startDate: firstDay,
    endDate: lastDay,
    notes: '',
  });
  isModalOpen.value = true;
}

async function createPeriod() {
  if (!form.name.trim() || !form.startDate || !form.endDate) {
    toast.warning('Please fill all required fields');
    return;
  }
  isSubmitting.value = true;
  try {
    await $fetch('/api/payroll/periods', { method: 'POST', body: form });
    toast.success('Payroll period created');
    isModalOpen.value = false;
    refresh();
  } catch (error) {
    toast.error('Failed to create period');
  } finally {
    isSubmitting.value = false;
  }
}

async function generatePayroll(periodId: string) {
  if (!confirm('Generate payroll for all active employees?')) return;
  isGenerating.value = true;
  try {
    const result = await $fetch('/api/payroll/generate', {
      method: 'POST',
      body: { payrollPeriodId: periodId },
    });
    toast.success(`Generated payroll for ${(result as any).generated} employees`);
    refresh();
  } catch (error) {
    toast.error('Failed to generate payroll');
  } finally {
    isGenerating.value = false;
  }
}

async function updatePeriodStatus(periodId: string, status: string) {
  try {
    await $fetch(`/api/payroll/periods/${periodId}`, {
      method: 'PUT',
      body: { status },
    });
    toast.success(`Period marked as ${status}`);
    refresh();
  } catch (error) {
    toast.error('Failed to update period');
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold text-gray-900">Payroll</h1>
        <p class="text-xs text-gray-500">Manage employee payroll periods and runs</p>
      </div>
      <UiButton class="btn-primary" @click="openCreateModal">
        <Icon name="lucide:plus" class="h-3.5 w-3.5" />
        New Period
      </UiButton>
    </div>

    <div class="card overflow-hidden">
      <UiDataTable
        :columns="columns"
        :data="periods || []"
        :loading="pending"
        empty-title="No payroll periods"
        empty-description="Create a payroll period to get started."
        empty-icon="lucide:wallet"
        hoverable
      >
        <template #period="{ item }">
          <NuxtLink :to="`/payroll/${item.id}`" class="text-xs font-medium text-gray-900 hover:text-primary-600">
            {{ item.name }}
          </NuxtLink>
        </template>

        <template #dates="{ item }">
          <span class="text-xs font-mono text-gray-600">{{ item.startDate }} &rarr; {{ item.endDate }}</span>
        </template>

        <template #employees="{ item }">
          <span class="text-xs font-mono">{{ getTotals(item).count }}</span>
        </template>

        <template #totalGross="{ item }">
          <span class="text-xs font-mono">{{ formatCurrency(getTotals(item).gross) }}</span>
        </template>

        <template #totalNet="{ item }">
          <span class="text-xs font-mono font-semibold text-green-700">{{ formatCurrency(getTotals(item).net) }}</span>
        </template>

        <template #status="{ item }">
          <span :class="['badge text-xs', statusColors[item.status] || 'badge']">
            {{ item.status }}
          </span>
        </template>

        <template #actions="{ item }">
          <div class="flex gap-1 justify-end">
            <NuxtLink
              :to="`/payroll/${item.id}`"
              class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="View details"
            >
              <Icon name="lucide:eye" class="h-3.5 w-3.5" />
            </NuxtLink>
            <button
              v-if="item.status === 'draft'"
              class="p-1.5 text-primary-500 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
              :disabled="isGenerating"
              @click="generatePayroll(item.id)"
              title="Generate payroll"
            >
              <Icon name="lucide:play" class="h-3.5 w-3.5" />
            </button>
            <button
              v-if="item.status === 'processing'"
              class="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
              @click="updatePeriodStatus(item.id, 'completed')"
              title="Mark completed"
            >
              <Icon name="lucide:check-circle" class="h-3.5 w-3.5" />
            </button>
          </div>
        </template>
      </UiDataTable>
    </div>

    <UiModal v-model:open="isModalOpen" title="New Payroll Period" size="md">
      <form id="period-form" class="space-y-4" @submit.prevent="createPeriod">
        <div>
          <label class="label">Period Name <span class="text-red-500">*</span></label>
          <UiInput v-model="form.name" placeholder="e.g. Payroll - January 2026" autofocus />
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="label">Start Date <span class="text-red-500">*</span></label>
            <UiInput v-model="form.startDate" type="date" />
          </div>
          <div>
            <label class="label">End Date <span class="text-red-500">*</span></label>
            <UiInput v-model="form.endDate" type="date" />
          </div>
        </div>
        <div>
          <label class="label">Notes</label>
          <textarea v-model="form.notes" class="input min-h-[50px] resize-none" placeholder="Notes..." />
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn-secondary" :disabled="isSubmitting" @click="isModalOpen = false">Cancel</button>
        <button type="submit" form="period-form" class="btn-primary" :disabled="isSubmitting">
          <Icon v-if="isSubmitting" name="lucide:loader-2" class="h-3.5 w-3.5 animate-spin" />
          Create
        </button>
      </template>
    </UiModal>
  </div>
</template>
