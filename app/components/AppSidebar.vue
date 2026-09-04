<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const { user, isAdmin, logout } = useAuth();
const { canAccess } = useSubscription();
const { isOpen: isSidebarOpen, close: closeSidebar } = useSidebar();

watch(() => route.path, () => closeSidebar());

const navigation = [
  { name: "Dashboard", href: "/", icon: "lucide:layout-dashboard" },
  { name: "Products", href: "/products", icon: "lucide:package" },
  { name: "Categories", href: "/categories", icon: "lucide:folder-tree" },
  { name: "Suppliers", href: "/suppliers", icon: "lucide:truck" },
  { name: "Movements", href: "/movements", icon: "lucide:arrow-left-right" },
  { name: "Reports", href: "/reports", icon: "lucide:bar-chart-3" },
  { name: "Notifications", href: "/notifications", icon: "lucide:bell" },
];

const hrNavigation = [
  { name: "Employees", href: "/employees", icon: "lucide:contact" },
  { name: "Departments", href: "/departments", icon: "lucide:building" },
  { name: "Attendance", href: "/attendance", icon: "lucide:clock" },
  { name: "Leave", href: "/leave", icon: "lucide:calendar-off" },
  { name: "Payroll", href: "/payroll", icon: "lucide:wallet" },
];

const accountingNavigation = computed(() => {
  const items: { name: string; href: string; icon: string }[] = [];
  if (canAccess('invoicing')) {
    items.push(
      { name: "Invoices", href: "/accounting/invoices", icon: "lucide:file-text" },
      { name: "Expenses", href: "/accounting/expenses", icon: "lucide:receipt" },
      { name: "Customers", href: "/accounting/customers", icon: "lucide:users" },
    );
  }
  if (canAccess('accountingFull')) {
    items.unshift(
      { name: "Overview", href: "/accounting", icon: "lucide:calculator" },
    );
    items.push(
      { name: "Chart of Accounts", href: "/accounting/chart-of-accounts", icon: "lucide:list-tree" },
      { name: "Journal", href: "/accounting/journal", icon: "lucide:book-open" },
    );
  }
  if (canAccess('arAp')) {
    items.push(
      { name: "Receivables", href: "/accounting/receivables", icon: "lucide:arrow-down-left" },
      { name: "Payables", href: "/accounting/payables", icon: "lucide:arrow-up-right" },
    );
  }
  if (canAccess('reports')) {
    items.push(
      { name: "Reports", href: "/accounting/reports", icon: "lucide:pie-chart" },
    );
  }
  return items;
});

const secondaryNavigation = computed(() => {
  const items = [
    { name: "Subscription", href: "/subscription", icon: "lucide:crown" },
    { name: "Taxes", href: "/taxes", icon: "lucide:percent" },
    { name: "Settings", href: "/settings", icon: "lucide:settings" },
  ];

  // Add Users link for admins only
  if (isAdmin.value) {
    items.unshift({ name: "Users", href: "/users", icon: "lucide:users" });
  }

  return items;
});

const collapsedSections = reactive<Record<string, boolean>>({
  accounting: false,
  hr: false,
});

onMounted(() => {
  try {
    const stored = localStorage.getItem("sidebar-collapsed-sections");
    if (stored) Object.assign(collapsedSections, JSON.parse(stored));
  } catch {
    // ignore malformed/unavailable storage
  }
});

function toggleSection(key: string) {
  collapsedSections[key] = !collapsedSections[key];
  try {
    localStorage.setItem("sidebar-collapsed-sections", JSON.stringify(collapsedSections));
  } catch {
    // ignore unavailable storage
  }
}

function isActive(href: string): boolean {
  if (href === "/") {
    return route.path === "/";
  }
  if (href === "/accounting") {
    return route.path === "/accounting";
  }
  if (href === "/finance") {
    return route.path === "/finance";
  }
  return route.path.startsWith(href);
}

