import { AbstractPowerSyncDatabase, Column, ColumnType, Index, IndexedColumn, Schema, Table } from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

type SchemaVersionResult = {
  schema_version: number;
};

/**
 * Generates the Asset table with configurable options which
 * will be modified later.
 */
const generateAssetsTable = (weightColumnName: string = 'weight', includeIndexes = true, indexAscending = true) =>
  new Table({
    name: 'assets',
    columns: [
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'make', type: ColumnType.TEXT }),
      new Column({ name: 'model', type: ColumnType.TEXT }),
      new Column({ name: 'serial_number', type: ColumnType.TEXT }),
      new Column({ name: 'quantity', type: ColumnType.INTEGER }),
      new Column({ name: 'user_id', type: ColumnType.TEXT }),
      new Column({ name: weightColumnName, type: ColumnType.REAL }),
      new Column({ name: 'description', type: ColumnType.TEXT })
    ],
    indexes: includeIndexes
      ? [
          new Index({
            name: 'makemodel',
            columns: [
              new IndexedColumn({
                name: 'make'
              }),
              new IndexedColumn({ name: 'model', ascending: indexAscending })
            ]
          })
        ]
      : []
  });

/**
 * Generates all the schema tables.
 * Allows for a custom assets table generator to be supplied.
 */
const generateSchemaTables = (assetsTableGenerator: () => Table = generateAssetsTable) => [
  assetsTableGenerator(),
  new Table({
    name: 'customers',
    columns: [new Column({ name: 'name', type: ColumnType.TEXT }), new Column({ name: 'email', type: ColumnType.TEXT })]
  }),
  new Table({
    name: 'logs',
    insertOnly: true,
    columns: [
      new Column({ name: 'level', type: ColumnType.TEXT }),
      new Column({ name: 'content', type: ColumnType.TEXT })
    ]
  }),

  new Table({
    name: 'credentials',
    localOnly: true,
    columns: [new Column({ name: 'key', type: ColumnType.TEXT }), new Column({ name: 'value', type: ColumnType.TEXT })]
  }),
  new Table({
    name: 'aliased',
    columns: [new Column({ name: 'name', type: ColumnType.TEXT })],
    viewName: 'test1'
  })
];

/**
 * The default schema
 */
const schema = new Schema(generateSchemaTables());

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

    // The `weight` columns is now `weights`
    const schema2 = new Schema(generateSchemaTables(() => generateAssetsTable('weights')));

    await powersync.updateSchema(schema2);

    const versionAfter2 = await powersync.get<SchemaVersionResult>('PRAGMA schema_version');

    // Updated
    expect(versionAfter2['schema_version']).greaterThan(versionAfter['schema_version']);

    // The index is now descending
    const schema3 = new Schema(generateSchemaTables(() => generateAssetsTable('weights', true, false)));

    await powersync.updateSchema(schema3);

    const versionAfter3 = await powersync.get<SchemaVersionResult>('PRAGMA schema_version');

    // Updated
    expect(versionAfter3['schema_version']).greaterThan(versionAfter2['schema_version']);
  });

  it('Indexing', async () => {
    const results = await powersync.execute('EXPLAIN QUERY PLAN SELECT * FROM assets WHERE make = ?', ['test']);

    expect(results.rows?._array?.[0]['detail']).contains('USING INDEX ps_data__assets__makemodel');

    // Now drop the index
    const schema2 = new Schema(generateSchemaTables(() => generateAssetsTable('weight', false)));
    await powersync.updateSchema(schema2);

    // Execute instead of getAll so that we don't get a cached query plan
    // from a different connection
    const results2 = await powersync.execute('EXPLAIN QUERY PLAN SELECT * FROM assets WHERE make = ?', ['test']);

    expect(results2.rows?._array?.[0]['detail']).contains('SCAN');
  });
});
