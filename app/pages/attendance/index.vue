<script setup lang="ts">
const toast = useToast();

const selectedDate = ref(new Date().toISOString().split('T')[0]);
const selectedEmployeeId = ref('');

const { data: employees } = await useFetch('/api/employees');
const { data: records, pending, refresh } = await useFetch('/api/attendance', {
  query: computed(() => ({
    date: selectedDate.value,
  })),
  watch: [selectedDate],
});

const isModalOpen = ref(false);
const isSubmitting = ref(false);

const form = reactive({
  employeeId: '',
  date: new Date().toISOString().split('T')[0],
  clockIn: '',
  clockOut: '',
  breakMinutes: 0,
  status: 'present' as string,
  notes: '',
});

const columns = [
  { key: 'employee', label: 'Employee' },
  { key: 'clockIn', label: 'Clock In' },
  { key: 'clockOut', label: 'Clock Out' },
  { key: 'break', label: 'Break' },
  { key: 'overtime', label: 'Overtime' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', class: 'w-32' },
];

const attendanceStatusColors: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-amber-100 text-amber-700',
  half_day: 'bg-blue-100 text-blue-700',
  holiday: 'bg-purple-100 text-purple-700',
  weekend: 'bg-gray-100 text-gray-500',
};

const presentCount = computed(() => records.value?.filter((r: any) => r.status === 'present').length ?? 0);
const absentCount = computed(() => records.value?.filter((r: any) => r.status === 'absent').length ?? 0);

async function clockIn(employeeId: string) {
  try {
    await $fetch('/api/attendance/clock-in', {
      method: 'POST',
      body: { employeeId },
    });
    toast.success('Clocked in');
    refresh();
  } catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Failed to clock in');
  }
}

async function clockOut(employeeId: string) {
  try {
    await $fetch('/api/attendance/clock-out', {
      method: 'POST',
      body: { employeeId },
    });
    toast.success('Clocked out');
    refresh();
  } catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Failed to clock out');
  }
}

function openManualEntry() {
  Object.assign(form, {
    employeeId: '',
    date: selectedDate.value,
    clockIn: '',
    clockOut: '',
    breakMinutes: 0,
    status: 'present',
    notes: '',
  });
  isModalOpen.value = true;
}

async function saveManualEntry() {
  if (!form.employeeId) {
    toast.warning('Select an employee');
    return;
  }
  isSubmitting.value = true;
  try {
    await $fetch('/api/attendance', {
      method: 'POST',
      body: form,
    });
    toast.success('Attendance recorded');
    isModalOpen.value = false;
    refresh();
  } catch (error) {
    console.error('Failed to save attendance:', error);
    toast.error('Failed to save attendance');
  } finally {
    isSubmitting.value = false;
  }
}

const activeEmployees = computed(() =>
  (employees.value || []).filter((e: any) => e.status === 'active')
);

const isToday = computed(() => selectedDate.value === new Date().toISOString().split('T')[0]);

