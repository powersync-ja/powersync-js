import {
  PowerSyncDatabase,
  WASQLiteOpenFactory,
  WASQLiteVFS,
  WebPowerSyncDatabaseOptionsWithOpenFactory,
  WebPowerSyncDatabaseOptionsWithSettings
} from '@powersync/web';
import { v4 as uuid } from 'uuid';
import { describe, expect, it } from 'vitest';
import { testSchema } from './utils/testDb.js';

describe('Encryption Tests', { sequential: true }, () => {
  it('IDBBatchAtomicVFS encryption', async () => {
    await testEncryption({
      schema: testSchema,
      database: { dbFilename: 'iddb-file.db' },
      encryptionKey: 'iddb-key'
    });
  });

  it('OPFSCoopSyncVFS encryption', async () => {
    await testEncryption({
      schema: testSchema,
      database: new WASQLiteOpenFactory({
        dbFilename: 'opfs-file.db',
        vfs: WASQLiteVFS.OPFSCoopSyncVFS,
        encryptionKey: 'opfs-key'
      })
    });
  });

  it('AccessHandlePoolVFS encryption', async () => {
    await testEncryption({
      schema: testSchema,
      database: new WASQLiteOpenFactory({
        dbFilename: 'ahp-file.db',
        vfs: WASQLiteVFS.AccessHandlePoolVFS,
        encryptionKey: 'ahp-key'
      })
    });
  });
});

/**
 * The open/close and open again flow is an easy way to verify that encryption is working.
 */
const testEncryption = async (
  options: WebPowerSyncDatabaseOptionsWithSettings | WebPowerSyncDatabaseOptionsWithOpenFactory
) => {
  let powersync = new PowerSyncDatabase(options as any);

  await powersync.init();
  await powersync.close();

  powersync = new PowerSyncDatabase(options as any);

  await powersync.init();
  await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);
  const results = await powersync.getAll('SELECT * FROM assets');
  expect(results.length).toBe(1);

  await powersync.disconnectAndClear();
  await powersync.close();
};
