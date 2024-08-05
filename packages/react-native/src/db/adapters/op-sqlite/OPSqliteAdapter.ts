import { DB } from '@op-engineering/op-sqlite';
import {
  BaseObserver,
  DBAdapter,
  DBAdapterListener,
  DBGetUtils,
  DBLockOptions,
  LockContext as PowerSyncLockContext,
  QueryResult,
  RowUpdateType,
  Transaction
} from '@powersync/common';

/**
 * Adapter for React Native Quick SQLite
 */
export class OPSqliteBAdapter extends BaseObserver<DBAdapterListener> implements DBAdapter {
  getAll: <T>(sql: string, parameters?: any[]) => Promise<T[]>;
  getOptional: <T>(sql: string, parameters?: any[]) => Promise<T | null>;
  get: <T>(sql: string, parameters?: any[]) => Promise<T>;

  constructor(
    protected baseDB: DB,
    public name: string
  ) {
    super();
    // link table update commands
    baseDB.updateHook((update) => {
      this.iterateListeners((cb) => {
        let opType: RowUpdateType;
        switch (update.operation) {
          case 'INSERT':
            opType = RowUpdateType.SQLITE_INSERT;
            break;
          case 'DELETE':
            opType = RowUpdateType.SQLITE_DELETE;
            break;
          case 'UPDATE':
            opType = RowUpdateType.SQLITE_UPDATE;
            break;
        }
        cb.tablesUpdated?.({ table: update.table, opType, rowId: update.rowId });
      });
    });

    const topLevelUtils = this.generateDBHelpers({
      // Arrow function binds `this` for use in readOnlyExecute
      execute: (sql: string, params?: any[]) => {
        return new Promise(async (resolve, reject) => {
          try {
            await baseDB.transaction(async (ctx) => {
              resolve(await ctx.executeAsync(sql, params));
            });
          } catch (ex) {
            reject(ex);
          }
        });
      }
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
    return new Promise(async (resolve, reject) => {
      try {
        // TODO this should not be a transaction
        await this.baseDB.transaction(async (ctx) => {
          resolve(
            await fn(
              this.generateDBHelpers({
                execute: (query: string, params: any[]) => ctx.executeAsync(query, params)
              })
            )
          );
        });
      } catch (ex) {
        reject(ex);
      }
    });
  }

  readTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return new Promise(async (resolve, reject) => {
      try {
        // TODO this should use read connections
        await this.baseDB.transaction(async (ctx) => {
          resolve(
            await fn({
              ...this.generateDBHelpers({
                execute: (query: string, params: any[]) => ctx.executeAsync(query, params)
              }),
              //   TODO
              commit: async () => ctx.commit(),
              //   TODO
              rollback: async () => ctx.rollback()
            })
          );
        });
      } catch (ex) {
        reject(ex);
      }
    });
  }

  writeLock<T>(fn: (tx: PowerSyncLockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return new Promise(async (resolve, reject) => {
      try {
        // TODO this should use single write connection
        await this.baseDB.transaction(async (ctx) => {
          resolve(
            await fn(
              this.generateDBHelpers({
                execute: (query: string, params: any[]) => ctx.executeAsync(query, params)
              })
            )
          );
        });
      } catch (ex) {
        reject(ex);
      }
    });
  }

  writeTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return new Promise(async (resolve, reject) => {
      try {
        // TODO said this a few times already
        await this.baseDB.transaction(async (ctx) => {
          resolve(
            await fn({
              ...this.generateDBHelpers({
                execute: (query: string, params: any[]) => ctx.executeAsync(query, params)
              }),
              //   TODO
              commit: async () => ctx.commit(),
              //   TODO
              rollback: async () => ctx.rollback()
            })
          );
        });
      } catch (ex) {
        reject(ex);
      }
    });
  }

  execute(query: string, params?: any[]) {
    return this.writeLock((ctx) => ctx.execute(query, params));
  }

  async executeBatch(query: string, params: any[][] = []): Promise<QueryResult> {
    const commands: any[] = [];

    for (let i = 0; i < params.length; i++) {
      commands.push([query, params[i]]);
    }

    const result = await this.baseDB.executeBatchAsync(commands);
    return {
      rowsAffected: result.rowsAffected ? result.rowsAffected : 0
    };
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
}
