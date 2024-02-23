import { Kysely } from 'kysely';
import { PowerSyncDialect } from '../../src/sqlite/sqlite-dialect';
import { Database } from './types';
import {
  Column,
  ColumnType,
  Schema,
  Table,
  WASQLitePowerSyncDatabaseOpenFactory
} from '@journeyapps/powersync-sdk-web';

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

export const getKyselyDb = () =>
  new Kysely<Database>({
    dialect: new PowerSyncDialect({
      db: getPowerSyncDb()
    })
  });
