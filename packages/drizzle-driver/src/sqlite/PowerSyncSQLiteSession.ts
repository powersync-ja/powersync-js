import { LockContext } from '@powersync/common';
import { entityKind } from 'drizzle-orm/entity';
import type { AnyRelations, EmptyRelations } from 'drizzle-orm/relations';
import type { SQLiteAsyncDialect } from 'drizzle-orm/sqlite-core/dialect';
import {
  PowerSyncSQLiteBaseSession,
  PowerSyncSQLiteSessionOptions,
  PowerSyncSQLiteTransaction,
  PowerSyncSQLiteTransactionConfig
} from './PowerSyncSQLiteBaseSession.js';

export class PowerSyncSQLiteSession<TRelations extends AnyRelations = EmptyRelations> extends PowerSyncSQLiteBaseSession<TRelations> {
  static readonly [entityKind]: string = 'PowerSyncSQLiteSession';

  constructor(dialect: SQLiteAsyncDialect, relations: TRelations, options: PowerSyncSQLiteSessionOptions) {
    super(
      {
        useReadContext: (callback) => options.db.readLock(callback),
        useWriteContext: (callback) => options.db.writeLock(callback)
      },
      dialect,
      relations,
      options
    );
  }

  transaction<T>(
    transaction: (tx: PowerSyncSQLiteTransaction<TRelations>) => T,
    config: PowerSyncSQLiteTransactionConfig = {}
  ): T {
    const { accessMode = 'read write' } = config;

    if (accessMode === 'read only') {
      return this.options.db.readLock(async (ctx) => this.internalTransaction(ctx, transaction, config)) as T;
    }

    return this.options.db.writeLock(async (ctx) => this.internalTransaction(ctx, transaction, config)) as T;
  }

  protected async internalTransaction<T>(
    connection: LockContext,
    fn: (tx: PowerSyncSQLiteTransaction<TRelations>) => T,
    config: PowerSyncSQLiteTransactionConfig = {}
  ): Promise<T> {
    const transactionSession = new PowerSyncSQLiteBaseSession(
      {
        useReadContext: (callback) => callback(connection),
        useWriteContext: (callback) => callback(connection)
      },
      this.dialect,
      this.relations,
      this.options
    );

    const tx = new PowerSyncSQLiteTransaction<TRelations>(
      'async',
      this.dialect,
      transactionSession,
      this.relations,
      undefined,
      undefined,
      undefined,
      true
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
