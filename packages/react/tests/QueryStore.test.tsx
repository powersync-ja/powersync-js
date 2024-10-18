import { beforeEach, describe, expect, it } from 'vitest';
import { generateQueryKey, getQueryStore, QueryStore } from '../src/QueryStore';
import { AbstractPowerSyncDatabase, SQLWatchOptions } from '@powersync/common';

describe('QueryStore', () => {
  describe('generateQueryKey', () => {
    it('should generate the correct key for given inputs', () => {
      const sqlStatement = 'SELECT * FROM users WHERE id = ?';
      const parameters = [1];
      const options: SQLWatchOptions = { tables: ['users'] };

      const key = generateQueryKey(sqlStatement, parameters, options);
      expect(key).toBe('SELECT * FROM users WHERE id = ? -- [1] -- {"tables":["users"]}');
    });

    it('should generate different keys for different parameters', () => {
      const sqlStatement = 'SELECT * FROM users WHERE id = ?';
      const parameters1 = [1];
      const parameters2 = [2];
      const options = {};

      const key1 = generateQueryKey(sqlStatement, parameters1, options);
      const key2 = generateQueryKey(sqlStatement, parameters2, options);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different options', () => {
      const sqlStatement = 'SELECT * FROM users WHERE id = ?';
      const parameters = [1];
      const options1: SQLWatchOptions = { tables: ['users'] };
      const options2: SQLWatchOptions = { tables: ['local_users'] };

      const key1 = generateQueryKey(sqlStatement, parameters, options1);
      const key2 = generateQueryKey(sqlStatement, parameters, options2);

      expect(key1).not.toBe(key2);
    });
  });
});

describe('QueryStore', () => {
  let db: AbstractPowerSyncDatabase;
  let store: QueryStore;
  let query: any;
  let options: SQLWatchOptions;

  beforeEach(() => {
    db = createMockDatabase();
    store = new QueryStore(db);
    query = {};
    options = {};
  });

  it('should return cached query if available', () => {
    const key = 'test-key';
    const watchedQuery1 = store.getQuery(key, query, options);
    const watchedQuery2 = store.getQuery(key, query, options);

    expect(watchedQuery1).toBe(watchedQuery2);
  });

  it('should create new query if not cached', () => {
    const key1 = 'test-key-1';
    const key2 = 'test-key-2';

    const watchedQuery1 = store.getQuery(key1, query, options);
    const watchedQuery2 = store.getQuery(key2, query, options);

    expect(watchedQuery1).not.toBe(watchedQuery2);
  });
});

describe('getQueryStore', () => {
  it('should return the same store for the same database', () => {
    const db = createMockDatabase();
    const store1 = getQueryStore(db);
    const store2 = getQueryStore(db);

    expect(store1).toBe(store2);
  });

  it('should return different stores for different databases', () => {
    const db1 = createMockDatabase();
    const db2 = createMockDatabase();
    const store1 = getQueryStore(db1);
    const store2 = getQueryStore(db2);

    expect(store1).not.toBe(store2);
  });
});

function createMockDatabase() {
  return {} as AbstractPowerSyncDatabase;
}
