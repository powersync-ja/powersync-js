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

export const getPowerSyncDb = () => {
  const factory = new WASQLitePowerSyncDatabaseOpenFactory({
    dbFilename: 'test.db',
    schema: new Schema([
      new Table({
        name: 'users',
        columns: [new Column({ name: 'name', type: ColumnType.TEXT })]
      })
    ])
  });

  return factory.getInstance();
};

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const getKyselyDb = () =>
  new Kysely<Database>({
    dialect: new PowerSyncDialect({
      db: getPowerSyncDb()
    })
  });
