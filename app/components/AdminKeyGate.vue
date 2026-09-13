<script setup lang="ts">
const { keyUnlocked, restore, unlock } = useAdminConsole();
const inputKey = ref('');

onMounted(() => restore());
</script>

<template>
  <div v-if="!keyUnlocked" class="mx-auto max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-3">
    <p class="text-sm font-medium text-gray-200">Enter the provisioning key</p>
    <input
      v-model="inputKey"
      type="password"
      placeholder="Provisioning key"
      class="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      @keyup.enter="unlock(inputKey)"
    />
    <button
      class="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
      :disabled="!inputKey.trim()"
      @click="unlock(inputKey)"
    >
      Unlock
    </button>
  </div>
  <slot v-else />
</template>
