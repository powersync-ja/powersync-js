import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AbstractPowerSyncDatabase } from '@powersync/common';
import { v4 as uuid } from 'uuid';
import { TestDatabase, generateTestDb } from './utils/testDb';
// TODO import tests from a common package

describe('Basic', () => {
  let dbWithoutWebWorker: AbstractPowerSyncDatabase;
  let dbWithWebWorker: AbstractPowerSyncDatabase;

  beforeEach(() => {
    dbWithoutWebWorker = generateTestDb({ useWebWorker: false });
    dbWithWebWorker = generateTestDb();
  });

  afterEach(async () => {
    await dbWithWebWorker.disconnectAndClear();
    await dbWithWebWorker.close();
    await dbWithoutWebWorker.disconnectAndClear();
    await dbWithoutWebWorker.close();
  });

  describe('executeQuery', () => {
    it('should execute a select query using getAll', async () => {
      const result = await dbWithWebWorker.getAll('SELECT * FROM customers');
      expect(result.length).toEqual(0);

      const result2 = await dbWithoutWebWorker.getAll('SELECT * FROM customers');
      expect(result2.length).toEqual(0);
    });

    it('should allow inserts', async () => {
      const testName = 'Steven';
      await dbWithWebWorker.execute('INSERT INTO customers (id, name) VALUES(?, ?)', [uuid(), testName]);
      const result = await dbWithWebWorker.get<TestDatabase['customers']>('SELECT * FROM customers');

      expect(result.name).equals(testName);

      const testName2 = 'Steven2';
      await dbWithoutWebWorker.execute('INSERT INTO customers (id, name) VALUES(?, ?)', [uuid(), testName2]);
      const result2 = await dbWithoutWebWorker.get<TestDatabase['customers']>('SELECT * FROM customers');

      expect(result2.name).equals(testName2);
    });
  });

  describe('executeBatchQuery', () => {
    it('should execute a select query using getAll', async () => {
      const result = await dbWithWebWorker.getAll('SELECT * FROM customers');
      expect(result.length).toEqual(0);

      const result2 = await dbWithoutWebWorker.getAll('SELECT * FROM customers');
      expect(result2.length).toEqual(0);
    });

    it('should allow batch inserts', async () => {
      const testName = 'Mugi';
      await dbWithWebWorker.executeBatch('INSERT INTO customers (id, name) VALUES(?, ?)', [
        [uuid(), testName],
        [uuid(), 'Steven'],
        [uuid(), 'Chris']
      ]);
      const result = await dbWithWebWorker.getAll<TestDatabase['customers']>('SELECT * FROM customers');

      expect(result.length).equals(3);
      expect(result[0].name).equals(testName);
      expect(result[1].name).equals('Steven');
      expect(result[2].name).equals('Chris');

      const testName2 = 'Mugi2';
      await dbWithoutWebWorker.executeBatch('INSERT INTO customers (id, name) VALUES(?, ?)', [
        [uuid(), testName2],
        [uuid(), 'Steven2'],
        [uuid(), 'Chris2']
      ]);
      const result2 = await dbWithoutWebWorker.getAll<TestDatabase['customers']>('SELECT * FROM customers');

      expect(result2.length).equals(3);
      expect(result2[0].name).equals(testName2);
      expect(result2[1].name).equals('Steven2');
      expect(result2[2].name).equals('Chris2');
    });
  });
});
