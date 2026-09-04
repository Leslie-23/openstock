// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxthub/core',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxtjs/tailwindcss',
    'nuxt-auth-utils',
    '@pinia/nuxt',
  ],

  hub: {
    database: true,
    kv: true,
  },

  // Runtime config for admin operations
  runtimeConfig: {
    adminSecretKey: '',
    paystackSecretKey: '',
    public: {
      paystackPublicKey: '',
    },
  },

  // Pinia configuration
  pinia: {
    storesDirs: ['./app/stores/**'],
  },
});
