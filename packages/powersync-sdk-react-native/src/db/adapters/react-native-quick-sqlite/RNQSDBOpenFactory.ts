import { open, QuickSQLite, QuickSQLiteConnection } from '@journeyapps/react-native-quick-sqlite';

import {
  AbstractPowerSyncDatabase,
  AbstractPowerSyncDatabaseOpenFactory,
  DBAdapter,
  PowerSyncDatabaseOptions,
  PowerSyncOpenFactoryOptions
} from '@journeyapps/powersync-sdk-common';
import { PowerSyncDatabase } from '../../../db/PowerSyncDatabase';
import { RNQSDBAdapter } from './RNQSDBAdapter';

export class RNQSPowerSyncDatabaseOpenFactory extends AbstractPowerSyncDatabaseOpenFactory {
  protected instanceGenerated: boolean;

  constructor(options: PowerSyncOpenFactoryOptions) {
    super(options);
    this.instanceGenerated = false;
  }
  protected openDB(): DBAdapter {
    /**
     * React Native Quick SQLite opens files relative to the `Documents`dir on iOS and the `Files`
     * dir on Android. Locations need to be relative to those dirs using with dot ("../") notation
     * to navigate up the directory tree.
     * This simple adapter assumes any platform specific relative directory is already catered for
     * in the options (if provided)
     * https://github.com/margelo/react-native-quick-sqlite/blob/main/README.md#loading-existing-dbs
     */
    const { dbFilename } = this.options;
    const openOptions = { location: this.options.dbLocation };
    let DB: QuickSQLiteConnection;
    try {
      // Hot reloads can sometimes clear global JS state, but not close DB on native side
      DB = open(dbFilename, openOptions);
    } catch (ex) {
      if (ex.message.includes('already open')) {
        QuickSQLite.close(dbFilename);
        DB = open(dbFilename, openOptions);
      } else {
        throw ex;
      }
    }

    return new RNQSDBAdapter(DB, this.options.dbFilename);
  }

  generateInstance(options: PowerSyncDatabaseOptions): AbstractPowerSyncDatabase {
    if (this.instanceGenerated) {
      this.options.logger?.warn('Generating multiple PowerSync instances can sometimes cause unexpected results.');
    }
    this.instanceGenerated = true;
    return new PowerSyncDatabase(options);
  }
}
