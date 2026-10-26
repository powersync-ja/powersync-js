import { PowerSyncDatabase, WASQLiteVFS } from '@powersync/web';
import { v4 as uuid } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { StorageBucketManagerLike, vfsOptionsForStorageBucket } from '../src/db/adapters/wa-sqlite/vfs.js';
import { defaultTestLogger } from './utils/logger.js';
import { TEST_SCHEMA } from './utils/test-schema.js';
import { generateTestDb } from './utils/testDb.js';

const BUCKET = 'powersync-test';

// Reads through the writer connection. A reader connection of OPFSWriteAheadVFS can briefly miss a write that just
// finished, with or without a bucket, so a read straight after a write would make these tests flaky.
function descriptions(db: PowerSyncDatabase): Promise<{ description: string }[]> {
  return db.writeTransaction((tx) => tx.getAll<{ description: string }>('SELECT description FROM assets'));
}

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
    describe.skipIf(!('storageBuckets' in navigator))(vfs, () => {
      it('keeps the database files in the bucket', async () => {
        const dbFilename = `${uuid()}.db`;
        const db = generateTestDb({
          schema: TEST_SCHEMA,
          logger: defaultTestLogger,
          database: { dbFilename, vfs, storageBucket: BUCKET }
        });
        await db.execute('INSERT INTO assets(id, description) VALUES(uuid(), ?)', ['in the bucket']);
        expect(await descriptions(db)).toEqual([{ description: 'in the bucket' }]);

        // AccessHandlePoolVFS keeps its files in a directory named after the database.
        expect(await namesIn(await bucketDirectory())).toContain(dbFilename);
        expect(await namesIn(await navigator.storage.getDirectory())).not.toContain(dbFilename);
      });

      it('keeps apart from a database of the same name in the default bucket', async () => {
        // The same name on purpose, although the option's documentation advises against it: this shows that the
        // files and the VFS locks of the two databases stay apart.
        const dbFilename = `${uuid()}.db`;
        const inBucket = generateTestDb({
          schema: TEST_SCHEMA,
          logger: defaultTestLogger,
          database: { dbFilename, vfs, storageBucket: BUCKET }
        });
        const inDefault = generateTestDb({
          schema: TEST_SCHEMA,
          logger: defaultTestLogger,
          database: { dbFilename, vfs }
        });

        await inBucket.execute('INSERT INTO assets(id, description) VALUES(uuid(), ?)', ['bucket']);
        await inDefault.execute('INSERT INTO assets(id, description) VALUES(uuid(), ?)', ['default']);
        await inDefault.execute('INSERT INTO assets(id, description) VALUES(uuid(), ?)', ['default']);

        expect(await descriptions(inBucket)).toEqual([{ description: 'bucket' }]);
        expect(await descriptions(inDefault)).toEqual([{ description: 'default' }, { description: 'default' }]);
      });
    });
  }

  describe('vfsOptionsForStorageBucket', () => {
    it('gives the VFS no options without a bucket name', () => {
      expect(vfsOptionsForStorageBucket(undefined)).toEqual({});
      expect(vfsOptionsForStorageBucket(undefined, null)).toEqual({});
    });

    it('opens the bucket for the root directory and prefixes lock names with the bucket name', async () => {
      const directory = {} as FileSystemDirectoryHandle;
      const bucket = { getDirectory: vi.fn(async () => directory) };
      const buckets: StorageBucketManagerLike = { open: vi.fn(async () => bucket) };

      const options = vfsOptionsForStorageBucket('app-data', buckets);
      expect(options.prefix).toBe('app-data:');
      expect(buckets.open).not.toHaveBeenCalled();

      // Each call opens the bucket again, so a bucket the browser deleted is created again.
      expect(await options.getRoot!()).toBe(directory);
      expect(await options.getRoot!()).toBe(directory);
      expect(buckets.open).toHaveBeenCalledTimes(2);
      expect(buckets.open).toHaveBeenCalledWith('app-data');
    });

    it('fails without the Storage Buckets API', () => {
      expect(() => vfsOptionsForStorageBucket('app-data', null)).toThrow(
        "The 'storageBucket' option needs the Storage Buckets API"
      );
    });
  });

  it('rejects a bucket name the Storage Buckets API would not accept', () => {
    expect(
      () =>
        new PowerSyncDatabase({
          schema: TEST_SCHEMA,
          logger: defaultTestLogger,
          database: { dbFilename: `${uuid()}.db`, vfs: WASQLiteVFS.OPFSWriteAheadVFS, storageBucket: 'Not-Valid' }
        })
    ).toThrow('is not a valid Storage Bucket name');
  });

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
