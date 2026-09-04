<script setup lang="ts">
const { loggedIn } = useUserSession();
const { isOpen: isSidebarOpen, close: closeSidebar } = useSidebar();
</script>

<template>
  <!-- Main layout when authenticated -->
  <div v-if="loggedIn" class="flex h-screen overflow-hidden bg-gray-100">
    <!-- Mobile sidebar backdrop -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 z-40 bg-gray-950/50 lg:hidden"
      @click="closeSidebar"
    />

    <!-- Sidebar -->
    <AppSidebar />

    <!-- Main content -->
    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <!-- Header -->
      <AppHeader />

      <!-- Page content -->
      <main class="flex-1 overflow-auto">
        <div class="mx-auto max-w-7xl px-4 py-5">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
