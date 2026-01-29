<script setup lang="ts">
import type { Department } from '~~/server/database/schema';

const toast = useToast();

const { data: departments, pending, refresh } = await useFetch('/api/departments');

const isModalOpen = ref(false);
const editingDepartment = ref<Department | null>(null);
const isSubmitting = ref(false);

const form = reactive({
  name: '',
  description: '',
});

const columns = [
  { key: 'name', label: 'Department' },
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', class: 'w-24' },
];

function openCreateModal() {
  editingDepartment.value = null;
  Object.assign(form, { name: '', description: '' });
  isModalOpen.value = true;
}

function openEditModal(dept: Department) {
  editingDepartment.value = dept;
  Object.assign(form, {
    name: dept.name,
    description: dept.description || '',
  });
  isModalOpen.value = true;
}

async function saveDepartment() {
  if (!form.name.trim()) {
    toast.warning('Please enter a department name');
    return;
  }

  isSubmitting.value = true;
  try {
    if (editingDepartment.value) {
      await $fetch(`/api/departments/${editingDepartment.value.id}`, {
        method: 'PUT',
        body: form,
      });
      toast.success('Department updated');
    } else {
      await $fetch('/api/departments', { method: 'POST', body: form });
      toast.success('Department created');
    }
    isModalOpen.value = false;
    refresh();
  } catch (error) {
    console.error('Failed to save department:', error);
    toast.error('Failed to save department');
  } finally {
    isSubmitting.value = false;
  }
}

async function deleteDepartment(id: string, name: string) {
  if (!confirm(`Delete "${name}"?`)) return;
  try {
    await $fetch(`/api/departments/${id}`, { method: 'DELETE' });
    toast.success('Department deleted');
    refresh();
  } catch (error) {
    console.error('Failed to delete department:', error);
    toast.error('Failed to delete department');
  }
}

const totalDepartments = computed(() => departments.value?.length ?? 0);
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold text-gray-900">Departments</h1>
        <p class="text-xs text-gray-500">Manage organizational departments</p>
      </div>
      <UiButton class="btn-primary" @click="openCreateModal">
        <Icon name="lucide:plus" class="h-3.5 w-3.5" />
        Add
      </UiButton>
    </div>

    <div class="flex gap-3">
      <div class="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-1.5">
        <Icon name="lucide:building" class="h-3.5 w-3.5 text-gray-400" />
        <span class="text-xs">
          <span class="font-medium font-mono">{{ totalDepartments }}</span>
          <span class="text-gray-500"> departments</span>
        </span>
      </div>
    </div>

    <div class="card overflow-hidden">
      <UiDataTable
        :columns="columns"
        :data="departments || []"
        :loading="pending"
        empty-title="No departments"
        empty-description="Create departments to organize employees."
        empty-icon="lucide:building"
        hoverable
      >
        <template #name="{ item }">
          <div class="flex items-center gap-2.5">
            <div class="flex h-7 w-7 items-center justify-center rounded bg-indigo-100">
              <Icon name="lucide:building" class="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <p class="text-xs font-medium text-gray-900">{{ item.name }}</p>
          </div>
        </template>

        <template #description="{ item }">
          <p class="text-xs text-gray-500 max-w-xs truncate">{{ item.description || '—' }}</p>
        </template>

        <template #status="{ item }">
          <span :class="['badge', item.isActive ? 'badge-success' : 'badge']">
            {{ item.isActive ? 'Active' : 'Inactive' }}
          </span>
        </template>

        <template #actions="{ item }">
          <div class="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              @click="openEditModal(item)"
            >
              <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
            </button>
            <button
              class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              @click="deleteDepartment(item.id, item.name)"
            >
              <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
            </button>
          </div>
        </template>
      </UiDataTable>
    </div>

    <UiModal v-model:open="isModalOpen" :title="editingDepartment ? 'Edit Department' : 'New Department'" size="md">
      <form id="dept-form" class="space-y-4" @submit.prevent="saveDepartment">
        <div>
          <label class="label">Name <span class="text-red-500">*</span></label>
          <UiInput v-model="form.name" placeholder="Department name" autofocus />
        </div>
        <div>
          <label class="label">Description</label>
          <textarea v-model="form.description" class="input min-h-[60px] resize-none" placeholder="Description..." />
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn-secondary" :disabled="isSubmitting" @click="isModalOpen = false">Cancel</button>
        <button type="submit" form="dept-form" class="btn-primary" :disabled="isSubmitting">
          <Icon v-if="isSubmitting" name="lucide:loader-2" class="h-3.5 w-3.5 animate-spin" />
          {{ editingDepartment ? 'Update' : 'Add' }}
        </button>
      </template>
    </UiModal>
  </div>
</template>
