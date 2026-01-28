import { defineNuxtPlugin, useRoute, useRuntimeConfig } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  // Expose PowerSync module options globally
  const runtimeConfig = useRuntimeConfig()

  nuxtApp.vueApp.config.globalProperties.$powerSyncModuleOptions
    = runtimeConfig.public.powerSyncModuleOptions

  const route = useRoute()

  nuxtApp.hook('page:finish', () => {
    if (route.path.startsWith('/__powersync-inspector')) {
      // Dynamically import UnoCSS only when on inspector route
      import('virtual:uno.css')
    }
  })
})
