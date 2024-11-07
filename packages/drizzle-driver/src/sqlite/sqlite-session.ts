import { AbstractPowerSyncDatabase, QueryResult } from '@powersync/common';
import { entityKind } from 'drizzle-orm/entity';
import type { Logger } from 'drizzle-orm/logger';
import { NoopLogger } from 'drizzle-orm/logger';
import type { RelationalSchemaConfig, TablesRelationalConfig } from 'drizzle-orm/relations';
import { type Query, sql } from 'drizzle-orm/sql/sql';
import type { SQLiteAsyncDialect } from 'drizzle-orm/sqlite-core/dialect';
import type { SelectedFieldsOrdered } from 'drizzle-orm/sqlite-core/query-builders/select.types';
import {
  type PreparedQueryConfig as PreparedQueryConfigBase,
  type SQLiteExecuteMethod,
  SQLiteSession,
  SQLiteTransaction,
  type SQLiteTransactionConfig
} from 'drizzle-orm/sqlite-core/session';
import { PowerSyncSQLitePreparedQuery } from './sqlite-query';

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

export class PowerSyncSQLiteSession<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig
> extends SQLiteSession<'async', QueryResult, TFullSchema, TSchema> {
  static readonly [entityKind]: string = 'PowerSyncSQLiteSession';

  private logger: Logger;

  constructor(
    private db: AbstractPowerSyncDatabase,
    dialect: SQLiteAsyncDialect,
    private schema: RelationalSchemaConfig<TSchema> | undefined,
    options: PowerSyncSQLiteSessionOptions = {}
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

  override transaction<T>(
    transaction: (tx: PowerSyncSQLiteTransaction<TFullSchema, TSchema>) => T,
    config: PowerSyncSQLiteTransactionConfig = {}
  ): T {
    const { accessMode = 'read write' } = config;

    if (accessMode == 'read only') {
      return this.db.readLock(async () => this.internalTransaction(transaction, config)) as T;
    }

    return this.db.writeLock(async () => this.internalTransaction(transaction, config)) as T;
  }

  async internalTransaction<T>(
    transaction: (tx: PowerSyncSQLiteTransaction<TFullSchema, TSchema>) => T,
    config: PowerSyncSQLiteTransactionConfig = {}
  ): Promise<T> {
    const tx = new PowerSyncSQLiteTransaction('async', (this as any).dialect, this, this.schema);

    await this.run(sql.raw(`begin${config?.behavior ? ' ' + config.behavior : ''}`));
    try {
      const result = await transaction(tx);
      await this.run(sql`commit`);
      return result;
    } catch (err) {
      await this.run(sql`rollback`);
      throw err;
    }
  }
}
