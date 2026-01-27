<script setup lang="ts">
const router = useRouter();
const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

function handleNotificationClick(notification: any) {
  markAsRead(notification.id);
  if (notification.href) {
    router.push(notification.href);
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <div class="flex items-end justify-between border-b border-gray-200 pb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Notifications</h1>
        <p class="mt-1 text-sm text-gray-500">
          {{ unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.` : 'You\'re all caught up.' }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UiButton v-if="unreadCount > 0" variant="outline" size="sm" @click="markAllAsRead">
          <Icon name="lucide:check-check" class="mr-2 h-4 w-4" />
          Mark all read
        </UiButton>
        <UiButton v-if="notifications.length > 0" variant="ghost" size="sm" @click="clearAll">
          <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
          Clear all
        </UiButton>
      </div>
    </div>

    <!-- Notifications List -->
    <div v-if="notifications.length > 0" class="bg-white border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-100 overflow-hidden">
      <button
        v-for="notification in notifications"
        :key="notification.id"
        class="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50"
        :class="{ 'bg-primary-50/30': !notification.read }"
        @click="handleNotificationClick(notification)"
      >
        <div
          class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          :class="{
            'bg-red-100 text-red-600': notification.type === 'error',
            'bg-amber-100 text-amber-600': notification.type === 'warning',
            'bg-blue-100 text-blue-600': notification.type === 'info',
            'bg-green-100 text-green-600': notification.type === 'success',
          }"
        >
          <Icon
            :name="
              notification.type === 'error'
                ? 'lucide:alert-circle'
                : notification.type === 'warning'
                ? 'lucide:alert-triangle'
                : notification.type === 'success'
                ? 'lucide:check-circle'
                : 'lucide:info'
            "
            class="h-5 w-5"
          />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-medium text-gray-900">{{ notification.title }}</p>
            <span class="text-xs text-gray-400 whitespace-nowrap">{{ formatTimeAgo(notification.createdAt) }}</span>
          </div>
          <p v-if="notification.description" class="text-sm text-gray-500 mt-0.5">{{ notification.description }}</p>
          <p v-if="notification.href" class="text-xs text-primary-600 mt-1 flex items-center gap-1">
            View details
            <Icon name="lucide:arrow-right" class="h-3 w-3" />
          </p>
        </div>
        <div v-if="!notification.read" class="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary-500" />
      </button>
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center py-16 text-center">
      <div class="rounded-full bg-gray-100 p-4 mb-4">
        <Icon name="lucide:bell-off" class="h-8 w-8 text-gray-400" />
      </div>
      <h3 class="text-sm font-medium text-gray-900">No notifications</h3>
      <p class="mt-1 text-sm text-gray-500">When there are stock alerts or updates, they'll appear here.</p>
    </div>
  </div>
</template>
