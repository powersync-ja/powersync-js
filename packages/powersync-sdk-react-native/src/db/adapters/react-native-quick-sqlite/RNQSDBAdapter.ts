import {
  BaseObserver,
  DBAdapter,
  DBAdapterListener,
  LockContext as PowerSyncLockContext,
  Transaction as PowerSyncTransaction,
  DBLockOptions,
  DBGetUtils,
  QueryResult
} from '@journeyapps/powersync-sdk-common';
import { ConcurrentQuickSQLiteConnection } from '@journeyapps/react-native-quick-sqlite';

/**
 * Adapter for React Native Quick SQLite
 */
export class RNQSDBAdapter extends BaseObserver<DBAdapterListener> implements DBAdapter {
  getAll: <T>(sql: string, parameters?: any[]) => Promise<T[]>;
  getOptional: <T>(sql: string, parameters?: any[]) => Promise<T | null>;
  get: <T>(sql: string, parameters?: any[]) => Promise<T>;

  constructor(protected baseDB: ConcurrentQuickSQLiteConnection) {
    super();
    // link table update commands
    baseDB.registerUpdateHook((update) => {
      this.iterateListeners((cb) => cb.tablesUpdated?.(update));
    });

    const topLevelUtils = this.generateDBHelpers({ execute: this.baseDB.execute });
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
      async getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
        const res = await tx.execute(sql, parameters);
        return res.rows?._array ?? [];
      },

      /**
       * Execute a read-only query and return the first result, or null if the ResultSet is empty.
       */
      async getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
        const res = await tx.execute(sql, parameters);
        return res.rows?.item(0) ?? null;
      },

      /**
       * Execute a read-only query and return the first result, error if the ResultSet is empty.
       */
      async get<T>(sql: string, parameters?: any[]): Promise<T> {
        const res = await tx.execute(sql, parameters);
        const first = res.rows?.item(0);
        if (!first) {
          throw new Error('Result set is empty');
        }
        return first;
      }
    };
  }
}
