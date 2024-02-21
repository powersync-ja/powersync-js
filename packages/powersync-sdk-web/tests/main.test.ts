import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AbstractPowerSyncDatabase, Column, ColumnType, Schema, Table } from '@journeyapps/powersync-sdk-common';
import { WASQLitePowerSyncDatabaseOpenFactory } from '@journeyapps/powersync-sdk-web';

// TODO import tests from a common package

describe('Basic', () => {
  const factory = new WASQLitePowerSyncDatabaseOpenFactory({
    dbFilename: 'test.db',
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

  afterEach(() => {
    db.close();
  });

  describe('executeQuery', () => {
    it('should execute a select query using getAll', async () => {
      const result = await db.getAll('SELECT * FROM users');
      expect(result.length).toEqual(0);
    });
  });
});
