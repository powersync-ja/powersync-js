import { AbstractPowerSyncDatabase, Schema, TableV2, column } from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

type SchemaVersionResult = {
  schema_version: number;
};

const assets = new TableV2(
  {
    created_at: column.text,
    make: column.text,
    model: column.text,
    serial_number: column.text,
    quantity: column.integer,
    user_id: column.text,
    weightColumnName: column.real,
    description: column.text
  },
  {
    indexes: { makemodel: ['make', 'model'] }
  }
);
const assetsNoIndex = new TableV2({
  created_at: column.text,
  make: column.text,
  model: column.text,
  serial_number: column.text,
  quantity: column.integer,
  user_id: column.text,
  weightColumnName: column.real,
  description: column.text
});
const customers = new TableV2({
  name: column.text,
  email: column.text
});
const logs = new TableV2(
  {
    level: column.text,
    content: column.text
  },
  { insertOnly: true }
);
const credentials = new TableV2(
  {
    key: column.text,
    value: column.text
  },
  { localOnly: true }
);
const aliased = new TableV2({ name: column.text }, { viewName: 'test1' });

/**
 * The default schema
 */
const schema = new Schema({ assets, customers, logs, credentials, aliased });

describe('Schema Tests', { sequential: true }, () => {
  let powersync: AbstractPowerSyncDatabase;

  beforeEach(async () => {
    powersync = new PowerSyncDatabase({
      /**
       * Deleting the IndexDB seems to freeze the test.
       * Use a new DB for each run to keep CRUD counters
       * consistent
       */
      database: { dbFilename: 'test.db' },
      schema,
      flags: {
        enableMultiTabs: false
      }
    });
  });

  afterEach(async () => {
    await powersync.disconnectAndClear();
    await powersync.close();
  });

  it('Schema versioning', async () => {
    // Test that powersync_replace_schema() is a no-op when the schema is not
    // modified.
    const versionBefore = await powersync.get<SchemaVersionResult>('PRAGMA schema_version');
    await powersync.updateSchema(schema);
    const versionAfter = await powersync.get<SchemaVersionResult>('PRAGMA schema_version');

    // No change
    expect(versionAfter['schema_version']).equals(versionBefore['schema_version']);

    // Remove a table
    const schema2 = new Schema({ assets, customers, logs, credentials });

    await powersync.updateSchema(schema2);

    const versionAfter2 = await powersync.get<SchemaVersionResult>('PRAGMA schema_version');

    // Updated
    expect(versionAfter2['schema_version']).greaterThan(versionAfter['schema_version']);
  });

  it('Indexing', async () => {
    const results = await powersync.execute('EXPLAIN QUERY PLAN SELECT * FROM assets WHERE make = ?', ['test']);

    expect(results.rows?._array?.[0]['detail']).contains('USING INDEX ps_data__assets__makemodel');

    // Now drop the index
    const schema2 = new Schema({ assetsNoIndex, customers, logs, credentials, aliased });
    await powersync.updateSchema(schema2);

    // Execute instead of getAll so that we don't get a cached query plan
    // from a different connection
    const results2 = await powersync.execute('EXPLAIN QUERY PLAN SELECT * FROM assetsNoIndex WHERE make = ?', ['test']);

    expect(results2.rows?._array?.[0]['detail']).contains('SCAN');
  });

  it('Local Only', async () => {
    const pscrudBeforeInsert = await powersync.getAll('SELECT * FROM ps_crud');
    expect(pscrudBeforeInsert.length).toEqual(0);

    await powersync.execute('INSERT INTO credentials (id, key, value) VALUES(uuid(),?,?)', ['test', 'test']);

    const pscrudAfterInsert = await powersync.getAll('SELECT * FROM ps_crud');
    expect(pscrudAfterInsert.length).toEqual(0);
  });

  it('Insert Only', async () => {
    const pscrudBeforeInsert = await powersync.getAll('SELECT * FROM ps_crud');
    expect(pscrudBeforeInsert.length).toEqual(0);
    const logsBeforeInsert = await powersync.getAll('SELECT * FROM logs');
    expect(logsBeforeInsert.length).toEqual(0);

    await powersync.execute('INSERT INTO logs (id, level, content) VALUES(uuid(),?,?)', ['test', 'test']);

    const pscrudAfterInsert = await powersync.getAll('SELECT * FROM ps_crud');
    expect(pscrudAfterInsert.length).toEqual(1);
    const logsAfterInsert = await powersync.getAll('SELECT * FROM logs');
    expect(logsAfterInsert.length).toEqual(0);
  });

  it('ViewName', async () => {
    const aliasedTable = await powersync.getAll('SELECT * FROM test1');
    expect(Array.isArray(aliasedTable)).toBe(true);
  });
});
