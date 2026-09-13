<script setup lang="ts">
const { user, logout } = useAuth();
const router = useRouter();

async function handleLogout() {
  await logout();
  window.location.reload();
  await router.push('/auth/login');
}
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-gray-100">
    <header class="flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900 px-4 sm:px-6">
      <div class="flex items-center gap-2">
        <div class="flex h-7 w-7 items-center justify-center rounded-md bg-primary-600">
          <Icon name="lucide:shield" class="h-4 w-4 text-white" />
        </div>
        <span class="text-sm font-semibold tracking-tight">Owner Console</span>
        <span class="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
          Internal
        </span>
      </div>

      <nav class="flex items-center gap-1 text-sm">
        <NuxtLink
          to="/admin/customers"
          class="rounded-md px-3 py-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          active-class="bg-gray-800 text-white"
        >
          Customers
        </NuxtLink>
        <NuxtLink
          to="/admin/provision"
          class="rounded-md px-3 py-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          active-class="bg-gray-800 text-white"
        >
          Provision New
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-3">
        <span class="hidden text-xs text-gray-500 sm:inline">{{ user?.email }}</span>
        <button class="text-gray-400 hover:text-white" title="Sign out" @click="handleLogout">
          <Icon name="lucide:log-out" class="h-4 w-4" />
        </button>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <slot />
    </main>
  </div>
</template>
