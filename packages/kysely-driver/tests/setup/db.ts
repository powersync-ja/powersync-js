import { Schema, TableV2, WASQLitePowerSyncDatabaseOpenFactory, column } from '@journeyapps/powersync-sdk-web';
import { wrapPowerSyncWithKysely } from '../../src/sqlite/db';
import { Database } from './types';

const users = new TableV2({
  name: column.text
});

export const TestSchema = new Schema({ users });

export const getPowerSyncDb = () => {
  const factory = new WASQLitePowerSyncDatabaseOpenFactory({
    dbFilename: 'test.db',
    schema: TestSchema
  });

  return factory.getInstance();
};

export const getKyselyDb = wrapPowerSyncWithKysely<Database>(getPowerSyncDb());
