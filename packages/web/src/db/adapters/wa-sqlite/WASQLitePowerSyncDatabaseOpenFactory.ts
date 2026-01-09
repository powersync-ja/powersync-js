import { AbstractPowerSyncDatabase, DBAdapter, PowerSyncDatabaseOptions } from '@powersync/common';
import { PowerSyncDatabase } from '../../../db/PowerSyncDatabase.js';
import { AbstractWebPowerSyncDatabaseOpenFactory } from '../AbstractWebPowerSyncDatabaseOpenFactory.js';
import { WASQLiteOpenFactory } from './WASQLiteOpenFactory.js';

/**
 * @deprecated {@link PowerSyncDatabase} can now be constructed directly
 * @example
 * ```typescript
 * const powersync = new PowerSyncDatabase({database: {
 *  dbFileName: 'powersync.db'
 * }});
 * ```
 */
export class WASQLitePowerSyncDatabaseOpenFactory extends AbstractWebPowerSyncDatabaseOpenFactory {
  protected openDB(): DBAdapter {
    const factory = new WASQLiteOpenFactory(this.options);
    return factory.openDB();
  }

  generateInstance(options: PowerSyncDatabaseOptions): AbstractPowerSyncDatabase {
    return new PowerSyncDatabase(options);
  }
}
