import { entityKind } from 'drizzle-orm/entity';
import type { RelationalSchemaConfig, TablesRelationalConfig } from 'drizzle-orm/relations';
import type { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core/dialect';
import {
  PowerSyncSQLiteBaseSession,
  PowerSyncSQLiteSessionOptions,
  PowerSyncSQLiteTransaction,
  PowerSyncSQLiteTransactionConfig
} from './PowerSyncSQLiteBaseSession.js';
import { DB, Transaction } from '@op-engineering/op-sqlite';

export class PowerSyncSQLiteSession<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig
> extends PowerSyncSQLiteBaseSession<TFullSchema, TSchema> {
  static readonly [entityKind]: string = 'PowerSyncSQLiteSession';
  protected client: DB;
  constructor(
    db: DB,
    dialect: SQLiteSyncDialect,
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
    let result: T;

    this.client.transaction(async (trx) => {
      const tx = new PowerSyncSQLiteTransaction<TFullSchema, TSchema>(
        'sync',
        this.dialect,
        new PowerSyncSQLiteBaseSession(this.client, this.dialect, this.schema, this.options),
        // trx,
        this.schema
      );
      result = this.internalTransaction(trx, () => transaction(tx), config);
    });

    // @ts-ignore
    return result;

    // const { accessMode = 'read write' } = config;

    // if (accessMode === 'read only') {
    // return this.client.readLock(async (ctx) => this.internalTransaction(ctx, transaction, config)) as T;
    // return this.client.transaction(async (ctx) => this.internalTransaction(ctx, transaction, config));
    // }

    // return this.client.writeLock(async (ctx) => this.internalTransaction(ctx, transaction, config)) as T;
  }

  protected internalTransaction<T>(
    transaction: Transaction,
    fn: (tx: PowerSyncSQLiteTransaction<TFullSchema, TSchema>) => T,
    config: PowerSyncSQLiteTransactionConfig = {}
  ): T {
    const tx = new PowerSyncSQLiteTransaction<TFullSchema, TSchema>(
      'sync',
      (this as any).dialect,
      new PowerSyncSQLiteBaseSession(this.client, this.dialect, this.schema, this.options),
      this.schema
    );

    transaction.execute(`begin${config?.behavior ? ' ' + config.behavior : ''}`);
    try {
      const result = fn(tx);
      transaction.commit();
      return result;
    } catch (err) {
      transaction.rollback();
      throw err;
    }
  }
}
