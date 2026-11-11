import {
  sql,
  type ColumnType,
  type Insertable,
  type JSONColumnType,
  type Kysely,
  type KyselyConfig,
  type Selectable,
  type Updateable
} from 'kysely';
import { PowerSyncKyselyDatabase, wrapPowerSyncWithKysely, type PowerSyncKyselyOptions } from './sqlite/db.js';
import { PowerSyncDialect } from './sqlite/sqlite-dialect.js';
import { PowerSyncDriver, type PowerSyncDialectConfig } from './sqlite/sqlite-driver.js';

export {
  ColumnType,
  Insertable,
  JSONColumnType,
  Kysely,
  KyselyConfig,
  PowerSyncDialect,
  PowerSyncDialectConfig,
  PowerSyncDriver,
  PowerSyncKyselyDatabase,
  PowerSyncKyselyOptions,
  Selectable,
  sql,
  Updateable,
  wrapPowerSyncWithKysely
};
