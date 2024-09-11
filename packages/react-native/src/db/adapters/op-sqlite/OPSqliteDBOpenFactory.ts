import { DB, open } from '@op-engineering/op-sqlite';
import { DBAdapter, SQLOpenFactory, SQLOpenOptions } from '@powersync/common';
import { OPSQLiteDBAdapter } from './OPSqliteAdapter';
import { OPSQLiteConnection } from './OPSQLiteConnection';
import { SqliteOptions } from './SqliteOptions';

export interface OPSQLiteOpenFactoryOptions extends SQLOpenOptions {
  sqliteOptions?: SqliteOptions;
}

const READ_CONNECTIONS = 5;
const DEFAULT_JOURNAL_SIZE = 6 * 1024 * 1024;

export class OPSqliteOpenFactory implements SQLOpenFactory {
  constructor(protected options: OPSQLiteOpenFactoryOptions) {}

  openDB(): DBAdapter {
    const sqliteOptions = this.options.sqliteOptions ?? new SqliteOptions();
    const { dbFilename } = this.options;
    const openOptions = { location: this.options.dbLocation };
    console.log('opening', dbFilename);

    let DB: DB;
    DB = open({
      name: dbFilename
      // location: this.options.dbLocation
    });

    // TODO setup read mode
    let statements: string[] = [];

    if (sqliteOptions.lockTimeout != null) {
      statements.push(`PRAGMA busy_timeout = ${sqliteOptions.lockTimeout * 1000}`);
    }

    if (sqliteOptions.journalMode != null) {
      statements.push(`PRAGMA journal_mode = ${sqliteOptions.journalMode}`);
    }

    if (sqliteOptions.journalSizeLimit != null) {
      statements.push(`PRAGMA journal_size_limit = ${sqliteOptions.journalSizeLimit}`);
    }

    if (sqliteOptions.synchronous != null) {
      statements.push(`PRAGMA synchronous = ${sqliteOptions.synchronous}`);
    }

    for (let statement of statements) {
      for (let tries = 0; tries < 30; tries++) {
        try {
          DB.execute(statement);
          break;
        } catch (e) {
          //TODO better error handling for SQLITE_BUSY(5)
          console.log('Error executing pragma statement', statement, e);
          // if (e.errorCode === 5 && tries < 29) {
          //   continue;
          // } else {
          //   throw e;
          // }
        }
      }
    }

    let readConnections: OPSQLiteConnection[] = [];
    for (let i = 0; i < READ_CONNECTIONS; i++) {
      let conn = this.openConnection();
      readConnections.push(conn);
    }

    return new OPSQLiteDBAdapter({
      name: dbFilename,
      readConnections: readConnections,
      writeConnection: this.openConnection()
    });
  }

  protected openConnection() {
    const { dbFilename } = this.options;
    const openOptions = { location: this.options.dbLocation };
    const DB = open({
      name: dbFilename
      //   location: this.options.dbLocation
    });

    //Load extension for all connections
    DB.loadExtension('libpowersync', 'sqlite3_powersync_init');

    return new OPSQLiteConnection({
      baseDB: DB
    });
  }
}
