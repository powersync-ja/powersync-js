import { DB, open } from '@op-engineering/op-sqlite';
import { DBAdapter, SQLOpenFactory, SQLOpenOptions } from '@powersync/common';
import { OPSQliteDBAdapter } from './OPSqliteAdapter';
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

    DB.loadExtension('powersync-sqlite-core', 'sqlite3_powersync_init');

    return new OPSQliteDBAdapter({
      name: dbFilename,
      readConnections: new Array().fill(READ_CONNECTIONS).map(() => this.openConnection()),
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

    DB.loadExtension('powersync-sqlite-core', 'sqlite3_powersync_init');

    // TODO setup WAL and read mode

    return new OPSQLiteConnection({
      baseDB: DB
    });
  }
}
