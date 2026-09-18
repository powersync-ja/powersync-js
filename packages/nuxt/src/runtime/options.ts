/**
 * What the module writes to `runtimeConfig.public.powerSyncModuleOptions` for its runtime plugin.
 * Derived from {@link PowerSyncNuxtModuleOptions} at build time; not set by the app.
 */
export interface PowerSyncRuntimeOptions {
  useDiagnostics: boolean;
  /**
   * Which page-side agent the runtime plugin loads during `nuxt dev`: none under Nuxt DevTools 4, where
   * the devframe dock script serves the page, or the `postMessage` agent (`page`) under Nuxt DevTools 3.
   */
  diagnosticsTransport: 'devframe' | 'page';
  kysely: boolean;
}
