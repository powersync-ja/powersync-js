import { PowerSyncDatabase, WASQLiteOpenFactory, WASQLiteVFS } from '@powersync/web';
import { v4 as uuid } from 'uuid';
import { describe, expect, it } from 'vitest';
import { TestDatabase, generateTestDb, testSchema } from './utils/testDb';
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
      schema: testSchema
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
      schema: testSchema
    })
  )
);

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
  };
}
