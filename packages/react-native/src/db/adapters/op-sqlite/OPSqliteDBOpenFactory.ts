import { DB, open } from '@op-engineering/op-sqlite';
import { DBAdapter, SQLOpenFactory, SQLOpenOptions } from '@powersync/common';
import { OPSqliteBAdapter } from './OPSqliteAdapter';

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

    return new OPSqliteBAdapter(DB, this.options.dbFilename);
  }
}
