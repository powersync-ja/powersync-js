import { wrapPowerSyncWithKysely } from '@powersync/kysely-driver'
import { usePowerSync } from '@powersync/vue'

export const usePowerSyncKysely = <T>() => {
  const powerSync = usePowerSync()

  const db = wrapPowerSyncWithKysely<T>(powerSync.value)

  return db
}
