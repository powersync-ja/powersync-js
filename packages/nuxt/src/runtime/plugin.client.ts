// @ts-ignore
import { defineNuxtPlugin, useRuntimeConfig } from '#app';

export default defineNuxtPlugin((nuxtApp: any) => {
  // Expose PowerSync module options globally.
  const runtimeConfig = useRuntimeConfig();
  nuxtApp.vueApp.config.globalProperties.$powerSyncModuleOptions = runtimeConfig.public.powerSyncModuleOptions;

  // In diagnostics mode during development, load the in-page diagnostics client so the DevTools tab
  // can attach to the app's live database. Nuxt renders HTML through Nitro, so this is where a page
  // script is injected rather than through Vite's HTML hooks. Dynamic import keeps it out of builds.
  const moduleOptions = runtimeConfig.public.powerSyncModuleOptions ?? {};
  // Under Nuxt DevTools 4 the devframe dock script serves the page; only the postMessage agent is loaded here.
  if (import.meta.dev) {
    console.info(
      '[powersync-diagnostics] nuxt plugin: useDiagnostics =',
      moduleOptions.useDiagnostics,
      'transport =',
      moduleOptions.diagnosticsTransport
    );
    if (moduleOptions.useDiagnostics && moduleOptions.diagnosticsTransport === 'page') {
      import('@powersync/diagnostics/page').catch((error) => {
        console.error('[powersync-diagnostics] failed to load the diagnostics client', error);
      });
    }
  }
});
