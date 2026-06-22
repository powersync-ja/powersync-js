import { AbstractPowerSyncDatabase, QueryResult, Transaction } from '@powersync/common';
import { entityKind } from 'drizzle-orm/entity';
import type { RelationalSchemaConfig, TablesRelationalConfig } from 'drizzle-orm/relations';
import type { SQLiteAsyncDialect } from 'drizzle-orm/sqlite-core/dialect';
import {
  PowerSyncSQLiteBaseSession,
  PowerSyncSQLiteSessionOptions,
  PowerSyncSQLiteTransaction,
  PowerSyncSQLiteTransactionConfig
} from './PowerSyncSQLiteBaseSession.js';
import { SQLiteTransaction } from 'drizzle-orm/sqlite-core';

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
    transaction: (tx: SQLiteTransaction<'async', QueryResult, TFullSchema, TSchema>) => Promise<T>,
    config?: PowerSyncSQLiteTransactionConfig
  ): Promise<T> {
    const invokeCallback = async (powerSyncTx: Transaction): Promise<T> => {
      const tx = new PowerSyncSQLiteTransaction<TFullSchema, TSchema>(
        'async',
        (this as any).dialect,
        new PowerSyncSQLiteBaseSession(
          {
            // We already have a fixed context here. We need to use it for both "read" and "write" operations.
            useReadContext: (callback) => callback(powerSyncTx),
            useWriteContext: (callback) => callback(powerSyncTx)
          },
          this.dialect,
          this.schema,
          this.options
        ),
        this.schema
      );

      return await transaction(tx);
    };

    // Note: Drizzle also supports specifying a transaction behavior (like BEGIN IMMEDIATE or BEGIN EXCLUSIVE).
    // We deliberately ignore that here and use the transaction implementation from the SDK. The reason is that on some
    // VFS implementations on the web, BEGIN IMMEDIATE is the only option and it's not enabled by default here.
    if (config?.accessMode === 'read only') {
      return this.client.readTransaction(invokeCallback);
    } else {
      return this.client.writeTransaction(invokeCallback);
    }
  }
}
