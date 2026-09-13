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
    // Customer-provisioning portal (server/api/admin/provision.post.ts) —
    // triggers a GitHub Actions workflow that creates a fully isolated
    // Cloudflare deployment for a new customer. Both must be set for the
    // portal to work; it's a no-op (403) otherwise.
    provisionSecretKey: '',
    githubProvisionToken: '',
    githubRepo: 'leslie-23/openstock',
    // Admin console (server/api/admin/customers/*) — reads/writes a
    // provisioned customer's isolated D1 database directly via Cloudflare's
    // REST API (their own DB binding is unreachable from this deployment).
    cloudflareApiToken: '',
    cloudflareAccountId: '',
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
