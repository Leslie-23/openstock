<script setup lang="ts">
const { user, refreshSession } = useAuth();
const toast = useToast();

const isSubmitting = ref(false);
const isPasswordSubmitting = ref(false);

const profileForm = reactive({
  name: '',
  email: '',
});

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

// Initialize form with user data
watch(
  () => user.value,
  (u) => {
    if (u) {
      profileForm.name = u.name || '';
      profileForm.email = u.email || '';
    }
  },
  { immediate: true }
);

async function updateProfile() {
  if (!profileForm.name.trim() || !profileForm.email.trim()) {
    toast.error('Name and email are required');
    return;
  }

  isSubmitting.value = true;
  try {
    await $fetch(`/api/users/${user.value?.id}`, {
      method: 'PUT',
      body: {
        name: profileForm.name,
        email: profileForm.email,
      },
    });
    toast.success('Profile updated', 'Your profile has been saved.');
    await refreshSession();
  } catch (e: any) {
    toast.error('Error', e.data?.message || 'Failed to update profile.');
  } finally {
    isSubmitting.value = false;
  }
}

async function updatePassword() {
  if (!passwordForm.currentPassword || !passwordForm.newPassword) {
    toast.error('Please fill all password fields');
    return;
  }
  if (passwordForm.newPassword.length < 8) {
    toast.error('New password must be at least 8 characters');
    return;
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    toast.error('Passwords do not match');
    return;
  }

  isPasswordSubmitting.value = true;
  try {
    await $fetch(`/api/users/${user.value?.id}`, {
      method: 'PUT',
      body: {
        password: passwordForm.newPassword,
        currentPassword: passwordForm.currentPassword,
      },
    });
    toast.success('Password updated', 'Your password has been changed.');
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
  } catch (e: any) {
    toast.error('Error', e.data?.message || 'Failed to update password.');
  } finally {
    isPasswordSubmitting.value = false;
  }
}

const ui = {
  card: 'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden',
  cardHeader: 'px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between',
  cardTitle: 'text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2',
  cardBody: 'p-5',
  label: 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5',
  input: 'block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm h-9 placeholder:text-gray-300 transition-shadow',
};
</script>

<template>
  <div class="space-y-6 max-w-3xl mx-auto">
    <div class="border-b border-gray-200 pb-4">
      <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Profile</h1>
      <p class="mt-1 text-sm text-gray-500">Manage your account information and security.</p>
    </div>

    <!-- User Info -->
    <div class="flex items-center gap-4 p-5 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 border border-primary-100">
        <Icon name="lucide:user" class="h-7 w-7 text-primary-600" />
      </div>
      <div>
        <h2 class="text-lg font-semibold text-gray-900">{{ user?.name }}</h2>
        <p class="text-sm text-gray-500">{{ user?.email }}</p>
        <span class="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium"
          :class="{
            'bg-purple-100 text-purple-700': user?.role === 'admin',
            'bg-blue-100 text-blue-700': user?.role === 'member',
            'bg-amber-100 text-amber-700': user?.role === 'viewer',
          }"
        >
          {{ user?.role === 'admin' ? 'Administrator' : user?.role === 'member' ? 'Member' : 'Viewer' }}
        </span>
      </div>
    </div>

    <!-- Profile Settings -->
    <div :class="ui.card">
      <div :class="ui.cardHeader">
        <div :class="ui.cardTitle">
          <Icon name="lucide:user-cog" class="h-3.5 w-3.5 text-gray-500" />
          <span>Profile Information</span>
        </div>
      </div>
      <div :class="ui.cardBody">
        <form @submit.prevent="updateProfile" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label :class="ui.label">Full Name</label>
              <input v-model="profileForm.name" type="text" :class="ui.input" placeholder="Your name" />
            </div>
            <div>
              <label :class="ui.label">Email Address</label>
              <input v-model="profileForm.email" type="email" :class="ui.input" placeholder="you@example.com" />
            </div>
          </div>
          <div class="flex justify-end pt-2">
            <UiButton type="submit" :loading="isSubmitting">
              <Icon v-if="!isSubmitting" name="lucide:save" class="mr-2 h-4 w-4" />
              Save Profile
            </UiButton>
          </div>
        </form>
      </div>
    </div>

    <!-- Change Password -->
    <div :class="ui.card">
      <div :class="ui.cardHeader">
        <div :class="ui.cardTitle">
          <Icon name="lucide:lock" class="h-3.5 w-3.5 text-gray-500" />
          <span>Change Password</span>
        </div>
      </div>
      <div :class="ui.cardBody">
        <form @submit.prevent="updatePassword" class="space-y-4">
          <div>
            <label :class="ui.label">Current Password</label>
            <input v-model="passwordForm.currentPassword" type="password" :class="ui.input" placeholder="Enter current password" />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label :class="ui.label">New Password</label>
              <input v-model="passwordForm.newPassword" type="password" :class="ui.input" placeholder="Min. 8 characters" />
            </div>
            <div>
              <label :class="ui.label">Confirm New Password</label>
              <input v-model="passwordForm.confirmPassword" type="password" :class="ui.input" placeholder="Repeat new password" />
            </div>
          </div>
          <div class="flex justify-end pt-2">
            <UiButton type="submit" :loading="isPasswordSubmitting">
              <Icon v-if="!isPasswordSubmitting" name="lucide:key" class="mr-2 h-4 w-4" />
              Update Password
            </UiButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
