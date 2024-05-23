import { column, Schema, TableV2, WASQLitePowerSyncDatabaseOpenFactory } from '@powersync/web';
import { v4 as uuid } from 'uuid';

const assets = new TableV2(
  {
    created_at: column.text,
    make: column.text,
    model: column.text,
    serial_number: column.text,
    quantity: column.integer,
    user_id: column.text,
    customer_id: column.text,
    description: column.text
  },
  { indexes: { makemodel: ['make, model'] } }
);

const customers = new TableV2({
  name: column.text,
  email: column.text
});

export const testSchema = new Schema({ assets, customers });

export const dbFactory = new WASQLitePowerSyncDatabaseOpenFactory({
  dbFilename: 'test-bucket-storage.db',
  flags: {
    enableMultiTabs: false
  },
  schema: testSchema
});

export const generateTestDb = ({ useWebWorker } = { useWebWorker: true }) => {
  const db = new WASQLitePowerSyncDatabaseOpenFactory({
    /**
     * Deleting the IndexDB seems to freeze the test.
     * Use a new DB for each run to keep CRUD counters
     * consistent
     */
    dbFilename: `test-crud-${uuid()}.db`,
    schema: testSchema,
    flags: {
      enableMultiTabs: false,
      useWebWorker
    }
  }).getInstance();

  return db;
};

export type TestDatabase = (typeof testSchema)['types'];
