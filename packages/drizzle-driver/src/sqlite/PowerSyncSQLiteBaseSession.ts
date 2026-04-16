import type { AbstractPowerSyncDatabase, QueryResult } from '@powersync/common';
import type { WithCacheConfig } from 'drizzle-orm/cache/core/types';
import { entityKind } from 'drizzle-orm/entity';
import type { Logger } from 'drizzle-orm/logger';
import { NoopLogger } from 'drizzle-orm/logger';
import type { AnyRelations, EmptyRelations } from 'drizzle-orm/relations';
import { type Query } from 'drizzle-orm/sql/sql';
import type { SQLiteAsyncDialect } from 'drizzle-orm/sqlite-core/dialect';
import type { SelectedFieldsOrdered } from 'drizzle-orm/sqlite-core/query-builders/select.types';
import {
  SQLiteSession,
  SQLiteTransaction,
  type PreparedQueryConfig as PreparedQueryConfigBase,
  type SQLiteExecuteMethod,
  type SQLiteTransactionConfig
} from 'drizzle-orm/sqlite-core/session';
import { PowerSyncSQLitePreparedQuery, type ContextProvider } from './PowerSyncSQLitePreparedQuery.js';

type ResultMapper = (rows: unknown[][], mapColumnValue?: (value: unknown) => unknown) => unknown;
type RelationalResultMapper = (
  rows: Record<string, unknown>[],
  mapColumnValue?: (value: unknown) => unknown
) => unknown;

export interface PowerSyncSQLiteSessionOptions {
  logger?: Logger;
  db: AbstractPowerSyncDatabase;
}

export type PowerSyncSQLiteTransactionConfig = SQLiteTransactionConfig & {
  accessMode?: 'read only' | 'read write';
};

export class PowerSyncSQLiteTransaction<TRelations extends AnyRelations = EmptyRelations> extends SQLiteTransaction<
  'async',
  QueryResult,
  Record<string, never>,
  TRelations
> {
  static readonly [entityKind]: string = 'PowerSyncSQLiteTransaction';
}

export class PowerSyncSQLiteBaseSession<TRelations extends AnyRelations = EmptyRelations> extends SQLiteSession<
  'async',
  QueryResult,
  Record<string, never>,
  TRelations
> {
  static readonly [entityKind]: string = 'PowerSyncSQLiteBaseSession';

  protected logger: Logger;

  constructor(
    protected contextProvider: ContextProvider,
    protected dialect: SQLiteAsyncDialect,
    protected relations: TRelations,
    protected options: PowerSyncSQLiteSessionOptions
  ) {
    super(dialect);
    this.logger = options.logger ?? new NoopLogger();
  }

  prepareQuery<T extends PreparedQueryConfigBase & { type: 'async' }>(
    query: Query,
    fields: SelectedFieldsOrdered | undefined,
    executeMethod: SQLiteExecuteMethod,
    isResponseInArrayMode: boolean,
    customResultMapper?: ResultMapper,
    queryMetadata?: {
      type: 'select' | 'update' | 'delete' | 'insert';
      tables: string[];
    },
    cacheConfig?: WithCacheConfig
  ): PowerSyncSQLitePreparedQuery<T> {
    return new PowerSyncSQLitePreparedQuery(
      this.contextProvider,
      query,
      this.logger,
      fields,
      executeMethod,
      isResponseInArrayMode,
      customResultMapper,
      undefined,
      queryMetadata,
      cacheConfig
    );
  }

  prepareRelationalQuery<T extends PreparedQueryConfigBase & { type: 'async' }>(
    query: Query,
    fields: SelectedFieldsOrdered | undefined,
    executeMethod: SQLiteExecuteMethod,
    customResultMapper: RelationalResultMapper
  ): PowerSyncSQLitePreparedQuery<T> {
    return new PowerSyncSQLitePreparedQuery(
      this.contextProvider,
      query,
      this.logger,
      fields,
      executeMethod,
      false,
      customResultMapper,
      undefined,
      { type: 'select', tables: [] },
      undefined,
      true
    );
  }

  transaction<T>(
    _transaction: (tx: PowerSyncSQLiteTransaction<TRelations>) => T,
    _config: PowerSyncSQLiteTransactionConfig = {}
  ): T {
    throw new Error('Nested transactions are not supported');
  }
}
