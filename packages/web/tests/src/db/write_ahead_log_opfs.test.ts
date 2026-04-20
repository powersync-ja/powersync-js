import { expect, test } from 'vitest';
import { generateTestDb } from '../../utils/testDb.js';
import { WASQLiteOpenFactory, WASQLiteVFS } from '@powersync/web';
import { TEST_SCHEMA } from '../../utils/test-schema.js';

test('supports concurrent reads', async () => {
  const db = generateTestDb({
    database: new WASQLiteOpenFactory({
      dbFilename: 'basic-opfs.sqlite',
      vfs: WASQLiteVFS.OPFSWriteAheadVFS,
      additionalReaders: 1
    }),
    schema: TEST_SCHEMA
  });

  await db.writeTransaction(async (tx) => {
    expect(await db.getAll('SELECT * FROM customers')).toHaveLength(0);
    await tx.execute('INSERT INTO customers (id, name) VALUES (uuid(), ?)', ['name']);

    expect(await db.getAll('SELECT * FROM customers')).toHaveLength(0); // No commit yet...
  });

  expect(await db.getAll('SELECT * FROM customers')).toHaveLength(1);

  // Despite only using one additional read connection, we should be able to support two concurrent readers by using
  // the write connection too.
  await db.readLock(async (ctx1) => {
    await db.readLock(async (ctx2) => {
      await Promise.all([ctx1.execute('SELECT 1'), ctx2.execute('SELECT 2')]);
    });
  });
});
