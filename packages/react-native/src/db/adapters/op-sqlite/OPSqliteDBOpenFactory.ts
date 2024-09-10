import { DB, open } from '@op-engineering/op-sqlite';
import { DBAdapter, SQLOpenFactory, SQLOpenOptions } from '@powersync/common';
import { OPSQLiteDBAdapter } from './OPSqliteAdapter';
import { OPSQLiteConnection } from './OPSQLiteConnection';

const READ_CONNECTIONS = 5;

export class OPSqliteOpenFactory implements SQLOpenFactory {
  constructor(protected options: SQLOpenOptions) {}

  openDB(): DBAdapter {
    const { dbFilename } = this.options;
    const openOptions = { location: this.options.dbLocation };
    console.log('opening', dbFilename);

    let DB: DB;
    DB = open({
      name: dbFilename
      //   location: this.options.dbLocation
    });

    DB.loadExtension('libpowersync', 'sqlite3_powersync_init');

    console.log(DB.execute('SELECT powersync_rs_version()'));

    // TODO setup WAL and read mode
    let statements: string[] = [];

    statements.push('PRAGMA busy_timeout = 30000');

    statements.push('PRAGMA journal_mode = WAL');

    let defaultJournalSize = 6 * 1024 * 1024;

    statements.push(`PRAGMA journal_size_limit = ${defaultJournalSize}`);

    statements.push('PRAGMA synchronous = NORMAL');

    for (let statement of statements) {
      for (let tries = 0; tries < 30; tries++) {
        try {
          DB.execute(statement);
          console.log(`Executed statement ${statement}`);
          break;
        } catch (e) {
          console.log('Error executing statement', statement, e);
          console.log(`${e}`);
          // if (e instanceof sqlite.SqliteException && e.resultCode === sqlite.SqlError.SQLITE_BUSY && tries < 29) {
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

    DB.loadExtension('libpowersync', 'sqlite3_powersync_init');

    return new OPSQLiteConnection({
      baseDB: DB
    });
  }
}
