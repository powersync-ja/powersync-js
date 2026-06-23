import { CommonPowerSyncDatabase, IndexedColumn, Schema, Table, column } from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

type SchemaVersionResult = {
  schema_version: number;
};

/**
 * Generates the Asset table with configurable options which
 * will be modified later.
 */
const generateAssetsTable = (weightColumnName: string = 'weight', includeIndexes = true, indexAscending = true) => {
  return new Table(
    {
      created_at: column.text,
      make: column.text,
      model: column.text,
      serial_number: column.text,
      quantity: column.integer,
      user_id: column.text,
      [weightColumnName]: column.real,
      description: column.text
    },
    {
      indexes: includeIndexes
        ? {
            makemodel: ['make', new IndexedColumn({ name: 'model', ascending: indexAscending })]
          }
        : {}
    }
  );
};

/**
 * Generates all the schema tables.
 * Allows for a custom assets table generator to be supplied.
 */
const generateSchema = (assetsTableGenerator: () => Table = generateAssetsTable) => {
  return new Schema({
    assets: assetsTableGenerator(),
    customers: new Table({
      name: column.text,
      email: column.text
    }),
    logs: new Table(
      {
        level: column.text,
        content: column.text
      },
      { insertOnly: true }
    ),
    credentials: new Table(
      {
        key: column.text,
        value: column.text
      },
      { localOnly: true }
    ),
    aliased: new Table({ name: column.text }, { viewName: 'test1' })
  });
};

/**
 * The default schema
 */
const schema = generateSchema();

describe('Schema Tests', { sequential: true }, () => {
  let powersync: CommonPowerSyncDatabase;

  beforeEach(async () => {
    powersync = new PowerSyncDatabase({
      /**
       * Deleting the IndexDB seems to freeze the test.
       * Use a new DB for each run to keep CRUD counters
       * consistent
       */
      database: { dbFilename: 'test.db', enableMultiTabs: false },
      schema
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

    // The `weight` columns is now `weights`
    const schema2 = generateSchema(() => generateAssetsTable('weights'));

    await powersync.updateSchema(schema2);

    const versionAfter2 = await powersync.get<SchemaVersionResult>('PRAGMA schema_version');

    // Updated
    expect(versionAfter2['schema_version']).greaterThan(versionAfter['schema_version']);

    // The index is now descending
    const schema3 = generateSchema(() => generateAssetsTable('weights', true, false));

    await powersync.updateSchema(schema3);

    const versionAfter3 = await powersync.get<SchemaVersionResult>('PRAGMA schema_version');

    // Updated
    expect(versionAfter3['schema_version']).greaterThan(versionAfter2['schema_version']);
  });

  it('Indexing', async () => {
    const results = await powersync.execute('EXPLAIN QUERY PLAN SELECT * FROM assets WHERE make = ?', ['test']);

    expect(results.rows?._array?.[0]['detail']).contains('USING INDEX ps_data__assets__makemodel');

    // Now drop the index
    const schema2 = generateSchema(() => generateAssetsTable('weight', false));
    await powersync.updateSchema(schema2);

    // Execute instead of getAll so that we don't get a cached query plan
    // from a different connection
    const results2 = await powersync.execute('EXPLAIN QUERY PLAN SELECT * FROM assets WHERE make = ?', ['test']);

    expect(results2.rows?._array?.[0]['detail']).contains('SCAN');
  });
});
