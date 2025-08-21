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
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core/dialect';
import type { DrizzleConfig } from 'drizzle-orm/utils';
import { PowerSyncSQLiteTransactionConfig } from './PowerSyncSQLiteBaseSession.js';
import { PowerSyncSQLiteSession } from './PowerSyncSQLiteSession.js';
import { DB, QueryResult } from '@op-engineering/op-sqlite';

export type DrizzleQuery<T> = { toSQL(): Query; execute(): Promise<T | T[]> };

export class PowerSyncSQLiteDatabase<
  TSchema extends Record<string, unknown> = Record<string, never>
> extends BaseSQLiteDatabase<'sync', QueryResult, TSchema> {
  private db: DB;

  constructor(db: DB, config: DrizzleConfig<TSchema> = {}) {
    const dialect = new SQLiteSyncDialect({ casing: config.casing });
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

    super('sync', dialect, session as any, schema as any);
    this.db = db;
  }

  transaction<T>(
    transaction: (tx: SQLiteTransaction<'sync', QueryResult, TSchema, ExtractTablesWithRelations<TSchema>>) => T,
    config?: PowerSyncSQLiteTransactionConfig
  ): T {
    return super.transaction(transaction, config);
  }

  // watch<T>(query: DrizzleQuery<T>, handler: CompilableQueryWatchHandler<T>, options?: SQLWatchOptions): void {
  //   compilableQueryWatch(this.db, toCompilableQuery(query), handler, options);
  // }
}

export function wrapPowerSyncWithDrizzle<TSchema extends Record<string, unknown> = Record<string, never>>(
  db: DB,
  config: DrizzleConfig<TSchema> = {}
): PowerSyncSQLiteDatabase<TSchema> {
  return new PowerSyncSQLiteDatabase<TSchema>(db, config);
}
