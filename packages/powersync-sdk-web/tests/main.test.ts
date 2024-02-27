import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AbstractPowerSyncDatabase, Column, ColumnType, Schema, Table } from '@journeyapps/powersync-sdk-common';
import { v4 as uuid } from 'uuid';
import { WASQLitePowerSyncDatabaseOpenFactory } from '@journeyapps/powersync-sdk-web';
// TODO import tests from a common package

type User = {
  name: string;
};

describe('Basic', () => {
  const factory = new WASQLitePowerSyncDatabaseOpenFactory({
    dbFilename: 'test.db',
    flags: {
      enableMultiTabs: false
    },
    schema: new Schema([
      new Table({
        name: 'users',
        columns: [new Column({ name: 'name', type: ColumnType.TEXT })]
      })
    ])
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
});
