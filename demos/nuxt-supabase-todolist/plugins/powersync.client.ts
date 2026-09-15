import { PowerSyncDatabase } from '@powersync/web'
import {
  AppSchemaWithDiagnostics,
} from '~/powersync/AppSchema'
import { SupabaseConnector } from '~/powersync/SuperbaseConnector'
export default defineNuxtPlugin({
  async setup(nuxtApp) {
    const db = new PowerSyncDatabase({
      database: {
        dbFilename: 'a-db-name.sqlite',
      },
      schema: AppSchemaWithDiagnostics,
    })

    const connector = new SupabaseConnector()

    await db.init()

    // Enables the core diagnostics stream (per-bucket totals in the diagnostics UI).
    await db.connect(connector, { diagnostics: true })

    const plugin = createPowerSyncPlugin({ database: db })

    nuxtApp.vueApp.use(plugin)
  },
})
