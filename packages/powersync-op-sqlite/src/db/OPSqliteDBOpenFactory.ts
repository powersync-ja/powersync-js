import { DBAdapter, SQLOpenFactory, SQLOpenOptions } from '@powersync/common';
import { OPSQLiteDBAdapter } from './OPSqliteAdapter';
import { DEFAULT_SQLITE_OPTIONS, SqliteOptions } from './SqliteOptions';

export interface OPSQLiteOpenFactoryOptions extends SQLOpenOptions {
  sqliteOptions?: SqliteOptions;
}
export class OPSqliteOpenFactory implements SQLOpenFactory {
  private sqliteOptions: Required<SqliteOptions>;

  constructor(protected options: OPSQLiteOpenFactoryOptions) {
    this.sqliteOptions = {
      ...DEFAULT_SQLITE_OPTIONS,
      ...this.options.sqliteOptions
    };
  }

  openDB(): DBAdapter {
    return new OPSQLiteDBAdapter({
      name: this.options.dbFilename,
      dbLocation: this.options.dbLocation,
      sqliteOptions: this.sqliteOptions
    });
  }
}
