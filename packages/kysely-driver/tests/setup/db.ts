import { Schema, TableV2, PowerSyncDatabase, column } from '@powersync/web';
import { wrapPowerSyncWithKysely } from '../../src/sqlite/db';
import { Database } from './types';

const users = new TableV2({
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

export const getKyselyDb = wrapPowerSyncWithKysely<Database>(getPowerSyncDb());
