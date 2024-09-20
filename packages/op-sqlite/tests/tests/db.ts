import Chance from 'chance';

import { DBAdapter } from '@powersync/common/src/db/DBAdapter';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';

let factory: OPSqliteOpenFactory;
export let testDb: DBAdapter;

const chance = new Chance();

export function resetTestDb() {
  try {
    if (testDb) {
      testDb.close();
    }

    factory = new OPSqliteOpenFactory({
      dbFilename: 'test.db'
    });

    testDb = factory.openDB();
  } catch (e) {
    console.warn('Error resetting user database', e);
  }
}
