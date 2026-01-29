<script setup lang="ts">
const route = useRoute();
const toast = useToast();
const { canEdit } = useAuth();

const { data: employee, pending, refresh } = await useFetch(`/api/employees/${route.params.id}`);

const activeTab = ref('overview');

const employmentTypeLabels: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  intern: 'Intern',
};

const statusColors: Record<string, string> = {
  active: 'badge-success',
  on_leave: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
  terminated: 'bg-gray-100 text-gray-600',
};

const attendanceStatusColors: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-amber-100 text-amber-700',
  half_day: 'bg-blue-100 text-blue-700',
  holiday: 'bg-purple-100 text-purple-700',
  weekend: 'bg-gray-100 text-gray-500',
};

function formatCurrency(amount: number | null) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount);
}

async function updateStatus(status: string) {
  if (!confirm(`Change status to "${status.replace('_', ' ')}"?`)) return;
  try {
    await $fetch(`/api/employees/${route.params.id}`, {
      method: 'PUT',
      body: { ...employee.value, status },
    });
    toast.success('Status updated');
    refresh();
  } catch {
    toast.error('Failed to update status');
  }
}
</script>

<template>
  <div v-if="pending" class="flex items-center justify-center py-20">
    <Icon name="lucide:loader-2" class="h-6 w-6 animate-spin text-gray-400" />
  </div>

  <div v-else-if="employee" class="space-y-4">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-4">
        <NuxtLink to="/employees" class="p-1.5 hover:bg-gray-100 rounded transition-colors">
          <Icon name="lucide:arrow-left" class="h-4 w-4 text-gray-500" />
        </NuxtLink>
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-lg font-semibold">
          {{ employee.firstName[0] }}{{ employee.lastName[0] }}
        </div>
        <div>
          <h1 class="text-lg font-semibold text-gray-900">
            {{ employee.firstName }} {{ employee.lastName }}
          </h1>
          <p class="text-xs text-gray-500">
            {{ employee.position || 'No position' }}
            <span v-if="employee.department"> &middot; {{ employee.department.name }}</span>
            <span v-if="employee.employeeCode"> &middot; {{ employee.employeeCode }}</span>
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span :class="['badge', statusColors[employee.status]]">
          {{ employee.status.replace('_', ' ') }}
        </span>
        <div v-if="canEdit" class="relative group">
          <button class="btn-secondary text-xs">
            <Icon name="lucide:more-horizontal" class="h-3.5 w-3.5" />
          </button>
          <div class="absolute right-0 top-full mt-1 w-40 rounded-lg border border-gray-200 bg-white shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <button @click="updateStatus('active')" class="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">Set Active</button>
            <button @click="updateStatus('on_leave')" class="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">Set On Leave</button>
            <button @click="updateStatus('suspended')" class="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-amber-600">Suspend</button>
            <button @click="updateStatus('terminated')" class="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-red-600">Terminate</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200">
      <nav class="flex gap-4">
        <button
          v-for="tab in ['overview', 'attendance', 'leave', 'payroll']"
          :key="tab"
          @click="activeTab = tab"
          class="pb-2 text-xs font-medium border-b-2 transition-colors capitalize"
          :class="activeTab === tab ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'"
        >
          {{ tab }}
        </button>
      </nav>
    </div>

    <!-- Overview Tab -->
    <div v-if="activeTab === 'overview'" class="grid gap-4 md:grid-cols-2">
      <div class="card p-4 space-y-3">
        <h3 class="text-xs font-semibold text-gray-700 uppercase tracking-wide">Personal Information</h3>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between"><span class="text-gray-500">Email</span><span>{{ employee.email }}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Phone</span><span>{{ employee.phone || '—' }}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Date of Birth</span><span>{{ employee.dateOfBirth || '—' }}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Gender</span><span class="capitalize">{{ employee.gender || '—' }}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Address</span><span>{{ [employee.address, employee.city, employee.postalCode, employee.country].filter(Boolean).join(', ') || '—' }}</span></div>
        </div>
      </div>

      <div class="card p-4 space-y-3">
        <h3 class="text-xs font-semibold text-gray-700 uppercase tracking-wide">Employment Details</h3>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between"><span class="text-gray-500">Department</span><span>{{ employee.department?.name || '—' }}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Position</span><span>{{ employee.position || '—' }}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Type</span><span>{{ employmentTypeLabels[employee.employmentType] }}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Hire Date</span><span>{{ employee.hireDate }}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Base Salary</span><span class="font-mono">{{ formatCurrency(employee.baseSalary) }}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Frequency</span><span class="capitalize">{{ employee.salaryFrequency }}</span></div>
        </div>
      </div>

      <div class="card p-4 space-y-3">
        <h3 class="text-xs font-semibold text-gray-700 uppercase tracking-wide">Emergency Contact</h3>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between"><span class="text-gray-500">Name</span><span>{{ employee.emergencyContactName || '—' }}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Phone</span><span>{{ employee.emergencyContactPhone || '—' }}</span></div>
        </div>
      </div>

      <div v-if="employee.notes" class="card p-4 space-y-3">
        <h3 class="text-xs font-semibold text-gray-700 uppercase tracking-wide">Notes</h3>
        <p class="text-xs text-gray-600">{{ employee.notes }}</p>
      </div>
    </div>

    <!-- Attendance Tab -->
    <div v-if="activeTab === 'attendance'" class="card overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50/50">
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Clock In</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Clock Out</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Break</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Overtime</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!employee.attendanceRecords?.length">
            <td colspan="6" class="px-4 py-8 text-center text-xs text-gray-500">No attendance records</td>
          </tr>
          <tr v-for="att in employee.attendanceRecords" :key="att.id" class="border-b border-gray-50 hover:bg-gray-50/50">
            <td class="px-4 py-2 text-xs font-mono">{{ att.date }}</td>
            <td class="px-4 py-2 text-xs font-mono">{{ att.clockIn || '—' }}</td>
            <td class="px-4 py-2 text-xs font-mono">{{ att.clockOut || '—' }}</td>
            <td class="px-4 py-2 text-xs">{{ att.breakMinutes || 0 }}m</td>
            <td class="px-4 py-2 text-xs">{{ att.overtimeMinutes || 0 }}m</td>
            <td class="px-4 py-2">
              <span :class="['badge text-xs', attendanceStatusColors[att.status] || 'badge']">
                {{ att.status.replace('_', ' ') }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Leave Tab -->
    <div v-if="activeTab === 'leave'" class="card overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50/50">
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Period</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Days</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!employee.leaveRequests?.length">
            <td colspan="5" class="px-4 py-8 text-center text-xs text-gray-500">No leave requests</td>
          </tr>
          <tr v-for="lr in employee.leaveRequests" :key="lr.id" class="border-b border-gray-50 hover:bg-gray-50/50">
            <td class="px-4 py-2">
              <span class="badge text-xs" :style="{ backgroundColor: lr.leaveType?.color + '20', color: lr.leaveType?.color }">
                {{ lr.leaveType?.name || '—' }}
              </span>
            </td>
            <td class="px-4 py-2 text-xs font-mono">{{ lr.startDate }} &rarr; {{ lr.endDate }}</td>
            <td class="px-4 py-2 text-xs font-mono">{{ lr.totalDays }}</td>
            <td class="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">{{ lr.reason || '—' }}</td>
            <td class="px-4 py-2">
              <span :class="['badge text-xs', {
                'bg-amber-100 text-amber-700': lr.status === 'pending',
                'badge-success': lr.status === 'approved',
                'bg-red-100 text-red-700': lr.status === 'rejected',
                'bg-gray-100 text-gray-500': lr.status === 'cancelled',
              }]">
                {{ lr.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Payroll Tab -->
    <div v-if="activeTab === 'payroll'" class="card overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50/50">
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Period</th>
            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Gross</th>
            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Deductions</th>
            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">Net Pay</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!employee.payrollRuns?.length">
            <td colspan="5" class="px-4 py-8 text-center text-xs text-gray-500">No payroll records</td>
          </tr>
          <tr v-for="pr in employee.payrollRuns" :key="pr.id" class="border-b border-gray-50 hover:bg-gray-50/50">
            <td class="px-4 py-2 text-xs">{{ pr.payrollPeriod?.name || '—' }}</td>
            <td class="px-4 py-2 text-xs font-mono text-right">{{ formatCurrency(pr.grossPay) }}</td>
            <td class="px-4 py-2 text-xs font-mono text-right text-red-600">
              -{{ formatCurrency(pr.taxAmount + pr.socialSecurity + pr.healthInsurance + pr.deductions + pr.otherDeductions) }}
            </td>
            <td class="px-4 py-2 text-xs font-mono text-right font-semibold text-green-700">{{ formatCurrency(pr.netPay) }}</td>
            <td class="px-4 py-2">
              <span :class="['badge text-xs', {
                'bg-amber-100 text-amber-700': pr.status === 'pending',
                'badge-success': pr.status === 'approved',
                'bg-green-100 text-green-700': pr.status === 'paid',
                'bg-gray-100 text-gray-500': pr.status === 'cancelled',
              }]">
                {{ pr.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
