import {
  AbstractPowerSyncDatabase,
  compilableQueryWatch,
  CompilableQueryWatchHandler,
  QueryResult,
  SQLWatchOptions
} from '@powersync/common';
import { Query } from 'drizzle-orm';
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
import { toCompilableQuery } from './../utils/compilableQuery';
import { PowerSyncSQLiteSession, PowerSyncSQLiteTransactionConfig } from './sqlite-session';

type WatchQuery<T> = { toSQL(): Query; execute(): Promise<T> };

export interface PowerSyncSQLiteDatabase<TSchema extends Record<string, unknown> = Record<string, never>>
  extends BaseSQLiteDatabase<'async', QueryResult, TSchema> {
  transaction<T>(
    transaction: (
      tx: SQLiteTransaction<'async', QueryResult, TSchema, ExtractTablesWithRelations<TSchema>>
    ) => Promise<T>,
    config?: PowerSyncSQLiteTransactionConfig
  ): Promise<T>;

  watch<T>(query: WatchQuery<T>, handler?: CompilableQueryWatchHandler<T>, options?: SQLWatchOptions): void;
}

export function wrapPowerSyncWithDrizzle<TSchema extends Record<string, unknown> = Record<string, never>>(
  db: AbstractPowerSyncDatabase,
  config: DrizzleConfig<TSchema> = {}
): PowerSyncSQLiteDatabase<TSchema> {
  const dialect = new SQLiteAsyncDialect({ casing: config.casing });
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

  const baseDatabase = new BaseSQLiteDatabase('async', dialect, session, schema) as PowerSyncSQLiteDatabase<TSchema>;
  return Object.assign(baseDatabase, {
    watch: <T>(query: WatchQuery<T>, handler: CompilableQueryWatchHandler<T>, options?: SQLWatchOptions) => {
      compilableQueryWatch(db, toCompilableQuery(query), handler, options);
    }
  });
}
