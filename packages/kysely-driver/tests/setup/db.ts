import { Schema, PowerSyncDatabase, column, Table } from '@powersync/web';

const users = new Table({
  name: column.text
});

export const TestSchema = new Schema({ users });

export const getPowerSyncDb = () => {
  const database = new PowerSyncDatabase({
    database: {
      dbFilename: 'test.db'
    },
    schema: TestSchema
  });

  return database;
};
