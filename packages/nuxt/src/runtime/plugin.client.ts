// @ts-ignore
import { defineNuxtPlugin, useRuntimeConfig } from '#app';

export default defineNuxtPlugin((nuxtApp: any) => {
  // Expose PowerSync module options globally.
  const runtimeConfig = useRuntimeConfig();
  nuxtApp.vueApp.config.globalProperties.$powerSyncModuleOptions = runtimeConfig.public.powerSyncModuleOptions;

  // In diagnostics mode during development, load the in-page diagnostics client so the DevTools tab
  // can attach to the app's live database. Nuxt renders HTML through Nitro, so this is where a page
  // script is injected rather than through Vite's HTML hooks. Dynamic import keeps it out of builds.
  const diagnostics = runtimeConfig.public.powerSyncModuleOptions?.useDiagnostics;
  console.info('[powersync-diagnostics] nuxt plugin: dev =', import.meta.dev, 'useDiagnostics =', diagnostics);
  if (import.meta.dev && diagnostics) {
    import('@powersync/diagnostics-vite/client').catch((error) => {
      console.error('[powersync-diagnostics] failed to load the diagnostics client', error);
    });
  }
});
