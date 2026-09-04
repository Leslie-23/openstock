<script setup lang="ts">
import { exportRowsToCSV, exportRowsToExcel, exportRowsToPDF, type ExportColumn } from '~/utils/export';

const props = withDefaults(
  defineProps<{
    title: string;
    columns: ExportColumn[];
    rows: Record<string, unknown>[];
    dateLabel?: string;
    subtitle?: string;
    label?: string;
    disabled?: boolean;
  }>(),
  {
    label: 'Export',
    disabled: false,
  },
);

const open = ref(false);
const exporting = ref(false);
const menuRef = ref<HTMLElement | null>(null);

function toggle() {
  if (props.disabled) return;
  open.value = !open.value;
}

function onClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener('click', onClickOutside));
onUnmounted(() => document.removeEventListener('click', onClickOutside));

async function handleExport(format: 'csv' | 'excel' | 'pdf') {
  open.value = false;
  exporting.value = true;
  try {
    if (format === 'csv') {
      exportRowsToCSV(props.title, props.columns, props.rows, props.dateLabel);
    } else if (format === 'excel') {
      await exportRowsToExcel(props.title, props.columns, props.rows, props.dateLabel);
    } else {
      await exportRowsToPDF(props.title, props.columns, props.rows, props.dateLabel, props.subtitle);
    }
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <div ref="menuRef" class="relative inline-block text-left">
    <UiButton variant="outline" :disabled="disabled || exporting" @click="toggle">
      <Icon
        :name="exporting ? 'lucide:loader-2' : 'lucide:download'"
        class="mr-2 h-4 w-4"
        :class="{ 'animate-spin': exporting }"
      />
      {{ label }}
      <Icon name="lucide:chevron-down" class="ml-2 h-3.5 w-3.5" />
    </UiButton>
    <div
      v-if="open"
      class="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
    >
      <button
        type="button"
        class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        @click="handleExport('csv')"
      >
        <Icon name="lucide:file-text" class="h-4 w-4 text-gray-400" /> CSV
      </button>
      <button
        type="button"
        class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        @click="handleExport('excel')"
      >
        <Icon name="lucide:file-spreadsheet" class="h-4 w-4 text-gray-400" /> Excel
      </button>
      <button
        type="button"
        class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        @click="handleExport('pdf')"
      >
        <Icon name="lucide:file" class="h-4 w-4 text-gray-400" /> PDF
      </button>
    </div>
  </div>
</template>
