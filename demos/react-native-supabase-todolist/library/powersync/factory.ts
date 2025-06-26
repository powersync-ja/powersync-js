import { DBAdapter, SQLOpenFactory, SQLOpenOptions } from '@powersync/common';

import { OPSqliteOpenFactory, OPSQLiteOpenFactoryOptions } from '@powersync/op-sqlite';
import { ExpoAdapter } from './adapter';

export class ExpoFactory extends OPSqliteOpenFactory {
  constructor(protected options: OPSQLiteOpenFactoryOptions) {
    super(options);
    // this.sqliteOptions = {
    //   ...DEFAULT_SQLITE_OPTIONS,
    //   ...this.options.sqliteOptions
    // };
  }

  openDB(): DBAdapter {
    return new ExpoAdapter({
      name: this.options.dbFilename,
      dbLocation: this.options.dbLocation,
      sqliteOptions: this.sqliteOptions
    });
  }
}
