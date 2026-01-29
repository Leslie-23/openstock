<script setup lang="ts">
const route = useRoute();
const toast = useToast();

const { data: period, pending, refresh } = await useFetch(`/api/payroll/periods/${route.params.id}`);

function formatCurrency(amount: number | null) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount);
}

const totals = computed(() => {
  const runs = period.value?.payrollRuns || [];
  return {
    count: runs.length,
    gross: runs.reduce((sum: number, r: any) => sum + (r.grossPay || 0), 0),
    deductions: runs.reduce((sum: number, r: any) => sum + (r.taxAmount || 0) + (r.socialSecurity || 0) + (r.healthInsurance || 0) + (r.deductions || 0) + (r.otherDeductions || 0), 0),
    net: runs.reduce((sum: number, r: any) => sum + (r.netPay || 0), 0),
  };
});

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'badge-success',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

async function updateRunStatus(runId: string, status: string) {
  try {
    await $fetch(`/api/payroll/runs/${runId}`, { method: 'PUT', body: { status } });
    toast.success(`Payroll run ${status}`);
    refresh();
  } catch (error) {
    toast.error('Failed to update status');
  }
}

async function markAllPaid() {
  if (!confirm('Mark all payroll runs as paid?')) return;
  const runs = period.value?.payrollRuns || [];
  for (const run of runs) {
    if ((run as any).status !== 'paid') {
      await $fetch(`/api/payroll/runs/${(run as any).id}`, { method: 'PUT', body: { status: 'paid' } });
    }
  }
  toast.success('All runs marked as paid');
  refresh();
}
</script>

<template>
  <div v-if="pending" class="flex items-center justify-center py-20">
    <Icon name="lucide:loader-2" class="h-6 w-6 animate-spin text-gray-400" />
  </div>

  <div v-else-if="period" class="space-y-4">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/payroll" class="p-1.5 hover:bg-gray-100 rounded transition-colors">
          <Icon name="lucide:arrow-left" class="h-4 w-4 text-gray-500" />
        </NuxtLink>
        <div>
          <h1 class="text-lg font-semibold text-gray-900">{{ period.name }}</h1>
          <p class="text-xs text-gray-500 font-mono">{{ period.startDate }} &rarr; {{ period.endDate }}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <span :class="['badge', {
          'bg-gray-100 text-gray-700': period.status === 'draft',
          'bg-blue-100 text-blue-700': period.status === 'processing',
          'badge-success': period.status === 'completed',
          'bg-red-100 text-red-700': period.status === 'cancelled',
        }]">
          {{ period.status }}
        </span>
        <UiButton v-if="period.status === 'processing'" class="btn-primary text-xs" @click="markAllPaid">
          <Icon name="lucide:banknote" class="h-3.5 w-3.5" />
          Mark All Paid
        </UiButton>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid gap-3 md:grid-cols-4">
      <div class="card p-3">
        <p class="text-xs text-gray-500">Employees</p>
        <p class="text-lg font-semibold font-mono">{{ totals.count }}</p>
      </div>
      <div class="card p-3">
        <p class="text-xs text-gray-500">Total Gross</p>
        <p class="text-lg font-semibold font-mono">{{ formatCurrency(totals.gross) }}</p>
      </div>
      <div class="card p-3">
        <p class="text-xs text-gray-500">Total Deductions</p>
        <p class="text-lg font-semibold font-mono text-red-600">-{{ formatCurrency(totals.deductions) }}</p>
      </div>
      <div class="card p-3">
        <p class="text-xs text-gray-500">Total Net Pay</p>
        <p class="text-lg font-semibold font-mono text-green-700">{{ formatCurrency(totals.net) }}</p>
      </div>
    </div>

    <!-- Payroll Runs Table -->
    <div class="card overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50/50">
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Employee</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Department</th>
            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Base Salary</th>
            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Bonuses</th>
            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Gross</th>
            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Tax</th>
            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Social</th>
            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Health</th>
            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Net Pay</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!period.payrollRuns?.length">
            <td colspan="11" class="px-4 py-8 text-center text-xs text-gray-500">No payroll runs generated yet</td>
          </tr>
          <tr v-for="run in period.payrollRuns" :key="run.id" class="border-b border-gray-50 hover:bg-gray-50/50">
            <td class="px-4 py-2">
              <NuxtLink :to="`/employees/${run.employee?.id}`" class="text-xs font-medium text-gray-900 hover:text-primary-600">
                {{ run.employee?.firstName }} {{ run.employee?.lastName }}
              </NuxtLink>
            </td>
            <td class="px-4 py-2 text-xs text-gray-500">{{ run.employee?.department?.name || '—' }}</td>
            <td class="px-4 py-2 text-xs font-mono text-right">{{ formatCurrency(run.baseSalary) }}</td>
            <td class="px-4 py-2 text-xs font-mono text-right">{{ formatCurrency(run.bonuses) }}</td>
            <td class="px-4 py-2 text-xs font-mono text-right font-medium">{{ formatCurrency(run.grossPay) }}</td>
            <td class="px-4 py-2 text-xs font-mono text-right text-red-500">-{{ formatCurrency(run.taxAmount) }}</td>
            <td class="px-4 py-2 text-xs font-mono text-right text-red-500">-{{ formatCurrency(run.socialSecurity) }}</td>
            <td class="px-4 py-2 text-xs font-mono text-right text-red-500">-{{ formatCurrency(run.healthInsurance) }}</td>
            <td class="px-4 py-2 text-xs font-mono text-right font-semibold text-green-700">{{ formatCurrency(run.netPay) }}</td>
            <td class="px-4 py-2">
              <span :class="['badge text-xs', statusColors[run.status] || 'badge']">
                {{ run.status }}
              </span>
            </td>
            <td class="px-4 py-2 text-right">
              <div class="flex gap-1 justify-end">
                <button
                  v-if="run.status === 'pending'"
                  class="p-1 text-green-500 hover:text-green-700 hover:bg-green-50 rounded"
                  @click="updateRunStatus(run.id, 'approved')"
                  title="Approve"
                >
                  <Icon name="lucide:check" class="h-3.5 w-3.5" />
                </button>
                <button
                  v-if="run.status === 'approved'"
                  class="p-1 text-primary-500 hover:text-primary-700 hover:bg-primary-50 rounded"
                  @click="updateRunStatus(run.id, 'paid')"
                  title="Mark paid"
                >
                  <Icon name="lucide:banknote" class="h-3.5 w-3.5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
