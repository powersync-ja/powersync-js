import {
  BaseObserver,
  DBAdapter,
  DBAdapterListener,
  LockContext as PowerSyncLockContext,
  Transaction as PowerSyncTransaction,
  DBLockOptions,
  DBGetUtils,
  QueryResult
} from '@powersync/common';
import type { QuickSQLiteConnection } from '@journeyapps/react-native-quick-sqlite';

/**
 * Adapter for React Native Quick SQLite
 */
export class RNQSDBAdapter extends BaseObserver<DBAdapterListener> implements DBAdapter {
  getAll: <T>(sql: string, parameters?: any[]) => Promise<T[]>;
  getOptional: <T>(sql: string, parameters?: any[]) => Promise<T | null>;
  get: <T>(sql: string, parameters?: any[]) => Promise<T>;

  constructor(
    protected baseDB: QuickSQLiteConnection,
    public name: string
  ) {
    super();
    // link table update commands
    baseDB.registerTablesChangedHook((update) => {
      this.iterateListeners((cb) => cb.tablesUpdated?.(update));
    });

    const topLevelUtils = this.generateDBHelpers({
      // Arrow function binds `this` for use in readOnlyExecute
      execute: (sql: string, params?: any[]) => this.readOnlyExecute(sql, params)
    });
    // Only assigning get helpers
    this.getAll = topLevelUtils.getAll;
    this.getOptional = topLevelUtils.getOptional;
    this.get = topLevelUtils.get;
  }

  close() {
    return this.baseDB.close();
  }

  readLock<T>(fn: (tx: PowerSyncLockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.baseDB.readLock((dbTx) => fn(this.generateDBHelpers(dbTx)), options);
  }

  readTransaction<T>(fn: (tx: PowerSyncTransaction) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.baseDB.readTransaction((dbTx) => fn(this.generateDBHelpers(dbTx)), options);
  }

  writeLock<T>(fn: (tx: PowerSyncLockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.baseDB.writeLock((dbTx) => fn(this.generateDBHelpers(dbTx)), options);
  }

  writeTransaction<T>(fn: (tx: PowerSyncTransaction) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.baseDB.writeTransaction((dbTx) => fn(this.generateDBHelpers(dbTx)), options);
  }

  execute(query: string, params?: any[]) {
    return this.baseDB.execute(query, params);
  }

  async executeBatch(query: string, params: any[][] = []): Promise<QueryResult> {
    const commands: any[] = [];

    for (let i = 0; i < params.length; i++) {
      commands.push([query, params[i]]);
    }

    const result = await this.baseDB.executeBatch(commands);
    return {
      rowsAffected: result.rowsAffected ? result.rowsAffected : 0
    };
  }

  /**
   * This provides a top-level read only execute method which is executed inside a read-lock.
   * This is necessary since the high level `execute` method uses a write-lock under
   * the hood. Helper methods such as `get`, `getAll` and `getOptional` are read only,
   * and should use this method.
   */
  private readOnlyExecute(sql: string, params?: any[]) {
    return this.baseDB.readLock((ctx) => ctx.execute(sql, params));
  }

  /**
   * Adds DB get utils to lock contexts and transaction contexts
   * @param tx
   * @returns
   */
  private generateDBHelpers<T extends { execute: (sql: string, params?: any[]) => Promise<QueryResult> }>(
    tx: T
  ): T & DBGetUtils {
    return {
      ...tx,
      /**
       *  Execute a read-only query and return results
       */
      getAll: async <T>(sql: string, parameters?: any[]): Promise<T[]> => {
        const res = await tx.execute(sql, parameters);
        return res.rows?._array ?? [];
      },

      /**
       * Execute a read-only query and return the first result, or null if the ResultSet is empty.
       */
      getOptional: async <T>(sql: string, parameters?: any[]): Promise<T | null> => {
        const res = await tx.execute(sql, parameters);
        return res.rows?.item(0) ?? null;
      },

      /**
       * Execute a read-only query and return the first result, error if the ResultSet is empty.
       */
      get: async <T>(sql: string, parameters?: any[]): Promise<T> => {
        const res = await tx.execute(sql, parameters);
        const first = res.rows?.item(0);
        if (!first) {
          throw new Error('Result set is empty');
        }
        return first;
      }
    };
  }

  async refreshSchema() {
    await this.baseDB.refreshSchema();
  }
}
