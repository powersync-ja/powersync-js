import { AbstractPowerSyncDatabase, LockContext } from '@powersync/common';
import { entityKind } from 'drizzle-orm/entity';
import type { RelationalSchemaConfig, TablesRelationalConfig } from 'drizzle-orm/relations';
import type { SQLiteAsyncDialect } from 'drizzle-orm/sqlite-core/dialect';
import { isDrizzleBetaRuntime } from '../utils/drizzleCompat.js';
import {
  PowerSyncSQLiteBaseSession,
  PowerSyncSQLiteSessionOptions,
  PowerSyncSQLiteTransaction,
  PowerSyncSQLiteTransactionConfig
} from './PowerSyncSQLiteBaseSession.js';

type LegacyTransactionCtor<TFullSchema extends Record<string, unknown>, TSchema extends TablesRelationalConfig> = new (
  resultType: 'async',
  dialect: SQLiteAsyncDialect,
  session: PowerSyncSQLiteBaseSession<TFullSchema, TSchema>,
  schema: RelationalSchemaConfig<TSchema> | undefined
) => PowerSyncSQLiteTransaction<TFullSchema, TSchema>;

type BetaTransactionCtor<TFullSchema extends Record<string, unknown>, TSchema extends TablesRelationalConfig> = new (
  resultType: 'async',
  dialect: SQLiteAsyncDialect,
  session: PowerSyncSQLiteBaseSession<TFullSchema, TSchema>,
  relations: Record<string, unknown>,
  schema: RelationalSchemaConfig<TSchema> | undefined,
  nestedIndex?: number,
  rowModeRQB?: boolean,
  forbidJsonb?: boolean
) => PowerSyncSQLiteTransaction<TFullSchema, TSchema>;

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
    options: PowerSyncSQLiteSessionOptions = {},
    relations: Record<string, unknown> = {}
  ) {
    super(
      // Top level operations use the respective locks.
      {
        useReadContext: (callback) => db.readLock(callback),
        useWriteContext: (callback) => db.writeLock(callback)
      },
      dialect,
      schema,
      options,
      relations
    );
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
    connection: LockContext,
    fn: (tx: PowerSyncSQLiteTransaction<TFullSchema, TSchema>) => T,
    config: PowerSyncSQLiteTransactionConfig = {}
  ): Promise<T> {
    const transactionSession = new PowerSyncSQLiteBaseSession(
      {
        // We already have a fixed context here. We need to use it for both "read" and "write" operations.
        useReadContext: (callback) => callback(connection),
        useWriteContext: (callback) => callback(connection)
      },
      this.dialect,
      this.schema,
      this.options,
      this.relations
    );
    const drizzleBetaRuntime = isDrizzleBetaRuntime(this.dialect);
    const TransactionCtor = PowerSyncSQLiteTransaction as unknown as LegacyTransactionCtor<TFullSchema, TSchema> &
      BetaTransactionCtor<TFullSchema, TSchema>;
    const tx = drizzleBetaRuntime
      ? new TransactionCtor(
          'async',
          this.dialect,
          transactionSession,
          this.relations,
          this.schema,
          undefined,
          undefined,
          true
        )
      : new TransactionCtor('async', this.dialect, transactionSession, this.schema);

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
