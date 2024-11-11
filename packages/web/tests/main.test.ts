import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  /**
   * Declares a test to be executed with multiple DB connections
   */
  const itWithDBs = (name: string, test: (db: AbstractPowerSyncDatabase) => Promise<void>) => {
    it(`${name} - with web worker`, () => test(dbWithWebWorker));
    it(`${name} - without web worker`, () => test(dbWithoutWebWorker));
  };

  afterEach(async () => {
    await dbWithWebWorker.disconnectAndClear();
    await dbWithWebWorker.close();
    await dbWithoutWebWorker.disconnectAndClear();
    await dbWithoutWebWorker.close();
  });

  describe('executeQuery', () => {
    itWithDBs('should execute a select query using getAll', async (db) => {
      const result = await db.getAll('SELECT * FROM customers');
      expect(result.length).toEqual(0);
    });

    itWithDBs('should allow inserts', async (db) => {
      const testName = 'Steven';
      await db.execute('INSERT INTO customers (id, name) VALUES(?, ?)', [uuid(), testName]);
      const result = await db.get<TestDatabase['customers']>('SELECT * FROM customers');

      expect(result.name).equals(testName);
    });
  });

  describe('executeBatchQuery', () => {
    itWithDBs('should execute a select query using getAll', async (db) => {
      const result = await db.getAll('SELECT * FROM customers');
      expect(result.length).toEqual(0);
    });

    itWithDBs('should allow batch inserts', async (db) => {
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
  });
});
