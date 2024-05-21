import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AbstractPowerSyncDatabase, Schema, TableV2, column } from '@powersync/common';
import { v4 as uuid } from 'uuid';
import { WASQLitePowerSyncDatabaseOpenFactory } from '@powersync/web';
// TODO import tests from a common package

type User = {
  name: string;
};

const users = new TableV2({
  name: column.text
});

const schema = new Schema({
  users
});

describe('Using Web Worker', () => {
  const factory = new WASQLitePowerSyncDatabaseOpenFactory({
    dbFilename: 'test.db',
    flags: {
      enableMultiTabs: false,
      useWebWorker: true
    },
    schema
  });

  let db: AbstractPowerSyncDatabase;

  beforeEach(() => {
    db = factory.getInstance();
  });

  afterEach(async () => {
    await db.disconnectAndClear();
    await db.close();
  });

  describe('executeQuery', () => {
    it('should execute a select query using getAll', async () => {
      const result = await db.getAll('SELECT * FROM users');
      expect(result.length).toEqual(0);
    });

    it('should allow inserts', async () => {
      const testName = 'Steven';
      await db.execute('INSERT INTO users (id, name) VALUES(?, ?)', [uuid(), testName]);
      const result = await db.get<User>('SELECT * FROM users');

      expect(result.name).equals(testName);
    });
  });

  describe('executeBatchQuery', () => {
    it('should execute a select query using getAll', async () => {
      const result = await db.getAll('SELECT * FROM users');
      expect(result.length).toEqual(0);
    });

    it('should allow batch inserts', async () => {
      const testName = 'Mugi';
      await db.executeBatch('INSERT INTO users (id, name) VALUES(?, ?)', [
        [uuid(), testName],
        [uuid(), 'Steven'],
        [uuid(), 'Chris']
      ]);
      const result = await db.getAll<User>('SELECT * FROM users');

      expect(result.length).equals(3);
      expect(result[0].name).equals(testName);
      expect(result[1].name).equals('Steven');
      expect(result[2].name).equals('Chris');
    });
  });
});

describe('Without Web Worker', () => {
  const factory = new WASQLitePowerSyncDatabaseOpenFactory({
    dbFilename: 'test.db',
    flags: {
      enableMultiTabs: false,
      useWebWorker: false
    },
    schema
  });

  let db: AbstractPowerSyncDatabase;

  beforeEach(() => {
    db = factory.getInstance();
  });

  afterEach(async () => {
    await db.disconnectAndClear();
    await db.close();
  });

  describe('executeQuery', () => {
    it('should execute a select query using getAll', async () => {
      const result = await db.getAll('SELECT * FROM users');
      expect(result.length).toEqual(0);
    });

    it('should allow inserts', async () => {
      const testName = 'Steven';
      await db.execute('INSERT INTO users (id, name) VALUES(?, ?)', [uuid(), testName]);
      const result = await db.get<User>('SELECT * FROM users');

      expect(result.name).equals(testName);
    });
  });

  describe('executeBatchQuery', () => {
    it('should execute a select query using getAll', async () => {
      const result = await db.getAll('SELECT * FROM users');
      expect(result.length).toEqual(0);
    });

    it('should allow batch inserts', async () => {
      const testName = 'Mugi';
      await db.executeBatch('INSERT INTO users (id, name) VALUES(?, ?)', [
        [uuid(), testName],
        [uuid(), 'Steven'],
        [uuid(), 'Chris']
      ]);
      const result = await db.getAll<User>('SELECT * FROM users');

      expect(result.length).equals(3);
      expect(result[0].name).equals(testName);
      expect(result[1].name).equals('Steven');
      expect(result[2].name).equals('Chris');
    });
  });
});
