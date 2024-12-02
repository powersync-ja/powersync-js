import { wrapPowerSyncWithDrizzle, type PowerSyncSQLiteDatabase } from './sqlite/db';
import { toCompilableQuery } from './utils/compilableQuery';
import {
  DrizzleAppSchema,
  toPowerSyncTable,
  type DrizzleTablePowerSyncOptions,
  type DrizzleTableWithPowerSyncOptions,
  type Expand,
  type ExtractPowerSyncColumns,
  type TableName,
  type TablesFromSchemaEntries
} from './utils/schema';

export {
  DrizzleAppSchema,
  DrizzleTablePowerSyncOptions,
  DrizzleTableWithPowerSyncOptions,
  Expand,
  ExtractPowerSyncColumns,
  PowerSyncSQLiteDatabase,
  TableName,
  TablesFromSchemaEntries,
  toCompilableQuery,
  toPowerSyncTable,
  wrapPowerSyncWithDrizzle
};
