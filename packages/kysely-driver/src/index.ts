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
import { wrapPowerSyncWithKysely, type PowerSyncKyselyDatabase } from './sqlite/db.js';

export {
  ColumnType,
  Insertable,
  JSONColumnType,
  Kysely,
  KyselyConfig,
  PowerSyncKyselyDatabase,
  Selectable,
  sql,
  Updateable,
  wrapPowerSyncWithKysely
};
