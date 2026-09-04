export default defineNuxtPlugin(() => {
  const guardedFetch = $fetch.create({
    onResponseError({ response }) {
      if (response.status !== 402) return;

      const route = useRoute();
      if (route.path === '/subscription') return;

      const toast = useToast();
      toast.error(response._data?.message || 'A subscription is required to continue.');
      navigateTo('/subscription');
    },
  });

  globalThis.$fetch = guardedFetch as typeof $fetch;
});
