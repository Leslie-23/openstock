// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
    },
  },

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
      // Personal appliance/forex/crypto trading ledger — not part of the general SME
      // product. Left in the codebase for the owner's own private deployment only;
      // set NUXT_PUBLIC_FINANCE_MODULE_ENABLED=true to turn it back on.
      financeModuleEnabled: false,
    },
  },

  // Pinia configuration
  pinia: {
    storesDirs: ['./app/stores/**'],
  },
});
