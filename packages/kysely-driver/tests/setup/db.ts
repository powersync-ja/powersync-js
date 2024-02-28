import {
  Column,
  ColumnType,
  Schema,
  Table,
  WASQLitePowerSyncDatabaseOpenFactory
} from '@journeyapps/powersync-sdk-web';
import { wrapPowerSyncWithKysely } from '../../src/sqlite/db';
import { Database } from './types';

const TestSchema = new Schema([
  new Table({
    name: 'users',
    columns: [new Column({ name: 'name', type: ColumnType.TEXT })]
  })
]);

export const getPowerSyncDb = () => {
  const factory = new WASQLitePowerSyncDatabaseOpenFactory({
    dbFilename: 'test.db',
    schema: TestSchema
  });

  return factory.getInstance();
};

export const getKyselyDb = wrapPowerSyncWithKysely<Database>(getPowerSyncDb());