function getTodayRecord(employeeId: string) {
  return records.value?.find((r: any) => r.employeeId === employeeId);
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold text-gray-900">Attendance</h1>
        <p class="text-xs text-gray-500">Track employee clock in and clock out</p>
      </div>
      <div class="flex gap-2">
        <UiButton class="btn-secondary" @click="openManualEntry">
          <Icon name="lucide:plus" class="h-3.5 w-3.5" />
          Manual Entry
        </UiButton>
      </div>
    </div>

    <!-- Date selector and stats -->
    <div class="flex gap-3 flex-wrap items-center">
      <div class="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-1.5">
        <Icon name="lucide:calendar" class="h-3.5 w-3.5 text-gray-400" />
        <input
          v-model="selectedDate"
          type="date"
          class="text-xs border-none bg-transparent focus:outline-none"
        />
      </div>
      <div class="flex items-center gap-2 rounded border border-green-200 bg-green-50 px-3 py-1.5">
        <Icon name="lucide:check-circle" class="h-3.5 w-3.5 text-green-600" />
        <span class="text-xs">
          <span class="font-medium font-mono text-green-700">{{ presentCount }}</span>
          <span class="text-green-600"> present</span>
        </span>
      </div>
      <div class="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-1.5">
        <Icon name="lucide:x-circle" class="h-3.5 w-3.5 text-red-600" />
        <span class="text-xs">
          <span class="font-medium font-mono text-red-700">{{ absentCount }}</span>
          <span class="text-red-600"> absent</span>
        </span>
      </div>
    </div>

    <!-- Quick Clock In/Out for today -->
    <div v-if="isToday" class="card p-4">
      <h3 class="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Quick Clock In / Out</h3>
      <div class="flex gap-2 items-center mb-3">
        <select v-model="selectedEmployeeId" class="input text-xs flex-1 max-w-xs">
          <option value="">Select employee...</option>
          <option v-for="emp in activeEmployees" :key="emp.id" :value="emp.id">
            {{ emp.firstName }} {{ emp.lastName }}
          </option>
        </select>
        <UiButton
          class="btn-primary text-xs"
          :disabled="!selectedEmployeeId"
          @click="clockIn(selectedEmployeeId)"
        >
          <Icon name="lucide:log-in" class="h-3.5 w-3.5" />
          Clock In
        </UiButton>
        <UiButton
          class="btn-secondary text-xs"
          :disabled="!selectedEmployeeId"
          @click="clockOut(selectedEmployeeId)"
        >
          <Icon name="lucide:log-out" class="h-3.5 w-3.5" />
          Clock Out
        </UiButton>
      </div>
    </div>

    <!-- Attendance Table -->
    <div class="card overflow-hidden">
      <UiDataTable
        :columns="columns"
        :data="records || []"
        :loading="pending"
        empty-title="No records"
        empty-description="No attendance records for this date."
        empty-icon="lucide:clock"
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

        <template #clockIn="{ item }">
          <span class="text-xs font-mono">{{ item.clockIn || '—' }}</span>
        </template>

        <template #clockOut="{ item }">
          <span class="text-xs font-mono">{{ item.clockOut || '—' }}</span>
        </template>

        <template #break="{ item }">
          <span class="text-xs">{{ item.breakMinutes || 0 }}m</span>
        </template>

        <template #overtime="{ item }">
          <span class="text-xs" :class="item.overtimeMinutes > 0 ? 'text-amber-600 font-medium' : ''">
            {{ item.overtimeMinutes || 0 }}m
          </span>
        </template>

        <template #status="{ item }">
          <span :class="['badge text-xs', attendanceStatusColors[item.status] || 'badge']">
            {{ item.status.replace('_', ' ') }}
          </span>
        </template>

        <template #actions="{ item }">
          <div v-if="isToday && !item.clockOut" class="flex gap-1">
            <button
              class="text-xs text-primary-600 hover:text-primary-800 font-medium"
              @click="clockOut(item.employeeId)"
            >
              Clock Out
            </button>
          </div>
        </template>
      </UiDataTable>
    </div>

    <!-- Manual Entry Modal -->
    <UiModal v-model:open="isModalOpen" title="Manual Attendance Entry" size="md">
      <form id="attendance-form" class="space-y-4" @submit.prevent="saveManualEntry">
        <div>
          <label class="label">Employee <span class="text-red-500">*</span></label>
          <select v-model="form.employeeId" class="input text-xs">
            <option value="">Select employee...</option>
            <option v-for="emp in activeEmployees" :key="emp.id" :value="emp.id">
              {{ emp.firstName }} {{ emp.lastName }}
            </option>
          </select>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="label">Date</label>
            <UiInput v-model="form.date" type="date" />
          </div>
          <div>
            <label class="label">Status</label>
            <select v-model="form.status" class="input text-xs">
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
              <option value="holiday">Holiday</option>
              <option value="weekend">Weekend</option>
            </select>
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="label">Clock In</label>
            <UiInput v-model="form.clockIn" type="time" />
          </div>
          <div>
            <label class="label">Clock Out</label>
            <UiInput v-model="form.clockOut" type="time" />
          </div>
        </div>
        <div>
          <label class="label">Break (minutes)</label>
          <UiInput v-model.number="form.breakMinutes" type="number" placeholder="0" />
        </div>
        <div>
          <label class="label">Notes</label>
          <textarea v-model="form.notes" class="input min-h-[50px] resize-none" placeholder="Notes..." />
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn-secondary" :disabled="isSubmitting" @click="isModalOpen = false">Cancel</button>
        <button type="submit" form="attendance-form" class="btn-primary" :disabled="isSubmitting">
          <Icon v-if="isSubmitting" name="lucide:loader-2" class="h-3.5 w-3.5 animate-spin" />
          Save
        </button>
      </template>
    </UiModal>
  </div>
</template>
