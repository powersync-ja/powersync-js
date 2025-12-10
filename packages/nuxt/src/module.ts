import {
  defineNuxtModule,
  createResolver,
  addPlugin,
  addImports,
  extendPages,
  // installModule,
  addLayout,
  addComponentsDir,
  installModule,
} from '@nuxt/kit'
import { defu } from 'defu'
import { setupDevToolsUI } from './devtools'
import { addImportsFrom } from './runtime/utils/addImportsFrom'

type JSONValue
  = | string
    | number
    | boolean
    | null
    | undefined
    | JSONObject
    | JSONArray
interface JSONObject {
  [key: string]: JSONValue
}
type JSONArray = JSONValue[]

// Module options TypeScript interface definition
export interface PowerSyncNuxtModuleOptions {
  /**
   * enable diagnostics
   *
   * @default "false"
   */
  useDiagnostics?: boolean
}

export default defineNuxtModule<PowerSyncNuxtModuleOptions>({
  meta: {
    name: 'powersync-nuxt',
    configKey: 'powersync',
  },
  // Default configuration options of the Nuxt module
  defaults: {
    useDiagnostics: false,
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    nuxt.options.runtimeConfig.public.powerSyncModuleOptions = defu(

      nuxt.options.runtimeConfig.public.powerSyncModuleOptions as any,
      {
        useDiagnostics: options.useDiagnostics,
      },
    )

    await installModule('@nuxt/devtools-ui-kit')
    await installModule('@vueuse/nuxt')

    addPlugin(resolver.resolve('./runtime/plugin.client'))

    // expose the composables
    addImports({
      name: 'NuxtPowerSyncDatabase',
      from: resolver.resolve(
        './runtime/utils/NuxtPowerSyncDatabase',
      ),
    })

    addImports({
      name: 'usePowerSyncInspector',
      from: resolver.resolve('./runtime/composables/usePowerSyncInspector'),
    })

    addImports({
      name: 'usePowerSyncInspectorDiagnostics',
      from: resolver.resolve(
        './runtime/composables/usePowerSyncInspectorDiagnostics',
      ),
    })

    addImports({
      name: 'usePowerSyncKysely',
      from: resolver.resolve('./runtime/composables/usePowerSyncKysely'),
    })

    addImports({
      name: 'useDiagnosticsLogger',
      from: resolver.resolve('./runtime/composables/useDiagnosticsLogger'),
    })

    // From the runtime directory
    addComponentsDir({
      path: resolver.resolve('runtime/components'),
    })

    addLayout(
      resolver.resolve('./runtime/layouts/powersync-inspector-layout.vue'),
      'powersync-inspector-layout',
    )

    extendPages((pages) => {
      pages.push({
        path: '/__powersync-inspector',
        // file: resolver.resolve("#build/pages/__powersync-inspector.vue"),
        file: resolver.resolve('./runtime/pages/__powersync-inspector.vue'),
        name: 'Powersync Inspector',
      })
    })

    addImportsFrom([
      'createPowerSyncPlugin',
      'providePowerSync',
      'usePowerSync',
      'usePowerSyncQuery',
      'usePowerSyncStatus',
      'usePowerSyncWatchedQuery',
      'useQuery',
      'useStatus',
      'useWatchedQuerySubscription',
    ], '@powersync/vue')

    // Ensure the packages are transpiled
    nuxt.options.build.transpile = nuxt.options.build.transpile || []
    nuxt.options.build.transpile.push('reka-ui', '@tanstack/vue-table', '@powersync/web', '@powersync/kysely-driver', '@journeyapps/wa-sqlite')

    nuxt.hooks.hook('prepare:types', ({ references }: { references: any[] }) => {
      references.push({ types: '@powersync/web' })
      references.push({ types: '@powersync/kysely-driver' })
      references.push({ types: '@journeyapps/wa-sqlite' })
    })

    setupDevToolsUI(nuxt)
  },
})
