import Chance from 'chance';
import { testDb, resetTestDb } from './db';
import { beforeEach, describe, it } from './MochaRNAdapter';
import chai from 'chai';

let expect = chai.expect;
const chance = new Chance();

export function registerUnitTests() {
  beforeEach(() => {
    try {
      resetTestDb();

      testDb.execute('DROP TABLE IF EXISTS User;');
      testDb.execute('CREATE TABLE User ( id REAL PRIMARY KEY, name TEXT NOT NULL, age REAL, networth REAL) STRICT;');
    } catch (e) {
      console.warn('Error resetting user database', e);
    }
  });

  describe('PowerSync', () => {
    it('should load the extension', async () => {
      const rs = await testDb.execute('select powersync_rs_version() as version');
      // TODO: Check the version?
      // expect(rs.rows.item(0).version).to.equal('0.2.0...');
    });
  });
}
