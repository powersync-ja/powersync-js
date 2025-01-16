import { LockContext, QueryResult } from '@powersync/common';
import { entityKind } from 'drizzle-orm/entity';
import type { Logger } from 'drizzle-orm/logger';
import { NoopLogger } from 'drizzle-orm/logger';
import type { RelationalSchemaConfig, TablesRelationalConfig } from 'drizzle-orm/relations';
import { type Query } from 'drizzle-orm/sql/sql';
import type { SQLiteAsyncDialect } from 'drizzle-orm/sqlite-core/dialect';
import type { SelectedFieldsOrdered } from 'drizzle-orm/sqlite-core/query-builders/select.types';
import {
  type PreparedQueryConfig as PreparedQueryConfigBase,
  type SQLiteExecuteMethod,
  SQLiteSession,
  SQLiteTransaction,
  type SQLiteTransactionConfig
} from 'drizzle-orm/sqlite-core/session';
import { PowerSyncSQLitePreparedQuery } from './PowerSyncSQLitePreparedQuery';

export interface PowerSyncSQLiteSessionOptions {
  logger?: Logger;
}

export type PowerSyncSQLiteTransactionConfig = SQLiteTransactionConfig & {
  accessMode?: 'read only' | 'read write';
};

export class PowerSyncSQLiteTransaction<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig
> extends SQLiteTransaction<'async', QueryResult, TFullSchema, TSchema> {
  static readonly [entityKind]: string = 'PowerSyncSQLiteTransaction';
}

export class PowerSyncSQLiteBaseSession<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig
> extends SQLiteSession<'async', QueryResult, TFullSchema, TSchema> {
  static readonly [entityKind]: string = 'PowerSyncSQLiteBaseSession';

  protected logger: Logger;

  constructor(
    protected db: LockContext,
    protected dialect: SQLiteAsyncDialect,
    protected schema: RelationalSchemaConfig<TSchema> | undefined,
    protected options: PowerSyncSQLiteSessionOptions = {}
  ) {
    super(dialect);
    this.logger = options.logger ?? new NoopLogger();
  }

  prepareQuery<T extends PreparedQueryConfigBase & { type: 'async' }>(
    query: Query,
    fields: SelectedFieldsOrdered | undefined,
    executeMethod: SQLiteExecuteMethod,
    isResponseInArrayMode: boolean,
    customResultMapper?: (rows: unknown[][], mapColumnValue?: (value: unknown) => unknown) => unknown
  ): PowerSyncSQLitePreparedQuery<T> {
    return new PowerSyncSQLitePreparedQuery(
      this.db,
      query,
      this.logger,
      fields,
      executeMethod,
      isResponseInArrayMode,
      customResultMapper
    );
  }

  transaction<T>(
    _transaction: (tx: PowerSyncSQLiteTransaction<TFullSchema, TSchema>) => T,
    _config: PowerSyncSQLiteTransactionConfig = {}
  ): T {
    throw new Error('Nested transactions are not supported');
  }
}
