<script setup lang="ts">
const toast = useToast();

const { data: employees, pending, refresh } = await useFetch('/api/employees');
const { data: departments } = await useFetch('/api/departments');

const isModalOpen = ref(false);
const editingEmployee = ref<any>(null);
const isSubmitting = ref(false);
const searchQuery = ref('');
const statusFilter = ref('all');

const form = reactive({
  employeeCode: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '' as string,
  address: '',
  city: '',
  postalCode: '',
  country: 'France',
  departmentId: '' as string,
  position: '',
  employmentType: 'full_time' as string,
  hireDate: '',
  baseSalary: 0,
  salaryFrequency: 'monthly' as string,
  emergencyContactName: '',
  emergencyContactPhone: '',
  notes: '',
});

const columns = [
  { key: 'employee', label: 'Employee' },
  { key: 'department', label: 'Department' },
  { key: 'position', label: 'Position' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', class: 'w-24' },
];

const filteredEmployees = computed(() => {
  let list = employees.value || [];
  if (statusFilter.value !== 'all') {
    list = list.filter((e: any) => e.status === statusFilter.value);
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(
      (e: any) =>
        e.firstName.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.employeeCode && e.employeeCode.toLowerCase().includes(q))
    );
  }
  return list;
});

const totalEmployees = computed(() => employees.value?.length ?? 0);
const activeEmployees = computed(() => employees.value?.filter((e: any) => e.status === 'active').length ?? 0);

const employmentTypeLabels: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  intern: 'Intern',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide',
  on_leave: 'bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide',
  suspended: 'bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide',
  terminated: 'bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide'
};
function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    active: 'lucide:check-circle',
    on_leave: 'lucide:calendar',
    suspended: 'lucide:alert-circle',
    terminated: 'lucide:x-circle'
  };
  return icons[status] || 'lucide:circle';
}


function openCreateModal() {
  editingEmployee.value = null;
  Object.assign(form, {
    employeeCode: '', firstName: '', lastName: '', email: '', phone: '',
    dateOfBirth: '', gender: '', address: '', city: '', postalCode: '',
    country: 'France', departmentId: '', position: '', employmentType: 'full_time',
    hireDate: new Date().toISOString().split('T')[0], baseSalary: 0,
    salaryFrequency: 'monthly', emergencyContactName: '', emergencyContactPhone: '', notes: '',
  });
  isModalOpen.value = true;
}

function openEditModal(emp: any) {
  editingEmployee.value = emp;
  Object.assign(form, {
    employeeCode: emp.employeeCode || '',
    firstName: emp.firstName,
    lastName: emp.lastName,
    email: emp.email,
    phone: emp.phone || '',
    dateOfBirth: emp.dateOfBirth || '',
    gender: emp.gender || '',
    address: emp.address || '',
    city: emp.city || '',
    postalCode: emp.postalCode || '',
    country: emp.country || 'France',
    departmentId: emp.departmentId || '',
    position: emp.position || '',
    employmentType: emp.employmentType || 'full_time',
    hireDate: emp.hireDate,
    baseSalary: emp.baseSalary || 0,
    salaryFrequency: emp.salaryFrequency || 'monthly',
    emergencyContactName: emp.emergencyContactName || '',
    emergencyContactPhone: emp.emergencyContactPhone || '',
    notes: emp.notes || '',
  });
  isModalOpen.value = true;
}

async function saveEmployee() {
  if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.hireDate) {
    toast.warning('Please fill in all required fields');
    return;
  }

  isSubmitting.value = true;
  try {
    if (editingEmployee.value) {
      await $fetch(`/api/employees/${editingEmployee.value.id}`, { method: 'PUT', body: form });
      toast.success('Employee updated');
    } else {
      await $fetch('/api/employees', { method: 'POST', body: form });
      toast.success('Employee added');
    }
    isModalOpen.value = false;
    refresh();
  } catch (error) {
    console.error('Failed to save employee:', error);
    toast.error('Failed to save employee');
  } finally {
    isSubmitting.value = false;
  }
}

