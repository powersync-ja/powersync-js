import {
  ANDROID_DATABASE_PATH,
  IOS_LIBRARY_PATH,
  open,
  OPSQLite,
  type DB,
} from '@op-engineering/op-sqlite';
import { DBAdapter, SQLOpenFactory, SQLOpenOptions } from '@powersync/common';
import { NativeModules, Platform } from 'react-native';
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
    //This is needed because an undefined dbLocation will cause the open function to fail
    const location = this.getDbLocation(dbLocation);
    console.log('opening', dbFilename);
    let DB: DB;
    try {
      DB = open({
        name: dbFilename,
        location: location,
      });
      console.log('opened', dbFilename);
    } catch (ex) {
      if (ex.message.includes('one JS connection per database')) {
        console.log('Error opening database', ex);
        DB.close();
        console.log('reopening', dbFilename);
        DB = open({
          name: dbFilename,
          location: location,
        });
      }
    }

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

    this.loadExtension(DB);

    DB.execute('SELECT powersync_init()');

    const readConnections: OPSQLiteConnection[] = [];
    for (let i = 0; i < READ_CONNECTIONS; i++) {
      // Workaround to create read-only connections
      let baseName = dbFilename.slice(0, dbFilename.lastIndexOf('.'));
      let dbName = './'.repeat(i + 1) + baseName + `.db`;
      const conn = this.openConnection(location, dbName);
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

  protected openConnection(
    dbLocation: string,
    filenameOverride?: string
  ): OPSQLiteConnection {
    const { dbFilename } = this.options;
    let DB: DB;
    try {
      DB = open({
        name: filenameOverride ?? dbFilename,
        location: dbLocation,
      });
    } catch (ex) {
      if (ex.message.includes('one JS connection per database')) {
        console.log('Error opening connection', ex);
        OPSQLite.open;
        console.log('reopening connection', filenameOverride ?? dbFilename);
        DB = open({
          name: filenameOverride ?? dbFilename,
          location: dbLocation,
        });
      }
    }

    //Load extension for all connections
    this.loadExtension(DB);

    DB.execute('SELECT powersync_init()');

    return new OPSQLiteConnection({
      baseDB: DB,
    });
  }

  private getDbLocation(dbLocation?: string): string {
    if (Platform.OS === 'ios') {
      return dbLocation ?? IOS_LIBRARY_PATH;
    } else {
      return dbLocation ?? ANDROID_DATABASE_PATH;
    }
  }

  private openDatabase(dbFilename: string): DB {
    const DB = open({
      name: dbFilename,
      // location: dbLocation fails when undefined
    });
    return DB;
  }

  private loadExtension(DB: DB) {
    if (Platform.OS === 'ios') {
      const bundlePath: string =
        NativeModules.PowerSyncOpSqlite.getBundlePathSync();
      const libPath = `${bundlePath}/Frameworks/powersync-sqlite-core.framework/powersync-sqlite-core`;
      DB.loadExtension(libPath, 'sqlite3_powersync_init');
    } else {
      DB.loadExtension('libpowersync', 'sqlite3_powersync_init');
    }
  }
}
