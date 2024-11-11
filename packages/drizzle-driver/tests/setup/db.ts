import { Schema, PowerSyncDatabase, column, Table, AbstractPowerSyncDatabase } from '@powersync/web';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { wrapPowerSyncWithDrizzle, PowerSyncSQLiteDatabase } from '../../src/sqlite/db';

const users = new Table({
  name: column.text
});

export const drizzleUsers = sqliteTable('users', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull()
});

export const TestSchema = new Schema({ users });
export const DrizzleSchema = { users: drizzleUsers };

export const getPowerSyncDb = () => {
  const database = new PowerSyncDatabase({
    database: {
      dbFilename: 'test.db'
    },
    schema: TestSchema
  });

  return database;
};

export const getDrizzleDb = (db: AbstractPowerSyncDatabase) => {
  const database = wrapPowerSyncWithDrizzle(db, { schema: DrizzleSchema, logger: { logQuery: () => {} } });

  return database;
};
