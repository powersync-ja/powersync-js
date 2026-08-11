import { describe, expect, test } from 'vitest';
import { generateTestDb } from '../../utils/testDb.js';
import { DatabaseSource, Schema, WASQLiteOpenFactory, WASQLiteVFS } from '@powersync/web';
import { InMemoryWriteAheadLogPool } from '../../../lib/db/adapters/memory-pool/client.js';
import { TEST_SCHEMA } from '../../utils/test-schema.js';
import { defaultLogLevel, defaultTestLogger } from '../../utils/logger.js';

describe('OPFS', () => {
  describeCommonWalTests((name) => ({
    factory: new WASQLiteOpenFactory({
      open: {
        dbFilename: name,
        vfs: WASQLiteVFS.OPFSWriteAheadVFS,
        additionalReaders: 1,
        databaseWorkerLogLevel: defaultLogLevel
      },
      logger: defaultTestLogger
    })
  }));
});

describe('in-memory', () => {
  describeCommonWalTests(() => ({
    opened: new InMemoryWriteAheadLogPool({ numWorkers: 2 })
  }));

  test('throws without workers', () => {
    expect(() => new InMemoryWriteAheadLogPool({ numWorkers: 0 })).toThrow();
  });

  describe('handles OOM errors', () => {
    test('in WAL', async () => {
      const adapter = new InMemoryWriteAheadLogPool({ numWorkers: 1, maxWriteAheadLogSize: 4096 });

      // This creates an initial page.
      await adapter.executeRaw('PRAGMA user_version = 10;');

      // This creates two pages in a single transaction, which fails due to the short WAL.
      await expect(adapter.executeRaw('CREATE TABLE users (name TEXT);')).rejects.toThrow('database or disk is full');

      // The database should still be usable though
      expect(await adapter.get('PRAGMA user_version')).toStrictEqual({ user_version: 10 });
      expect(await adapter.getAll('SELECT * FROM sqlite_schema')).toHaveLength(0);
    });

    test('in checkpoint', async () => {
      const adapter = new InMemoryWriteAheadLogPool({
        numWorkers: 1,
        maxDatabaseSize: 4096,
        maxWriteAheadLogSize: 4096 * 4
      });

      await adapter.executeRaw('PRAGMA user_version = 10;');
      await expect(adapter.executeRaw('CREATE TABLE users (name TEXT);')).rejects.toThrow();

      expect(await adapter.get('PRAGMA user_version')).toStrictEqual({ user_version: 10 });
      expect(await adapter.getAll('SELECT * FROM sqlite_schema')).toHaveLength(0);
    });
  });
});

function describeCommonWalTests(generateSource: (name: string) => DatabaseSource) {
  test('supports concurrent reads', async () => {
    const db = generateTestDb({
      ...generateSource('basic-opfs.sqlite'),
      schema: TEST_SCHEMA
    });

    const changes = db.onChange({ tables: ['customers'] })[Symbol.asyncIterator]();

    await db.writeTransaction(async (tx) => {
      expect(await db.getAll('SELECT * FROM customers')).toHaveLength(0);
      await tx.execute('INSERT INTO customers (id, name) VALUES (uuid(), ?)', ['name']);

      expect(await db.getAll('SELECT * FROM customers')).toHaveLength(0); // No commit yet...
    });

    await changes.next();
    expect(await db.getAll('SELECT * FROM customers')).toHaveLength(1);

    // Despite only using one additional read connection, we should be able to support two concurrent readers by using
    // the write connection too.
    await db.readLock(async (ctx1) => {
      await db.readLock(async (ctx2) => {
        await Promise.all([ctx1.execute('SELECT 1'), ctx2.execute('SELECT 2')]);
      });
    });

    // We can't use concurrent write transactions, but we should be able to abort.
    await db.writeLock(async () => {
      // Acquiring a second write lock with a timeout should throw.
      await expect(db.writeTransaction(async () => {}, 100)).rejects.toThrow('timed out');
    });
  });

  test('can update schema', async () => {
    const db = generateTestDb({
      ...generateSource('replace-schema.sqlite'),
      schema: TEST_SCHEMA
    });

    await db.init();
    await db.updateSchema(new Schema({}));
  });
}
