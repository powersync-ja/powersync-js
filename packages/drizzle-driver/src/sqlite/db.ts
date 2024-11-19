import {
  AbstractPowerSyncDatabase,
  QueryResult,
  runOnSchemaChange,
  SQLWatchOptions,
  WatchHandler
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
import { PowerSyncSQLiteSession, PowerSyncSQLiteTransactionConfig } from './sqlite-session';

type WatchQuery = { toSQL(): Query; execute(): Promise<any> };

export interface PowerSyncSQLiteDatabase<TSchema extends Record<string, unknown> = Record<string, never>>
  extends BaseSQLiteDatabase<'async', QueryResult, TSchema> {
  transaction<T>(
    transaction: (
      tx: SQLiteTransaction<'async', QueryResult, TSchema, ExtractTablesWithRelations<TSchema>>
    ) => Promise<T>,
    config?: PowerSyncSQLiteTransactionConfig
  ): Promise<T>;

  watch(query: WatchQuery, handler?: WatchHandler, options?: SQLWatchOptions): void;
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

  const watch = (query: WatchQuery, handler?: WatchHandler, options?: SQLWatchOptions): void => {
    const { onResult, onError = (e: Error) => {} } = handler ?? {};
    if (!onResult) {
      throw new Error('onResult is required');
    }

    const watchQuery = async (abortSignal: AbortSignal) => {
      try {
        const toSql = query.toSQL();
        const resolvedTables = await db.resolveTables(toSql.sql, toSql.params, options);

        // Fetch initial data
        const result = await query.execute();
        onResult(result);

        db.onChangeWithCallback(
          {
            onChange: async () => {
              try {
                const result = await query.execute();
                onResult(result);
              } catch (error: any) {
                onError(error);
              }
            },
            onError
          },
          {
            ...(options ?? {}),
            tables: resolvedTables,
            // Override the abort signal since we intercept it
            signal: abortSignal
          }
        );
      } catch (error: any) {
        onError(error);
      }
    };

    runOnSchemaChange(watchQuery, db, options);
  };

  const baseDatabase = new BaseSQLiteDatabase('async', dialect, session, schema) as PowerSyncSQLiteDatabase<TSchema>;
  return Object.assign(baseDatabase, {
    watch: (query: WatchQuery, handler?: WatchHandler, options?: SQLWatchOptions) => watch(query, handler, options)
  });
}
