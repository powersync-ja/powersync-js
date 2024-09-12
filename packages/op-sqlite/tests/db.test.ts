import { DBAdapter } from '@powersync/common/src/db/DBAdapter';
import { OPSqliteOpenFactory } from '../src/index';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

let factory: OPSqliteOpenFactory;
let db: DBAdapter;

export function registerBaseTests() {
  beforeEach(async () => {
    try {
      if (db) {
        db.close();
      }

      factory = new OPSqliteOpenFactory({
        dbFilename: 'test.db'
      });

      db = factory.openDB();

      await db.execute('DROP TABLE IF EXISTS User; ');
      await db.execute('CREATE TABLE User ( id INT PRIMARY KEY, name TEXT NOT NULL, age INT, networth REAL) STRICT;');

      await db.execute('CREATE TABLE IF NOT EXISTS t1(id INTEGER PRIMARY KEY, a INTEGER, b INTEGER, c TEXT)');
    } catch (e) {
      console.warn('error on before each', e);
    }
  });

  describe('PowerSync', () => {
    it('should load the extension', async () => {
      const rs = await db.execute('select powersync_rs_version() as version');
      // TODO: Check the version?
      // expect(rs.rows.item(0).version).to.equal('0.2.0...');
    });
  });
}