async function handleLogout() {
  await logout()
  // refresh page to clear state
  window.location.reload()
  await router.push("/auth/login")
  window.location.reload()
}
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-50 flex w-64 min-w-64 shrink-0 -translate-x-full flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:translate-x-0"
    :class="{ 'translate-x-0': isSidebarOpen }"
  >
    <!-- Header -->
    <div class="flex h-16 items-center gap-3 border-b border-gray-100 px-6">
      <div
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm"
      >
        <Icon name="lucide:boxes" class="h-5 w-5" />
      </div>
      <div class="flex flex-1 flex-col">
        <span class="text-sm font-bold tracking-tight text-gray-900"
          >Inventra</span
        >
        <span
          class="text-[10px] font-medium text-gray-500 uppercase tracking-wider"
        >
          Powered by OpenStock
        </span>
        <span class="text-[9px] font-medium text-gray-400 tracking-wide">
          Built by
          <span>
            <a
              href="https://lesliepaul.me"
              target="_blank"
              rel="noopener noreferrer"
              class="text-gray-400 hover:text-gray-600 underline transition-colors no-underline"
            >
            Leslie Paul
            </a>
          </span>
        </span>
      </div>
      <button
        type="button"
        class="shrink-0 text-gray-400 hover:text-gray-600 lg:hidden"
        aria-label="Close menu"
        @click="closeSidebar"
      >
        <Icon name="lucide:x" class="h-5 w-5" />
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
      <!-- Main navigation -->
      <div class="flex flex-col gap-1">
        <NuxtLink
          v-for="item in navigation"
          :key="item.name"
          :to="item.href"
          class="group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200"
          :class="[
            isActive(item.href)
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
          ]"
        >
          <Icon
            :name="item.icon"
            class="h-4.5 w-4.5 shrink-0 transition-colors"
            :class="
              isActive(item.href)
                ? 'text-primary-600'
                : 'text-gray-400 group-hover:text-gray-600'
            "
          />
          <span>{{ item.name }}</span>
          <div
            v-if="isActive(item.href)"
            class="ml-auto h-1.5 w-1.5 rounded-full bg-primary-600"
          />
        </NuxtLink>
      </div>

      <!-- Accounting Separator -->
      <template v-if="accountingNavigation.length > 0">
        <div class="my-4 h-px bg-gray-100" />

        <!-- Accounting navigation -->
        <div class="flex flex-col gap-1">
          <button
            type="button"
            class="flex w-full items-center justify-between px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
            @click="toggleSection('accounting')"
          >
            <span>Accounting</span>
            <Icon
              name="lucide:chevron-down"
              class="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
              :class="collapsedSections.accounting ? '-rotate-90' : ''"
            />
          </button>
          <template v-if="!collapsedSections.accounting">
            <NuxtLink
              v-for="item in accountingNavigation"
              :key="item.name"
              :to="item.href"
              class="group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200"
              :class="[
                isActive(item.href)
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              ]"
            >
              <Icon
                :name="item.icon"
                class="h-4.5 w-4.5 shrink-0 transition-colors"
                :class="isActive(item.href) ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'"
              />
              <span>{{ item.name }}</span>
              <div v-if="isActive(item.href)" class="ml-auto h-1.5 w-1.5 rounded-full bg-primary-600" />
            </NuxtLink>
          </template>
        </div>
      </template>

      <!-- HR Separator -->
      <template v-if="canAccess('hr')">
        <div class="my-4 h-px bg-gray-100" />

        <!-- HR & Payroll navigation -->
        <div class="flex flex-col gap-1">
          <button
            type="button"
            class="flex w-full items-center justify-between px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
            @click="toggleSection('hr')"
          >
            <span>HR & Payroll</span>
            <Icon
              name="lucide:chevron-down"
              class="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
              :class="collapsedSections.hr ? '-rotate-90' : ''"
            />
          </button>
          <template v-if="!collapsedSections.hr">
            <NuxtLink
              v-for="item in hrNavigation"
              :key="item.name"
              :to="item.href"
              class="group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200"
              :class="[
                isActive(item.href)
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              ]"
            >
              <Icon
                :name="item.icon"
                class="h-4.5 w-4.5 shrink-0 transition-colors"
                :class="isActive(item.href) ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'"
              />
              <span>{{ item.name }}</span>
              <div v-if="isActive(item.href)" class="ml-auto h-1.5 w-1.5 rounded-full bg-primary-600" />
            </NuxtLink>
          </template>
        </div>
      </template>

      <!-- System Separator -->
      <div class="my-4 h-px bg-gray-100" />

      <!-- Secondary navigation -->
      <div class="flex flex-col gap-1">
        <p
          class="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2"
        >
          System
        </p>
        <NuxtLink
          v-for="item in secondaryNavigation"
          :key="item.name"
          :to="item.href"
          class="group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200"
          :class="[
            isActive(item.href)
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
          ]"
        >
          <Icon
            :name="item.icon"
            class="h-4.5 w-4.5 shrink-0 transition-colors"
            :class="
              isActive(item.href)
                ? 'text-primary-600'
                : 'text-gray-400 group-hover:text-gray-600'
            "
          />
          <span>{{ item.name }}</span>
        </NuxtLink>
      </div>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- User Card -->
      <div class="mt-4 rounded-xl border border-gray-100 bg-gray-50/50 p-3">
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/profile"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 hover:border-primary-200 transition-colors"
            title="View profile"
          >
            <Icon name="lucide:user" class="h-4 w-4 text-gray-600" />
          </NuxtLink>
          <NuxtLink to="/profile" class="flex-1 min-w-0 hover:opacity-80 transition-opacity">
            <p class="truncate text-sm font-semibold text-gray-900">
              {{ user?.name || "User" }}
            </p>
            <p class="truncate text-xs text-gray-500">{{ user?.email }}</p>
          </NuxtLink>
          <button
            @click="handleLogout"
            class="text-gray-400 hover:text-gray-600 transition-colors"
            title="Sign out"
          >
            <Icon name="lucide:log-out" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  </aside>
</template>
