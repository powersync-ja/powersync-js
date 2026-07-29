import { LogRecord, PowerSyncDatabase, WASQLiteOpenFactory, WASQLiteVFS } from '@powersync/web';
import { v4 as uuid } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { TEST_SCHEMA, TestDatabase } from './utils/test-schema.js';
import { generateTestDb } from './utils/testDb.js';
import { defaultLogLevel, defaultTestLogger } from './utils/logger.js';
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
        dbFilename: 'basic-no-worker.sqlite',
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
      factory: new WASQLiteOpenFactory({
        logger: defaultTestLogger,
        open: {
          dbFilename: 'basic-opfs.sqlite',
          vfs: WASQLiteVFS.OPFSCoopSyncVFS,
          databaseWorkerLogLevel: defaultLogLevel
        }
      }),
      schema: TEST_SCHEMA
    })
  )
);

describe('Basic - with in-memory', () => {
  const defaultOptions = {
    dbFilename: 'in-memory.db',
    vfs: WASQLiteVFS.InMemoryVfs,
    databaseWorkerLogLevel: defaultLogLevel
  };

  describe(
    'in shared worker',
    { sequential: true },
    describeBasicTests(() =>
      generateTestDb({
        schema: TEST_SCHEMA,
        logger: defaultTestLogger,
        database: {
          ...defaultOptions
        }
      })
    )
  );

  describe(
    'in dedicated worker',
    describeBasicTests(() =>
      generateTestDb({
        schema: TEST_SCHEMA,
        logger: defaultTestLogger,
        database: {
          ...defaultOptions,
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
        logger: defaultTestLogger,
        database: {
          ...defaultOptions,
          enableMultiTabs: false,
          useWebWorker: false
        }
      })
    )
  );
});

it('should log worker errors', async () => {
  const logs: LogRecord[] = [];

  const db = new PowerSyncDatabase({
    schema: TEST_SCHEMA,
    logger: {
      log(record) {
        logs.push(record);
      }
    },
    database: {
      worker: '/does_not_exist.js',
      dbFilename: 'test.db'
    }
  });

  // This will never resolve due to the broken worker.
  db.init();

  await vi.waitFor(() => {
    console.log(logs);

    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Error in database or sync worker, this likely disrupts PowerSync.'
        })
      ])
    );
  });
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
