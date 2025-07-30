import { AbstractPowerSyncDatabase, column, PowerSyncDatabase, Schema, Table } from '@powersync/web';
import { SQLJSOpenFactory } from '../../src/SQLJSAdapter';

const AppSchema = new Schema({
  users: new Table({
    name: column.text,
    age: column.integer,
    networth: column.real
  }),
  t1: new Table({
    a: column.integer,
    b: column.integer,
    c: column.text
  })
});

export const getPowerSyncDb = () => {
  const database = new PowerSyncDatabase({
    database: new SQLJSOpenFactory({
      dbFilename: 'powersync-test.db',
      persister: {
        // in-memory db
        readFile: async () => null,
        writeFile: async () => {}
      }
    }),

    schema: AppSchema
  });

  return database;
};
