import { DBAdapter, SQLOpenFactory, SQLOpenOptions } from '@powersync/common';
import { RNQSDBAdapter } from './RNQSDBAdapter';

/**
 * Opens a SQLite connection using React Native Quick SQLite
 */
export class ReactNativeQuickSqliteOpenFactory implements SQLOpenFactory {
  constructor(protected options: SQLOpenOptions) {}

  openDB(): DBAdapter {
    /**
     * React Native Quick SQLite opens files relative to the `Documents`dir on iOS and the `Files`
     * dir on Android. Locations need to be relative to those dirs using with dot ("../") notation
     * to navigate up the directory tree.
     * This simple adapter assumes any platform specific relative directory is already catered for
     * in the options (if provided)
     * https://github.com/margelo/react-native-quick-sqlite/blob/main/README.md#loading-existing-dbs
     */

    try {
      var rnqs = require('@journeyapps/react-native-quick-sqlite');
    } catch (e) {
      throw new Error(`Could not resolve @journeyapps/react-native-quick-sqlite.
To open databases with React Native Quick SQLite please install @journeyapps/react-native-quick-sqlite.`);
    }
    const { dbFilename } = this.options;
    const openOptions = { location: this.options.dbLocation };
    let DB;
    try {
      // Hot reloads can sometimes clear global JS state, but not close DB on native side
      DB = rnqs.open(dbFilename, openOptions);
    } catch (ex) {
      if (ex.message.includes('already open')) {
        rnqs.QuickSQLite.close(dbFilename);
        DB = rnqs.open(dbFilename, openOptions);
      } else {
        throw ex;
      }
    }

    return new RNQSDBAdapter(DB, this.options.dbFilename);
  }
}
