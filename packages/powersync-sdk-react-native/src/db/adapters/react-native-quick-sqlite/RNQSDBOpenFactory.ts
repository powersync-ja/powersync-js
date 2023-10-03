import { open } from '@journeyapps/react-native-quick-sqlite';

import {
  AbstractPowerSyncDatabase,
  AbstractPowerSyncDatabaseOpenFactory,
  DBAdapter,
  PowerSyncDatabaseOptions
} from '@journeyapps/powersync-sdk-common';
import { PowerSyncDatabase } from '../../../db/PowerSyncDatabase';
import { RNQSDBAdapter } from './RNQSDBAdapter';

export class RNQSPowerSyncDatabaseOpenFactory extends AbstractPowerSyncDatabaseOpenFactory {
  protected openDB(): DBAdapter {
    /**
     * React Native Quick SQLite opens files relative to the `Documents`dir on iOS and the `Files`
     * dir on Android. Locations need to be relative to those dirs using with dot ("../") notation
     * to navigate up the directory tree.
     * This simple adapter assumes any platform specific relative directory is already catered for
     * in the options (if provided)
     * https://github.com/margelo/react-native-quick-sqlite/blob/main/README.md#loading-existing-dbs
     */
    return new RNQSDBAdapter(open({ name: this.options.dbFilename, location: this.options.dbLocation }));
  }

  generateInstance(options: PowerSyncDatabaseOptions): AbstractPowerSyncDatabase {
    return new PowerSyncDatabase(options);
  }
}
