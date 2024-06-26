import {
  AbstractPowerSyncDatabase,
  AbstractPowerSyncDatabaseOpenFactory,
  DBAdapter,
  PowerSyncDatabaseOptions,
  PowerSyncOpenFactoryOptions,
  SQLOpenFactory
} from '@powersync/common';
import { PowerSyncDatabase } from '../../../db/PowerSyncDatabase';
import { ReactNativeQuickSqliteOpenFactory } from './ReactNativeQuickSQLiteOpenFactory';

/**
 * @deprecated {@link PowerSyncDatabase} can now be constructed directly
 * @example
 * ```typescript
 * const powersync = new PowerSyncDatabase({
 *  database: {
 *    dbFileName: 'powersync.db'
 *  }
 * });
 * ```
 */
export class RNQSPowerSyncDatabaseOpenFactory extends AbstractPowerSyncDatabaseOpenFactory {
  protected instanceGenerated: boolean;
  protected sqlOpenFactory: SQLOpenFactory;

  constructor(options: PowerSyncOpenFactoryOptions) {
    super(options);
    this.instanceGenerated = false;
    this.sqlOpenFactory = new ReactNativeQuickSqliteOpenFactory(options);
  }

  protected openDB(): DBAdapter {
    return this.sqlOpenFactory.openDB();
  }

  generateInstance(options: PowerSyncDatabaseOptions): AbstractPowerSyncDatabase {
    if (this.instanceGenerated) {
      this.options.logger?.warn('Generating multiple PowerSync instances can sometimes cause unexpected results.');
    }
    this.instanceGenerated = true;
    return new PowerSyncDatabase(options);
  }
}
