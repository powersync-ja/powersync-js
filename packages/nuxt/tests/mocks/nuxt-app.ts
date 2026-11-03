/**
 * Mock for Nuxt's #app module used in tests: the minimal `useRuntimeConfig` the module's runtime reads.
 */
export const useRuntimeConfig = () => ({
  public: {
    powerSyncModuleOptions: {
      useDiagnostics: false,
      diagnosticsTransport: 'page',
      kysely: true
    }
  }
});
