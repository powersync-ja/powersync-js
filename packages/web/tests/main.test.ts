import { createLogger, LogLevel, PowerSyncDatabase, WASQLiteOpenFactory, WASQLiteVFS } from '@powersync/web';
import { v4 as uuid } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { TEST_SCHEMA, TestDatabase } from './utils/test-schema.js';
import { generateTestDb } from './utils/testDb.js';
// TODO import tests from a common package

describe(
  'Basic - With Web Workers',
  { sequential: true },
  describeBasicTests(() => generateTestDb())
);

describe(
  'Basic - Without Web Workers',
  { sequential: true },
  describeBasicTests(() =>
    generateTestDb({
      database: {
        dbFilename: 'basic-no-worker.sqlite'
      },
      flags: {
        useWebWorker: false
      },
      schema: TEST_SCHEMA
    })
  )
);

describe(
  'Basic - With OPFS',
  { sequential: true },
  describeBasicTests(() =>
    generateTestDb({
      database: new WASQLiteOpenFactory({
        dbFilename: 'basic-opfs.sqlite',
        vfs: WASQLiteVFS.OPFSCoopSyncVFS
      }),
      schema: TEST_SCHEMA
    })
  )
);

describe('Basic - with in-memory', () => {
  function generateFactory() {
    return new WASQLiteOpenFactory({
      dbFilename: 'in-memory.db',
      vfs: WASQLiteVFS.InMemoryVfs
    });
  }

  describe(
    'in shared worker',
    { sequential: true },
    describeBasicTests(() =>
      generateTestDb({
        schema: TEST_SCHEMA,
        database: generateFactory()
      })
    )
  );

  describe(
    'in dedicated worker',
    describeBasicTests(() =>
      generateTestDb({
        schema: TEST_SCHEMA,
        database: generateFactory(),
        flags: {
          enableMultiTabs: false
        }
      })
    )
  );

  describe(
    'in local tab',
    describeBasicTests(() =>
      generateTestDb({
        schema: TEST_SCHEMA,
        database: generateFactory(),
        flags: {
          enableMultiTabs: false,
          useWebWorker: false
        }
      })
    )
  );
});

it('should log worker errors', async () => {
  const logger = createLogger('test', { logLevel: LogLevel.TRACE });
  const logMessages: string[] = [];
  (logger as any).invoke = (level: any, args: any) => {
    logMessages.push(args[0]);
  };

  const db = new PowerSyncDatabase({
    schema: TEST_SCHEMA,
    logger,
    database: new WASQLiteOpenFactory({
      worker: '/does_not_exist.js',
      dbFilename: 'test.db',
      logger
    })
  });

  // This will never resolve due to the broken worker.
  db.init();

  await vi.waitFor(() => {
    expect(logMessages).toEqual(
      expect.arrayContaining(['Error in database or sync worker, this likely disrupts PowerSync.'])
    );
  });
});

describe('can use long path names', () => {
  const testedVfs = [
    WASQLiteVFS.IDBBatchAtomicVFS,
    WASQLiteVFS.AccessHandlePoolVFS,
    WASQLiteVFS.OPFSCoopSyncVFS,
    WASQLiteVFS.OPFSWriteAheadVFS,
    WASQLiteVFS.InMemoryVfs
  ];

  for (const vfs of testedVfs) {
    describe(vfs, () => {
      it('should be able to use database names exceeding 64 characters', async () => {
        const db = generateTestDb({
          schema: TEST_SCHEMA,
          database: new WASQLiteOpenFactory({
            dbFilename: vfs + 'a'.repeat(70),
            vfs
          })
        });
        await db.init();
      });

      it('throws when opening database with path exceeding 112 characters', async () => {
        expect(() => {
          new PowerSyncDatabase({
            schema: TEST_SCHEMA,
            database: new WASQLiteOpenFactory({
              dbFilename: vfs + 'a'.repeat(112),
              vfs
            })
          });
        }).toThrow('dbFilename too long (max length is 112)');
      });
    });
  }
});

function describeBasicTests(generateDB: () => PowerSyncDatabase) {
  return () => {
    it('should execute a select query using getAll', async () => {
      const db = generateDB();

      const result = await db.getAll('SELECT * FROM customers');
      expect(result.length).toEqual(0);
    });

    it('should allow inserts', async () => {
      const db = generateDB();

      const testName = 'Steven';
      await db.execute('INSERT INTO customers (id, name) VALUES(?, ?)', [uuid(), testName]);
      const result = await db.get<TestDatabase['customers']>('SELECT * FROM customers');

      expect(result.name).equals(testName);
    });

    it('should execute a select query using getAll', async () => {
      const db = generateDB();

      const result = await db.getAll('SELECT * FROM customers');
      expect(result.length).toEqual(0);
    });

    it('should allow batch inserts', async () => {
      const db = generateDB();

      const testName = 'Mugi';
      await db.executeBatch('INSERT INTO customers (id, name) VALUES(?, ?)', [
        [uuid(), testName],
        [uuid(), 'Steven'],
        [uuid(), 'Chris']
      ]);
      const result = await db.getAll<TestDatabase['customers']>('SELECT * FROM customers');

      expect(result.length).equals(3);
      expect(result[0].name).equals(testName);
      expect(result[1].name).equals('Steven');
      expect(result[2].name).equals('Chris');
    });

    it('can use readTransaction', async () => {
      const db = generateDB();
      await db.execute('INSERT INTO customers (id, name) VALUES (uuid(), ?)', ['name']);
      const names = await db.readTransaction(async (tx) => {
        return await tx.getAll<{ name: string }>('SELECT name FROM customers');
      });
      expect(names).deep.equal([{ name: 'name' }]);
    });

    it('can abort', async () => {
      const db = generateDB();

      await db.writeLock(async () => {
        // Acquiring a second write lock with a timeout should throw.
        await expect(db.writeTransaction(async () => {}, 100)).rejects.toThrow('timed out');
      });
    });
  };
}
