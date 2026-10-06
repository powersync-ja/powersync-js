import { PowerSyncDatabase, WASQLiteVFS } from '@powersync/web';
import { v4 as uuid } from 'uuid';
import { describe, expect, it } from 'vitest';
import { defaultTestLogger } from './utils/logger.js';
import { TEST_SCHEMA } from './utils/test-schema.js';
import { generateTestDb } from './utils/testDb.js';

const BUCKET = 'powersync-test';

async function namesIn(directory: FileSystemDirectoryHandle): Promise<string[]> {
  const names: string[] = [];
  for await (const name of (directory as any).keys()) {
    names.push(name);
  }
  return names;
}

async function bucketDirectory(): Promise<FileSystemDirectoryHandle> {
  const bucket = await (navigator as any).storageBuckets.open(BUCKET);
  return bucket.getDirectory();
}

describe('storageBucket', { sequential: true }, () => {
  const supportedVfs = [WASQLiteVFS.AccessHandlePoolVFS, WASQLiteVFS.OPFSCoopSyncVFS, WASQLiteVFS.OPFSWriteAheadVFS];

  for (const vfs of supportedVfs) {
    describe(vfs, () => {
      it('keeps the database files in the bucket', async () => {
        const dbFilename = `${uuid()}.db`;
        const db = generateTestDb({
          schema: TEST_SCHEMA,
          logger: defaultTestLogger,
          database: { dbFilename, vfs, storageBucket: BUCKET }
        });
        await db.execute('INSERT INTO assets(id, description) VALUES(uuid(), ?)', ['in the bucket']);
        expect(await db.getAll('SELECT description FROM assets')).toEqual([{ description: 'in the bucket' }]);

        // AccessHandlePoolVFS keeps its files in a directory named after the database.
        expect(await namesIn(await bucketDirectory())).toContain(dbFilename);
        expect(await namesIn(await navigator.storage.getDirectory())).not.toContain(dbFilename);
      });

      it('keeps apart from a database of the same name in the default bucket', async () => {
        const dbFilename = `${uuid()}.db`;
        const inBucket = generateTestDb({
          schema: TEST_SCHEMA,
          logger: defaultTestLogger,
          database: { dbFilename, vfs, storageBucket: BUCKET }
        });
        const inDefault = generateTestDb({
          schema: TEST_SCHEMA,
          logger: defaultTestLogger,
          database: { dbFilename: vfs == WASQLiteVFS.AccessHandlePoolVFS ? `${uuid()}.db` : dbFilename, vfs }
        });

        await inBucket.execute('INSERT INTO assets(id, description) VALUES(uuid(), ?)', ['bucket']);
        await inDefault.execute('INSERT INTO assets(id, description) VALUES(uuid(), ?)', ['default']);
        await inDefault.execute('INSERT INTO assets(id, description) VALUES(uuid(), ?)', ['default']);

        expect(await inBucket.getAll('SELECT description FROM assets')).toEqual([{ description: 'bucket' }]);
        expect(await inDefault.getAll('SELECT description FROM assets')).toEqual([
          { description: 'default' },
          { description: 'default' }
        ]);
      });
    });
  }

  it('rejects a VFS that does not keep its files in OPFS', () => {
    expect(
      () =>
        new PowerSyncDatabase({
          schema: TEST_SCHEMA,
          logger: defaultTestLogger,
          database: { dbFilename: `${uuid()}.db`, vfs: WASQLiteVFS.IDBBatchAtomicVFS, storageBucket: BUCKET }
        })
    ).toThrow("The 'storageBucket' option needs an OPFS-based VFS");
  });
});
