import { describe, expect, it } from 'vitest';
import { AbstractPowerSyncDatabase } from '@powersync/common';
import {
  PowerSyncDatabase,
  WASQLiteDBAdapter,
  WASQLitePowerSyncDatabaseOpenFactory,
  WASQLiteOpenFactory
} from '@powersync/web';
import { testSchema } from './utils/testDb';

const testId = '2290de4f-0488-4e50-abed-f8e8eb1d0b42';

export const basicTest = async (db: AbstractPowerSyncDatabase) => {
  await db.execute('INSERT INTO assets(id, description) VALUES(?, ?)', [testId, 'test']);
  expect(await db.getAll('SELECT * FROM assets')).length.gt(0);
  await db.disconnectAndClear();
  await db.close();
};

describe('Open Methods', () => {
  it('Should open PowerSync clients from old factory methods', async () => {
    const db = new WASQLitePowerSyncDatabaseOpenFactory({
      dbFilename: `test-legacy.db`,
      schema: testSchema
    }).getInstance();

    await basicTest(db);
  });

  it('Should open with an existing DBAdapter', async () => {
    const adapter = new WASQLiteDBAdapter({ dbFilename: 'adapter-test.db' });
    const db = new PowerSyncDatabase({ database: adapter, schema: testSchema });

    await basicTest(db);
  });

  it('Should open with provided factory', async () => {
    const factory = new WASQLiteOpenFactory({ dbFilename: 'factory-test.db' });
    const db = new PowerSyncDatabase({ database: factory, schema: testSchema });

    await basicTest(db);
  });

  it('Should open with options', async () => {
    const db = new PowerSyncDatabase({ database: { dbFilename: 'options-test.db' }, schema: testSchema });

    await basicTest(db);
  });
});
