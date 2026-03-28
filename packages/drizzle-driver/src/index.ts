import {
  wrapPowerSyncWithDrizzle,
  type DrizzleQuery,
  type PowerSyncDrizzleConfig,
  type PowerSyncSQLiteDatabase
} from './sqlite/PowerSyncSQLiteDatabase.js';
import { toCompilableQuery } from './utils/compilableQuery.js';
import {
  DrizzleAppSchema,
  toPowerSyncTable,
  type DrizzleAppSchemaOptions,
  type DrizzleTablePowerSyncOptions,
  type DrizzleTableWithPowerSyncOptions,
  type Expand,
  type ExtractPowerSyncColumns,
  type TableName,
  type TablesFromSchemaEntries
} from './utils/schema.js';

export {
  DrizzleAppSchema,
  DrizzleAppSchemaOptions,
  DrizzleQuery,
  DrizzleTablePowerSyncOptions,
  DrizzleTableWithPowerSyncOptions,
  Expand,
  ExtractPowerSyncColumns,
  PowerSyncDrizzleConfig,
  PowerSyncSQLiteDatabase,
  TableName,
  TablesFromSchemaEntries,
  toCompilableQuery,
  toPowerSyncTable,
  wrapPowerSyncWithDrizzle
};
