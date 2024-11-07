import { AbstractPowerSyncDatabase, QueryResult } from '@powersync/common';
import { DefaultLogger } from 'drizzle-orm/logger';
import {
  createTableRelationsHelpers,
  extractTablesRelationalConfig,
  ExtractTablesWithRelations,
  type RelationalSchemaConfig,
  type TablesRelationalConfig
} from 'drizzle-orm/relations';
import { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core/db';
import { SQLiteAsyncDialect } from 'drizzle-orm/sqlite-core/dialect';
import type { DrizzleConfig } from 'drizzle-orm/utils';
import { PowerSyncSQLiteSession, PowerSyncSQLiteTransactionConfig } from './sqlite-session';

export interface PowerSyncSQLiteDatabase<TSchema extends Record<string, unknown> = Record<string, never>>
  extends BaseSQLiteDatabase<'async', QueryResult, TSchema> {
  transaction<T>(
    transaction: (
      tx: SQLiteTransaction<'async', QueryResult, TSchema, ExtractTablesWithRelations<TSchema>>
    ) => Promise<T>,
    config?: PowerSyncSQLiteTransactionConfig
  ): Promise<T>;
}

export function wrapPowerSyncWithDrizzle<TSchema extends Record<string, unknown> = Record<string, never>>(
  db: AbstractPowerSyncDatabase,
  config: DrizzleConfig<TSchema> = {}
): PowerSyncSQLiteDatabase<TSchema> {
  const dialect = new SQLiteAsyncDialect();
  let logger;
  if (config.logger === true) {
    logger = new DefaultLogger();
  } else if (config.logger !== false) {
    logger = config.logger;
  }

  let schema: RelationalSchemaConfig<TablesRelationalConfig> | undefined;
  if (config.schema) {
    const tablesConfig = extractTablesRelationalConfig(config.schema, createTableRelationsHelpers);
    schema = {
      fullSchema: config.schema,
      schema: tablesConfig.tables,
      tableNamesMap: tablesConfig.tableNamesMap
    };
  }

  const session = new PowerSyncSQLiteSession(db, dialect, schema, {
    logger
  });
  return new BaseSQLiteDatabase('async', dialect, session, schema) as PowerSyncSQLiteDatabase<TSchema>;
}
