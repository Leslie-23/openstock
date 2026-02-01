<script setup lang="ts">
const toast = useToast();

const { data: leaveRequests, pending, refresh } = await useFetch('/api/leave-requests');
const { data: employees } = await useFetch('/api/employees');
const { data: leaveTypes, refresh: refreshTypes } = await useFetch('/api/leave-types');

const isRequestModalOpen = ref(false);
const isTypeModalOpen = ref(false);
const isSubmitting = ref(false);
const statusFilter = ref('all');

const requestForm = reactive({
  employeeId: '',
  leaveTypeId: '',
  startDate: '',
  endDate: '',
  totalDays: 1,
  reason: '',
});

const typeForm = reactive({
  name: '',
  description: '',
  defaultDays: 0,
  isPaid: true,
  color: '#6B7280',
});

const columns = [
  { key: 'employee', label: 'Employee' },
  { key: 'type', label: 'Leave Type' },
  { key: 'period', label: 'Period' },
  { key: 'days', label: 'Days' },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', class: 'w-32' },
];

const filteredRequests = computed(() => {
  if (statusFilter.value === 'all') return leaveRequests.value || [];
  return (leaveRequests.value || []).filter((r: any) => r.status === statusFilter.value);
});

const pendingCount = computed(() => (leaveRequests.value || []).filter((r: any) => r.status === 'pending').length);

