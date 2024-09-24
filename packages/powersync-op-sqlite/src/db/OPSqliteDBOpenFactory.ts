import { DB, open } from '@op-engineering/op-sqlite';
import { DBAdapter, SQLOpenFactory, SQLOpenOptions } from '@powersync/common';
import { OPSQLiteDBAdapter } from './OPSqliteAdapter';
import { OPSQLiteConnection } from './OPSQLiteConnection';
import { DEFAULT_SQLITE_OPTIONS, SqliteOptions } from './SqliteOptions';

export interface OPSQLiteOpenFactoryOptions extends SQLOpenOptions {
  sqliteOptions?: SqliteOptions;
}

const READ_CONNECTIONS = 5;

export class OPSqliteOpenFactory implements SQLOpenFactory {
  private sqliteOptions: Required<SqliteOptions>;

  constructor(protected options: OPSQLiteOpenFactoryOptions) {
    this.sqliteOptions = {
      ...DEFAULT_SQLITE_OPTIONS,
      ...this.options.sqliteOptions,
    };
  }

  openDB(): DBAdapter {
    const { lockTimeoutMs, journalMode, journalSizeLimit, synchronous } =
      this.sqliteOptions;
    const { dbFilename, dbLocation } = this.options;
    console.log('opening', dbFilename);

    const DB = open({
      name: dbFilename,
      // location: dbLocation fails when undefined
    });

    const statements: string[] = [
      `PRAGMA busy_timeout = ${lockTimeoutMs}`,
      `PRAGMA journal_mode = ${journalMode}`,
      `PRAGMA journal_size_limit = ${journalSizeLimit}`,
      `PRAGMA synchronous = ${synchronous}`,
    ];

    for (const statement of statements) {
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

    //Load extension for all connections
    DB.loadExtension('libpowersync', 'sqlite3_powersync_init');

    DB.execute('SELECT powersync_init()');

    const readConnections: OPSQLiteConnection[] = [];
    for (let i = 0; i < READ_CONNECTIONS; i++) {
      // Workaround to create read-only connections
      let baseName = dbFilename.slice(0, dbFilename.lastIndexOf('.'));
      let dbName = baseName + '\u0020'.repeat(i + 1) + `.db`;
      const conn = this.openConnection(dbName);
      conn.execute('PRAGMA query_only = true');
      readConnections.push(conn);
    }

    const writeConnection = new OPSQLiteConnection({
      baseDB: DB,
    });

    return new OPSQLiteDBAdapter({
      name: dbFilename,
      readConnections: readConnections,
      writeConnection: writeConnection,
    });
  }

  protected openConnection(filenameOverride?: string) {
    const { dbFilename, dbLocation } = this.options;
    const openOptions = { location: dbLocation };
    const DB = open({
      name: filenameOverride ?? dbFilename,
      // location: dbLocation fails when undefined
    });

    //Load extension for all connections
    DB.loadExtension('libpowersync', 'sqlite3_powersync_init');

    DB.execute('SELECT powersync_init()');

    return new OPSQLiteConnection({
      baseDB: DB,
    });
  }
}
