import { AbstractPowerSyncDatabase, DBAdapter, PowerSyncDatabaseOptions } from '@powersync/common';
import { PowerSyncDatabase } from '../../../db/PowerSyncDatabase';
import { AbstractWebPowerSyncDatabaseOpenFactory } from '../AbstractWebPowerSyncDatabaseOpenFactory';
import { WASqliteOpenFactory } from './WASqliteOpenFactory';

/**
 * @deprecated {@link PowerSyncDatabase} can now be constructed directly
 * @example
 * ```typescript
 * const powersync = new PowerSyncDatabase({databaseOptions: {
 *  dbFileName: 'powersync.db'
 * }});
 * ```
 */
export class WASQLitePowerSyncDatabaseOpenFactory extends AbstractWebPowerSyncDatabaseOpenFactory {
  protected openDB(): DBAdapter {
    const factory = new WASqliteOpenFactory(this.options);
    return factory.openDB();
  }

  generateInstance(options: PowerSyncDatabaseOptions): AbstractPowerSyncDatabase {
    return new PowerSyncDatabase(options);
  }
}
