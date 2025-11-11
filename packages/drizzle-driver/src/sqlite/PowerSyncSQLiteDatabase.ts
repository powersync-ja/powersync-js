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
  TableRelationalConfig,
  type RelationalSchemaConfig,
  type TablesRelationalConfig
} from 'drizzle-orm/relations';
import { SQLiteSession, SQLiteTable, SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core/db';
import { SQLiteAsyncDialect } from 'drizzle-orm/sqlite-core/dialect';
import { RelationalQueryBuilder } from 'drizzle-orm/sqlite-core/query-builders/query';
import type { DrizzleConfig } from 'drizzle-orm/utils';
import { toCompilableQuery } from './../utils/compilableQuery.js';
import { PowerSyncSQLiteBaseSession, PowerSyncSQLiteTransactionConfig } from './PowerSyncSQLiteBaseSession.js';
import { PowerSyncSQLiteSession } from './PowerSyncSQLiteSession.js';

export type DrizzleQuery<T> = { toSQL(): Query; execute(): Promise<T | T[]> };

export class PowerSyncSQLiteDatabase<
  TSchema extends Record<string, unknown> = Record<string, never>
> extends BaseSQLiteDatabase<'async', QueryResult, TSchema> {
  private db: AbstractPowerSyncDatabase;

  constructor(db: AbstractPowerSyncDatabase, config: DrizzleConfig<TSchema> = {}) {
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

    super('async', dialect, session as any, schema as any);
    this.db = db;

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
    if (this._.schema) {
      for (const [tableName, columns] of Object.entries(this._.schema)) {
        this.query[tableName as keyof typeof this.query] = new RelationalQueryBuilder(
          'async',
          schema!.fullSchema,
          this._.schema,
          this._.tableNamesMap,
          schema!.fullSchema[tableName] as SQLiteTable,
          columns as TableRelationalConfig,
          dialect,
          querySession as SQLiteSession<any, any, any, any> as any
        ) as any;
      }
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

export function wrapPowerSyncWithDrizzle<TSchema extends Record<string, unknown> = Record<string, never>>(
  db: AbstractPowerSyncDatabase,
  config: DrizzleConfig<TSchema> = {}
): PowerSyncSQLiteDatabase<TSchema> {
  return new PowerSyncSQLiteDatabase<TSchema>(db, config);
}
