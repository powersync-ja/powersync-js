import { column, PowerSyncDatabase, Schema, TableV2, WebPowerSyncDatabaseOptions } from '@powersync/web';
import { v4 as uuid } from 'uuid';
import { onTestFinished } from 'vitest';

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

export const generateTestDb = (options?: WebPowerSyncDatabaseOptions) => {
  const resolvedOptions = options ?? {
    database: {
      dbFilename: `${uuid()}.db`
    },
    schema: testSchema,
    flags: {
      enableMultiTabs: false
    }
  };

  const db = new PowerSyncDatabase(resolvedOptions);

  onTestFinished(async () => {
    if (db.closed) {
      return;
    }
    await db.disconnectAndClear();
    await db.close();
  });

  return db;
};

export type TestDatabase = (typeof testSchema)['types'];
