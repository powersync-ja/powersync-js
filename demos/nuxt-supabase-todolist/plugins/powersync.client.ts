import {
  AppSchemaWithDiagnostics,
} from '~/powersync/AppSchema'
import { SupabaseConnector } from '~/powersync/SuperbaseConnector'
import { SyncClientImplementation } from '@powersync/web'


export default defineNuxtPlugin({
  async setup(nuxtApp) {
    const db = new NuxtPowerSyncDatabase({
      database: {
        dbFilename: 'a-db-name.sqlite',
      },
      schema: AppSchemaWithDiagnostics,
    })

    const connector = new SupabaseConnector()

    await db.init()

    await db.connect(connector, {
      clientImplementation: SyncClientImplementation.RUST,
    })

    const plugin = createPowerSyncPlugin({ database: db })

    nuxtApp.vueApp.use(plugin)
  },
})
