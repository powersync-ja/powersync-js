import { AbstractPowerSyncDatabase, DBAdapter } from '@powersync/common';
import { entityKind } from 'drizzle-orm/entity';
import type { RelationalSchemaConfig, TablesRelationalConfig } from 'drizzle-orm/relations';
import { type Query } from 'drizzle-orm/sql/sql';
import type { SQLiteAsyncDialect } from 'drizzle-orm/sqlite-core/dialect';
import type { SelectedFieldsOrdered } from 'drizzle-orm/sqlite-core/query-builders/select.types';
import {
  type PreparedQueryConfig as PreparedQueryConfigBase,
  type SQLiteExecuteMethod
} from 'drizzle-orm/sqlite-core/session';
import { PowerSyncSQLitePreparedQuery } from './PowerSyncSQLitePreparedQuery';
import {
  PowerSyncSQLiteSessionOptions,
  PowerSyncSQLiteTransaction,
  PowerSyncSQLiteTransactionConfig,
  PowerSyncSQLiteBaseSession
} from './PowerSyncSQLiteBaseSession';

export class PowerSyncSQLiteSession<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig
> extends PowerSyncSQLiteBaseSession<TFullSchema, TSchema> {
  static readonly [entityKind]: string = 'PowerSyncSQLiteSession';
  protected client: AbstractPowerSyncDatabase;
  constructor(
    db: AbstractPowerSyncDatabase,
    dialect: SQLiteAsyncDialect,
    schema: RelationalSchemaConfig<TSchema> | undefined,
    options: PowerSyncSQLiteSessionOptions = {}
  ) {
    super(db, dialect, schema, options);
    this.client = db;
  }

  transaction<T>(
    transaction: (tx: PowerSyncSQLiteTransaction<TFullSchema, TSchema>) => T,
    config: PowerSyncSQLiteTransactionConfig = {}
  ): T {
    const { accessMode = 'read write' } = config;

    if (accessMode === 'read only') {
      return this.client.readLock(async (ctx) => this.internalTransaction(ctx, transaction, config)) as T;
    }

    return this.client.writeLock(async (ctx) => this.internalTransaction(ctx, transaction, config)) as T;
  }

  protected async internalTransaction<T>(
    connection: DBAdapter,
    fn: (tx: PowerSyncSQLiteTransaction<TFullSchema, TSchema>) => T,
    config: PowerSyncSQLiteTransactionConfig = {}
  ): Promise<T> {
    const tx = new PowerSyncSQLiteTransaction<TFullSchema, TSchema>(
      'async',
      (this as any).dialect,
      new PowerSyncSQLiteBaseSession(connection, this.dialect, this.schema, this.options),
      this.schema
    );

    await connection.execute(`begin${config?.behavior ? ' ' + config.behavior : ''}`);
    try {
      const result = await fn(tx);
      await connection.execute(`commit`);
      return result;
    } catch (err) {
      await connection.execute(`rollback`);
      throw err;
    }
  }
}
