import { wrapPowerSyncWithDrizzle, type PowerSyncSQLiteDatabase } from './sqlite/db';
import { toCompilableQuery } from './utils/compilableQuery';
import {
  toPowerSyncSchema,
  toPowerSyncTable,
  type DrizzleTablePowerSyncOptions,
  type DrizzleTableWithPowerSyncOptions,
  type Expand,
  type ExtractPowerSyncColumns,
  type TableName,
  type TablesFromSchemaEntries
} from './utils/schema';

export {
  DrizzleTablePowerSyncOptions,
  DrizzleTableWithPowerSyncOptions,
  Expand,
  ExtractPowerSyncColumns,
  PowerSyncSQLiteDatabase,
  TableName,
  TablesFromSchemaEntries,
  toCompilableQuery,
  toPowerSyncSchema,
  toPowerSyncTable,
  wrapPowerSyncWithDrizzle
};
