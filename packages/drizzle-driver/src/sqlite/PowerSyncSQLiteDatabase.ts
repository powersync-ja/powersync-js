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
  ExtractTablesWithRelations,
  TableRelationalConfig,
  type RelationalSchemaConfig,
  type TablesRelationalConfig
} from 'drizzle-orm/relations';
import * as DrizzleRelations from 'drizzle-orm/relations';
import { SQLiteSession, SQLiteTable, SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core/db';
import { SQLiteAsyncDialect } from 'drizzle-orm/sqlite-core/dialect';
import { RelationalQueryBuilder } from 'drizzle-orm/sqlite-core/query-builders/query';
import type { DrizzleConfig } from 'drizzle-orm/utils';
import { extractFallbackRelations, isDrizzleBetaRuntime } from '../utils/drizzleCompat.js';
import { toCompilableQuery } from './../utils/compilableQuery.js';
import { PowerSyncSQLiteBaseSession, PowerSyncSQLiteTransactionConfig } from './PowerSyncSQLiteBaseSession.js';
import { PowerSyncSQLiteSession } from './PowerSyncSQLiteSession.js';

const BaseSQLiteDatabaseBase = BaseSQLiteDatabase as unknown as abstract new (...args: any[]) => any;

export type DrizzleQuery<T> = { toSQL(): Query; execute(): Promise<T | T[]> };

export type PowerSyncDrizzleConfig<
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelations extends Record<string, unknown> = Record<string, never>
> = DrizzleConfig<TSchema> & {
  relations?: TRelations;
};

export class PowerSyncSQLiteDatabase<
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelations extends Record<string, unknown> = Record<string, never>
> extends BaseSQLiteDatabaseBase {
  declare _:
    | {
        schema: TablesRelationalConfig | undefined;
        fullSchema: TSchema;
        tableNamesMap: Record<string, string>;
      }
    | undefined;

  declare query: Record<string, unknown>;
  declare _query?: Record<string, unknown>;

  private db: AbstractPowerSyncDatabase;

  constructor(db: AbstractPowerSyncDatabase, config: PowerSyncDrizzleConfig<TSchema, TRelations> = {}) {
    const dialect = new SQLiteAsyncDialect({ casing: config.casing });
    const drizzleBetaRuntime = isDrizzleBetaRuntime(dialect);
    let logger;
    if (config.logger === true) {
      logger = new DefaultLogger();
    } else if (config.logger !== false) {
      logger = config.logger;
    }

    let schema: RelationalSchemaConfig<TablesRelationalConfig> | undefined;
    if (config.schema && !drizzleBetaRuntime) {
      const tablesConfig = (DrizzleRelations as any).extractTablesRelationalConfig(
        config.schema,
        (DrizzleRelations as any).createTableRelationsHelpers
      );
      schema = {
        fullSchema: config.schema,
        schema: tablesConfig.tables,
        tableNamesMap: tablesConfig.tableNamesMap
      };
    }

    const relations = (config.relations ??
      (drizzleBetaRuntime ? extractFallbackRelations(config.schema) : {})) as Record<string, unknown>;

    const session = new PowerSyncSQLiteSession(db, dialect, schema, { logger }, relations);

    if (drizzleBetaRuntime) {
      super('async', dialect, session as any, relations as any, undefined, undefined, true);
    } else {
      super('async', dialect, session as any, schema as any);
    }
    this.db = db;

    if (!drizzleBetaRuntime && this._?.schema) {
      /**
       * A hack in order to use read locks for `db.query.users.findMany()` etc queries.
       * We don't currently get queryMetadata for these queries, so we can't use the regular session.
       * This session always uses read locks.
       */
      const querySession = new PowerSyncSQLiteBaseSession(
        {
          useReadContext: (callback) => db.readLock(callback),
          useWriteContext: (callback) => db.readLock(callback)
        },
        dialect,
        schema,
        {
          logger
        }
      );
      const query = this.query as {
        [K in keyof TSchema]: RelationalQueryBuilder<'async', any, any, any>;
      };
      for (const [tableName, columns] of Object.entries(this._.schema)) {
        query[tableName as keyof TSchema] = new RelationalQueryBuilder(
          'async',
          schema!.fullSchema,
          this._.schema,
          this._.tableNamesMap,
          schema!.fullSchema[tableName] as SQLiteTable,
          columns as TableRelationalConfig,
          dialect,
          querySession as unknown as SQLiteSession<'async', any, any, any>
        );
      }

      this._query = this.query;
    }
  }

  transaction<T>(
    transaction: (
      tx: SQLiteTransaction<'async', QueryResult, TSchema, ExtractTablesWithRelations<TSchema>>
    ) => Promise<T>,
    config?: PowerSyncSQLiteTransactionConfig
  ): Promise<T> {
    return super.transaction(transaction, config);
  }

  watch<T>(query: DrizzleQuery<T>, handler: CompilableQueryWatchHandler<T>, options?: SQLWatchOptions): void {
    compilableQueryWatch(this.db, toCompilableQuery(query), handler, options);
  }
}

export function wrapPowerSyncWithDrizzle<
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelations extends Record<string, unknown> = Record<string, never>
>(
  db: AbstractPowerSyncDatabase,
  config: PowerSyncDrizzleConfig<TSchema, TRelations> = {}
): PowerSyncSQLiteDatabase<TSchema, TRelations> {
  return new PowerSyncSQLiteDatabase<TSchema, TRelations>(db, config);
}
