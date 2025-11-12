import { AbstractPowerSyncDatabase, LockContext } from '@powersync/common';
import { entityKind } from 'drizzle-orm/entity';
import type { RelationalSchemaConfig, TablesRelationalConfig } from 'drizzle-orm/relations';
import type { SQLiteAsyncDialect } from 'drizzle-orm/sqlite-core/dialect';
import {
  PowerSyncSQLiteBaseSession,
  PowerSyncSQLiteSessionOptions,
  PowerSyncSQLiteTransaction,
  PowerSyncSQLiteTransactionConfig
} from './PowerSyncSQLiteBaseSession.js';

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
    super(
      // Top level operations use the respective locks.
      {
        useReadContext: (callback) => db.readLock(callback),
        useWriteContext: (callback) => db.writeLock(callback)
      },
      dialect,
      schema,
      options
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
    const tx = new PowerSyncSQLiteTransaction<TFullSchema, TSchema>(
      'async',
      (this as any).dialect,
      new PowerSyncSQLiteBaseSession(
        {
          // We already have a fixed context here. We need to use it for both "read" and "write" operations.
          useReadContext: (callback) => callback(connection),
          useWriteContext: (callback) => callback(connection)
        },
        this.dialect,
        this.schema,
        this.options
      ),
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