// Auto-calculate days
watch(() => [requestForm.startDate, requestForm.endDate], () => {
  if (requestForm.startDate && requestForm.endDate) {
    const start = new Date(requestForm.startDate);
    const end = new Date(requestForm.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    requestForm.totalDays = Math.max(1, diff);
  }
});

function openRequestModal() {
  Object.assign(requestForm, {
    employeeId: '', leaveTypeId: '', startDate: '', endDate: '', totalDays: 1, reason: '',
  });
  isRequestModalOpen.value = true;
}

function openTypeModal() {
  Object.assign(typeForm, { name: '', description: '', defaultDays: 0, isPaid: true, color: '#6B7280' });
  isTypeModalOpen.value = true;
}

async function submitRequest() {
  if (!requestForm.employeeId || !requestForm.leaveTypeId || !requestForm.startDate || !requestForm.endDate) {
    toast.warning('Please fill all required fields');
    return;
  }
  isSubmitting.value = true;
  try {
    await $fetch('/api/leave-requests', { method: 'POST', body: requestForm });
    toast.success('Leave request submitted');
    isRequestModalOpen.value = false;
    refresh();
  } catch (error) {
    console.error('Failed to submit leave request:', error);
    toast.error('Failed to submit request');
  } finally {
    isSubmitting.value = false;
  }
}

async function saveLeaveType() {
  if (!typeForm.name.trim()) {
    toast.warning('Please enter a name');
    return;
  }
  isSubmitting.value = true;
  try {
    await $fetch('/api/leave-types', { method: 'POST', body: typeForm });
    toast.success('Leave type created');
    isTypeModalOpen.value = false;
    refreshTypes();
  } catch (error) {
    toast.error('Failed to save leave type');
  } finally {
    isSubmitting.value = false;
  }
}

async function updateRequestStatus(id: string, status: string) {
  try {
    await $fetch(`/api/leave-requests/${id}`, { method: 'PUT', body: { status } });
    toast.success(`Request ${status}`);
    refresh();
  } catch (error) {
    toast.error('Failed to update request');
  }
}

const activeEmployees = computed(() =>
  (employees.value || []).filter((e: any) => e.status === 'active')
);
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold text-gray-900">Leave Management</h1>
        <p class="text-xs text-gray-500">Manage employee leave requests</p>
      </div>
      <div class="flex gap-2">
        <UiButton class="btn-secondary" @click="openTypeModal">
          <Icon name="lucide:tag" class="h-3.5 w-3.5" />
          Leave Types
        </UiButton>
        <UiButton class="btn-primary" @click="openRequestModal">
          <Icon name="lucide:plus" class="h-3.5 w-3.5" />
          New Request
        </UiButton>
      </div>
    </div>

    <div class="flex gap-3 flex-wrap items-center">
      <div v-if="pendingCount > 0" class="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-1.5">
        <Icon name="lucide:clock" class="h-3.5 w-3.5 text-amber-600" />
        <span class="text-xs">
          <span class="font-medium font-mono text-amber-700">{{ pendingCount }}</span>
          <span class="text-amber-600"> pending</span>
        </span>
      </div>
      <select v-model="statusFilter" class="input text-xs w-36">
        <option value="all">All statuses</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    <!-- Leave Types display -->
    <div v-if="leaveTypes?.length" class="flex gap-2 flex-wrap">
      <div
        v-for="lt in leaveTypes"
        :key="lt.id"
        class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border"
        :style="{ borderColor: lt.color + '40', backgroundColor: lt.color + '10', color: lt.color }"
      >
        <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: lt.color }" />
        {{ lt.name }}
        <span class="text-gray-400 ml-1">{{ lt.defaultDays }}d</span>
      </div>
    </div>

    <div class="card overflow-hidden">
      <UiDataTable
        :columns="columns"
        :data="filteredRequests"
        :loading="pending"
        empty-title="No leave requests"
        empty-description="Submit a leave request to get started."
        empty-icon="lucide:calendar-off"
        hoverable
      >
        <template #employee="{ item }">
          <NuxtLink :to="`/employees/${item.employee?.id}`" class="flex items-center gap-2 group">
            <div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
              {{ item.employee?.firstName?.[0] }}{{ item.employee?.lastName?.[0] }}
            </div>
            <span class="text-xs font-medium text-gray-900 group-hover:text-primary-600">
              {{ item.employee?.firstName }} {{ item.employee?.lastName }}
            </span>
          </NuxtLink>
        </template>

        <template #type="{ item }">
          <span
            class="badge text-xs"
            :style="{ backgroundColor: (item.leaveType?.color || '#6B7280') + '20', color: item.leaveType?.color || '#6B7280' }"
          >
            {{ item.leaveType?.name || '—' }}
          </span>
        </template>

        <template #period="{ item }">
          <span class="text-xs font-mono">{{ item.startDate }} &rarr; {{ item.endDate }}</span>
        </template>

        <template #days="{ item }">
          <span class="text-xs font-mono font-medium">{{ item.totalDays }}</span>
        </template>

        <template #reason="{ item }">
          <span class="text-xs text-gray-500 max-w-xs truncate block">{{ item.reason || '—' }}</span>
        </template>

        <template #status="{ item }">
          <span :class="['badge text-xs', {
            'badge-warning': item.status === 'pending',
            'badge-success': item.status === 'approved',
            'badge-danger': item.status === 'rejected',
            'badge-neutral': item.status === 'cancelled',
          }]">
            {{ item.status }}
          </span>
        </template>

        <template #actions="{ item }">
          <div v-if="item.status === 'pending'" class="flex gap-1">
            <button
              class="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
              @click="updateRequestStatus(item.id, 'approved')"
              title="Approve"
            >
              <Icon name="lucide:check" class="h-3.5 w-3.5" />
            </button>
            <button
              class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              @click="updateRequestStatus(item.id, 'rejected')"
              title="Reject"
            >
              <Icon name="lucide:x" class="h-3.5 w-3.5" />
            </button>
          </div>
        </template>
      </UiDataTable>
    </div>

    <!-- New Leave Request Modal -->
    <UiModal v-model:open="isRequestModalOpen" title="New Leave Request" size="lg">
      <form id="leave-form" class="space-y-4" @submit.prevent="submitRequest">
        <div>
          <label class="label">Employee <span class="text-red-500">*</span></label>
          <select v-model="requestForm.employeeId" class="input text-xs">
            <option value="">Select employee...</option>
            <option v-for="emp in activeEmployees" :key="emp.id" :value="emp.id">
              {{ emp.firstName }} {{ emp.lastName }}
            </option>
          </select>
        </div>
        <div>
          <label class="label">Leave Type <span class="text-red-500">*</span></label>
          <select v-model="requestForm.leaveTypeId" class="input text-xs">
            <option value="">Select type...</option>
            <option v-for="lt in leaveTypes" :key="lt.id" :value="lt.id">
              {{ lt.name }} ({{ lt.defaultDays }} days)
            </option>
          </select>
        </div>
        <div class="grid gap-3 sm:grid-cols-3">
          <div>
            <label class="label">Start Date <span class="text-red-500">*</span></label>
            <UiInput v-model="requestForm.startDate" type="date" />
          </div>
          <div>
            <label class="label">End Date <span class="text-red-500">*</span></label>
            <UiInput v-model="requestForm.endDate" type="date" />
          </div>
          <div>
            <label class="label">Total Days</label>
            <UiInput v-model.number="requestForm.totalDays" type="number" step="0.5" />
          </div>
        </div>
        <div>
          <label class="label">Reason</label>
          <textarea v-model="requestForm.reason" class="input min-h-[60px] resize-none" placeholder="Reason for leave..." />
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn-secondary" :disabled="isSubmitting" @click="isRequestModalOpen = false">Cancel</button>
        <button type="submit" form="leave-form" class="btn-primary" :disabled="isSubmitting">
          <Icon v-if="isSubmitting" name="lucide:loader-2" class="h-3.5 w-3.5 animate-spin" />
          Submit
        </button>
      </template>
    </UiModal>

    <!-- Leave Type Modal -->
    <UiModal v-model:open="isTypeModalOpen" title="New Leave Type" size="md">
      <form id="leave-type-form" class="space-y-4" @submit.prevent="saveLeaveType">
        <div>
          <label class="label">Name <span class="text-red-500">*</span></label>
          <UiInput v-model="typeForm.name" placeholder="e.g. Annual Leave" autofocus />
        </div>
        <div>
          <label class="label">Description</label>
          <textarea v-model="typeForm.description" class="input min-h-[50px] resize-none" placeholder="Description..." />
        </div>
        <div class="grid gap-3 sm:grid-cols-3">
          <div>
            <label class="label">Default Days</label>
            <UiInput v-model.number="typeForm.defaultDays" type="number" />
          </div>
          <div>
            <label class="label">Paid Leave</label>
            <select v-model="typeForm.isPaid" class="input text-xs">
              <option :value="true">Yes</option>
              <option :value="false">No</option>
            </select>
          </div>
          <div>
            <label class="label">Color</label>
            <input v-model="typeForm.color" type="color" class="input h-9 p-1 cursor-pointer" />
          </div>
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn-secondary" :disabled="isSubmitting" @click="isTypeModalOpen = false">Cancel</button>
        <button type="submit" form="leave-type-form" class="btn-primary" :disabled="isSubmitting">
          <Icon v-if="isSubmitting" name="lucide:loader-2" class="h-3.5 w-3.5 animate-spin" />
          Save
        </button>
      </template>
    </UiModal>
  </div>
</template>
