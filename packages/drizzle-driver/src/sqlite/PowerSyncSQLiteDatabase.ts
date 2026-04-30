import {
  AbstractPowerSyncDatabase,
  compilableQueryWatch,
  CompilableQueryWatchHandler,
  QueryResult,
  SQLWatchOptions
} from '@powersync/common';
import { Query } from 'drizzle-orm';
import { DefaultLogger } from 'drizzle-orm/logger';
import type { AnyRelations, EmptyRelations } from 'drizzle-orm/relations';
import { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core/db';
import { SQLiteAsyncDialect } from 'drizzle-orm/sqlite-core/dialect';
import type { DrizzleConfig } from 'drizzle-orm/utils';
import { toCompilableQuery } from './../utils/compilableQuery.js';
import { PowerSyncSQLiteTransactionConfig } from './PowerSyncSQLiteBaseSession.js';
import { PowerSyncSQLiteSession } from './PowerSyncSQLiteSession.js';

export type DrizzleQuery<T> = { toSQL(): Query; execute(): Promise<T | T[]> };

export type PowerSyncDrizzleConfig<TRelations extends AnyRelations = EmptyRelations> = Omit<
  DrizzleConfig<Record<string, never>, TRelations>,
  'schema' | 'relations'
> & {
  relations: TRelations;
};

export class PowerSyncSQLiteDatabase<TRelations extends AnyRelations = EmptyRelations> extends BaseSQLiteDatabase<
  'async',
  QueryResult,
  Record<string, never>,
  TRelations
> {
  private db: AbstractPowerSyncDatabase;

  constructor(db: AbstractPowerSyncDatabase, config: PowerSyncDrizzleConfig<TRelations>) {
    const dialect = new SQLiteAsyncDialect({ casing: config.casing });
    let logger;
    if (config.logger === true) {
      logger = new DefaultLogger();
    } else if (config.logger !== false) {
      logger = config.logger;
    }

    const session = new PowerSyncSQLiteSession(dialect, config.relations, {
      logger,
      db
    });

    super('async', dialect, session, config.relations, undefined, undefined, true);
    this.db = db;
  }

  transaction<T>(
    transaction: (tx: SQLiteTransaction<'async', QueryResult, Record<string, never>, TRelations>) => Promise<T>,
    config?: PowerSyncSQLiteTransactionConfig
  ): Promise<T> {
    return super.transaction(transaction, config);
  }

  watch<T>(query: DrizzleQuery<T>, handler: CompilableQueryWatchHandler<T>, options?: SQLWatchOptions): void {
    compilableQueryWatch(this.db, toCompilableQuery(query), handler, options);
  }
}

export function wrapPowerSyncWithDrizzle<TRelations extends AnyRelations = EmptyRelations>(
  db: AbstractPowerSyncDatabase,
  config: PowerSyncDrizzleConfig<TRelations>
): PowerSyncSQLiteDatabase<TRelations> {
  return new PowerSyncSQLiteDatabase(db, config);
}
