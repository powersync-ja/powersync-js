import type { QueryResult } from '@powersync/common';
import type { WithCacheConfig } from 'drizzle-orm/cache/core/types';
import { entityKind } from 'drizzle-orm/entity';
import type { Logger } from 'drizzle-orm/logger';
import { NoopLogger } from 'drizzle-orm/logger';
import type { RelationalSchemaConfig, TablesRelationalConfig } from 'drizzle-orm/relations';
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

const SQLiteSessionBase = SQLiteSession as unknown as abstract new (...args: any[]) => any;
const SQLiteTransactionBase = SQLiteTransaction as unknown as abstract new (...args: any[]) => any;

export interface PowerSyncSQLiteSessionOptions {
  logger?: Logger;
}

export type PowerSyncSQLiteTransactionConfig = SQLiteTransactionConfig & {
  accessMode?: 'read only' | 'read write';
};

export class PowerSyncSQLiteTransaction<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig
> extends SQLiteTransactionBase {
  static readonly [entityKind]: string = 'PowerSyncSQLiteTransaction';
}

export class PowerSyncSQLiteBaseSession<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig
> extends SQLiteSessionBase {
  static readonly [entityKind]: string = 'PowerSyncSQLiteBaseSession';

  protected logger: Logger;

  constructor(
    protected contextProvider: ContextProvider,
    protected dialect: SQLiteAsyncDialect,
    protected schema: RelationalSchemaConfig<TSchema> | undefined,
    protected options: PowerSyncSQLiteSessionOptions = {},
    protected relations: Record<string, unknown> = {}
  ) {
    super(dialect);
    this.logger = options.logger ?? new NoopLogger();
  }

  prepareQuery<T extends PreparedQueryConfigBase & { type: 'async' }>(
    query: Query,
    fields: SelectedFieldsOrdered | undefined,
    executeMethod: SQLiteExecuteMethod,
    isResponseInArrayMode: boolean,
    customResultMapper?: (rows: unknown[][], mapColumnValue?: (value: unknown) => unknown) => unknown,
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
      undefined, // cache not supported yet
      queryMetadata,
      cacheConfig
    );
  }

  prepareRelationalQuery<T extends PreparedQueryConfigBase & { type: 'async' }>(
    query: Query,
    fields: SelectedFieldsOrdered | undefined,
    executeMethod: SQLiteExecuteMethod,
    customResultMapper: (rows: Record<string, unknown>[], mapColumnValue?: (value: unknown) => unknown) => unknown
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
    _transaction: (tx: PowerSyncSQLiteTransaction<TFullSchema, TSchema>) => T,
    _config: PowerSyncSQLiteTransactionConfig = {}
  ): T {
    throw new Error('Nested transactions are not supported');
  }
}
