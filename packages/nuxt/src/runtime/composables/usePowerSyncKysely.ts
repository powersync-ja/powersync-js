import { wrapPowerSyncWithKysely } from '@powersync/kysely-driver'
import { usePowerSync } from '@powersync/vue'

/**
 * Provides a Kysely-wrapped PowerSync database for type-safe database queries.
 * 
 * This composable wraps the PowerSync database instance with Kysely's type-safe query builder,
 * allowing you to write type-safe SQL queries with full TypeScript support.
 * 
 * @typeParam T - Your database type (from your schema)
 * 
 * @returns Kysely database instance (not `{ db }`)
 * 
 * @example
 * ```typescript
 * import { usePowerSyncKysely } from '@powersync/nuxt'
 * import { type Database } from '../powersync/AppSchema'
 * 
 * // Returns db directly, not { db }
 * const db = usePowerSyncKysely<Database>()
 * 
 * // Use Kysely query builder
 * const users = await db.selectFrom('users').selectAll().execute()
 * ```
 */
export const usePowerSyncKysely = <T>() => {
  const powerSync = usePowerSync()

  const db = wrapPowerSyncWithKysely<T>(powerSync.value)

  return db
}
