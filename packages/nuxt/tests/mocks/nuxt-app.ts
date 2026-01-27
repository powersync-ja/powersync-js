/**
 * Mock for Nuxt's #app module used in tests.
 * This provides a minimal implementation of useRuntimeConfig
 * that NuxtPowerSyncDatabase requires.
 */

let diagnosticsEnabled = false;

/**
 * Set whether diagnostics should be enabled for tests
 */
export const setUseDiagnostics = (enabled: boolean) => {
  diagnosticsEnabled = enabled;
};

/**
 * Get current diagnostics setting
 */
export const getUseDiagnostics = () => diagnosticsEnabled;

export const useRuntimeConfig = () => ({
  public: {
    powerSyncModuleOptions: {
      useDiagnostics: diagnosticsEnabled
    }
  }
});