async function deleteEmployee(id: string, name: string) {
  if (!confirm(`Delete employee "${name}"?`)) return;
  try {
    await $fetch(`/api/employees/${id}`, { method: 'DELETE' });
    toast.success('Employee deleted');
    refresh();
  } catch (error) {
    console.error('Failed to delete employee:', error);
    toast.error('Failed to delete employee');
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold text-gray-900">Employees</h1>
        <p class="text-xs text-gray-500">Manage your workforce</p>
      </div>
      <UiButton class="btn-primary" @click="openCreateModal">
        <Icon name="lucide:plus" class="h-3.5 w-3.5" />
        Add Employee
      </UiButton>
    </div>

    <div class="flex gap-3 flex-wrap">
      <div class="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-1.5">
        <Icon name="lucide:users" class="h-3.5 w-3.5 text-gray-400" />
        <span class="text-xs">
          <span class="font-medium font-mono">{{ totalEmployees }}</span>
          <span class="text-gray-500"> total</span>
        </span>
      </div>
      <div class="flex items-center gap-2 rounded border border-green-200 bg-green-50 px-3 py-1.5">
        <Icon name="lucide:check-circle" class="h-3.5 w-3.5 text-green-600" />
        <span class="text-xs">
          <span class="font-medium font-mono text-green-700">{{ activeEmployees }}</span>
          <span class="text-green-600"> active</span>
        </span>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-3">
      <div class="relative flex-1 max-w-xs">
        <Icon name="lucide:search" class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search employees..."
          class="input pl-8 text-xs"
        />
      </div>
      <select v-model="statusFilter" class="input text-xs w-36">
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="on_leave">On Leave</option>
        <option value="suspended">Suspended</option>
        <option value="terminated">Terminated</option>
      </select>
    </div>

    <div class="card overflow-hidden">
      <UiDataTable
        :columns="columns"
        :data="filteredEmployees"
        :loading="pending"
        empty-title="No employees"
        empty-description="Add employees to manage your workforce."
        empty-icon="lucide:users"
        hoverable
      >
        <template #employee="{ item }">
          <NuxtLink :to="`/employees/${item.id}`" class="flex items-center gap-2.5 group">
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
              {{ item.firstName[0] }}{{ item.lastName[0] }}
            </div>
            <div>
              <p class="text-xs font-medium text-gray-900 group-hover:text-primary-600">
                {{ item.firstName }} {{ item.lastName }}
              </p>
              <p class="text-xs text-gray-500">{{ item.email }}</p>
            </div>
          </NuxtLink>
        </template>

        <template #department="{ item }">
          <span class="text-xs text-gray-600">{{ item.department?.name || '—' }}</span>
        </template>

        <template #position="{ item }">
          <span class="text-xs text-gray-600">{{ item.position || '—' }}</span>
        </template>

        <template #type="{ item }">
          <span class="badge bg-gray-100 text-gray-700 text-xs rounded-full px-2 py-0.5 border border-gray-900 tracking-wide ">
            {{ employmentTypeLabels[item.employmentType] || item.employmentType }}
          </span>
        </template>

        <template #status="{ item }">
          <span :class="['badge', statusColors[item.status] || 'badge']">
                <Icon :name="getStatusIcon(item.status)" class="h-2.5 w-2.5" />

            {{ item.status.replace('_', ' ') }}
          </span>
        </template>

        <template #actions="{ item }">
          <div class="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <NuxtLink
              :to="`/employees/${item.id}`"
              class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <Icon name="lucide:eye" class="h-3.5 w-3.5" />
            </NuxtLink>
            <button
              class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              @click="openEditModal(item)"
            >
              <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
            </button>
            <button
              class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              @click="deleteEmployee(item.id, `${item.firstName} ${item.lastName}`)"
            >
              <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
            </button>
          </div>
        </template>
      </UiDataTable>
    </div>

    <!-- Add/Edit Employee Modal -->
    <UiModal v-model:open="isModalOpen" :title="editingEmployee ? 'Edit Employee' : 'New Employee'" size="2xl">
      <form id="employee-form" class="space-y-4" @submit.prevent="saveEmployee">
        <!-- Personal Info -->
        <div class="rounded border border-gray-200 bg-gray-50 p-3">
          <h3 class="mb-3 flex items-center gap-1.5 text-xs font-medium text-gray-700 uppercase tracking-wide">
            <Icon name="lucide:user" class="h-3.5 w-3.5" />
            Personal Info
          </h3>
          <div class="grid gap-3 sm:grid-cols-3">
            <div>
              <label class="label">Employee Code</label>
              <UiInput v-model="form.employeeCode" placeholder="EMP-001" />
            </div>
            <div>
              <label class="label">First Name <span class="text-red-500">*</span></label>
              <UiInput v-model="form.firstName" placeholder="First name" autofocus />
            </div>
            <div>
              <label class="label">Last Name <span class="text-red-500">*</span></label>
              <UiInput v-model="form.lastName" placeholder="Last name" />
            </div>
          </div>
          <div class="grid gap-3 sm:grid-cols-3 mt-3">
            <div>
              <label class="label">Email <span class="text-red-500">*</span></label>
              <UiInput v-model="form.email" type="email" placeholder="email@company.com" />
            </div>
            <div>
              <label class="label">Phone</label>
              <UiInput v-model="form.phone" placeholder="+33 1 23 45 67 89" />
            </div>
            <div>
              <label class="label">Date of Birth</label>
              <UiInput v-model="form.dateOfBirth" type="date" />
            </div>
          </div>
          <div class="mt-3">
            <label class="label">Gender</label>
            <select v-model="form.gender" class="input text-xs">
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <!-- Address -->
        <div class="rounded border border-gray-200 bg-gray-50 p-3">
          <h3 class="mb-3 flex items-center gap-1.5 text-xs font-medium text-gray-700 uppercase tracking-wide">
            <Icon name="lucide:map-pin" class="h-3.5 w-3.5" />
            Address
          </h3>
          <div>
            <label class="label">Street</label>
            <UiInput v-model="form.address" placeholder="123 Main Street" />
          </div>
          <div class="grid gap-3 sm:grid-cols-3 mt-3">
            <div>
              <label class="label">City</label>
              <UiInput v-model="form.city" placeholder="Paris" />
            </div>
            <div>
              <label class="label">Postal Code</label>
              <UiInput v-model="form.postalCode" placeholder="75001" />
            </div>
            <div>
              <label class="label">Country</label>
              <UiInput v-model="form.country" placeholder="France" />
            </div>
          </div>
        </div>

        <!-- Employment -->
        <div class="rounded border border-gray-200 bg-gray-50 p-3">
          <h3 class="mb-3 flex items-center gap-1.5 text-xs font-medium text-gray-700 uppercase tracking-wide">
            <Icon name="lucide:briefcase" class="h-3.5 w-3.5" />
            Employment
          </h3>
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="label">Department</label>
              <select v-model="form.departmentId" class="input text-xs">
                <option value="">Select department...</option>
                <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                  {{ dept.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="label">Position</label>
              <UiInput v-model="form.position" placeholder="Software Engineer" />
            </div>
          </div>
          <div class="grid gap-3 sm:grid-cols-3 mt-3">
            <div>
              <label class="label">Type</label>
              <select v-model="form.employmentType" class="input text-xs">
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div>
              <label class="label">Hire Date <span class="text-red-500">*</span></label>
              <UiInput v-model="form.hireDate" type="date" />
            </div>
            <div>
              <label class="label">Salary Frequency</label>
              <select v-model="form.salaryFrequency" class="input text-xs">
                <option value="monthly">Monthly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="weekly">Weekly</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>
          </div>
          <div class="mt-3">
            <label class="label">Base Salary</label>
            <UiInput v-model.number="form.baseSalary" type="number" step="0.01" placeholder="0.00" />
          </div>
        </div>

        <!-- Emergency Contact -->
        <div class="rounded border border-gray-200 bg-gray-50 p-3">
          <h3 class="mb-3 flex items-center gap-1.5 text-xs font-medium text-gray-700 uppercase tracking-wide">
            <Icon name="lucide:heart-pulse" class="h-3.5 w-3.5" />
            Emergency Contact
          </h3>
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="label">Contact Name</label>
              <UiInput v-model="form.emergencyContactName" placeholder="Contact name" />
            </div>
            <div>
              <label class="label">Contact Phone</label>
              <UiInput v-model="form.emergencyContactPhone" placeholder="+33 1 23 45 67 89" />
            </div>
          </div>
        </div>

        <div>
          <label class="label">Notes</label>
          <textarea v-model="form.notes" class="input min-h-[60px] resize-none" placeholder="Additional notes..." />
        </div>
      </form>

      <template #footer>
        <button type="button" class="btn-secondary" :disabled="isSubmitting" @click="isModalOpen = false">Cancel</button>
        <button type="submit" form="employee-form" class="btn-primary" :disabled="isSubmitting">
          <Icon v-if="isSubmitting" name="lucide:loader-2" class="h-3.5 w-3.5 animate-spin" />
          {{ editingEmployee ? 'Update' : 'Add' }}
        </button>
      </template>
    </UiModal>
  </div>
</template>
