import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

import {
  BaseObserver,
  BatchedUpdateNotification,
  DBAdapter,
  DBAdapterListener,
  DBLockOptions,
  LockContext,
  QueryResult,
  SQLOpenOptions,
  Transaction
} from '@powersync/common';
import Lock from 'async-lock';
import { PowerSyncCore } from '../plugin/PowerSyncCore';

export class CapacitorSQLiteAdapter extends BaseObserver<DBAdapterListener> implements DBAdapter {
  protected _writeConnection: SQLiteDBConnection | null;
  protected initializedPromise: Promise<void>;
  protected lock: Lock;
  // TODO update hooks
  protected tableUpdatesCache: Set<string>;

  constructor(protected options: SQLOpenOptions) {
    super();
    this._writeConnection = null;
    this.lock = new Lock();
    this.tableUpdatesCache = new Set();
    this.initializedPromise = this.init();
  }

  protected get writeConnection(): SQLiteDBConnection {
    if (!this._writeConnection) {
      throw new Error('Init not completed yet');
    }
    return this._writeConnection;
  }

  private async init() {
    await PowerSyncCore.registerCore();
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    await sqlite.closeConnection(this.options.dbFilename, false);
    this._writeConnection = await sqlite.createConnection(this.options.dbFilename, false, 'no-encryption', 1, false);
    await this._writeConnection.open();
  }

  async close(): Promise<void> {
    await this.initializedPromise;
    await this.writeConnection.close();
  }
  get name() {
    return this.options.dbFilename;
  }

  protected generateLockContext(): LockContext {
    const execute = async (query: string, params: any[] = []): Promise<QueryResult> => {
      await this.initializedPromise;
      const db = this.writeConnection;
      // TODO verify transactions
      // AND handle this better. This driver does not support returning results
      // for execute methods
      if (query.toLowerCase().trim().startsWith('select')) {
        let result = await db.query(query, params);
        let arrayResult = result.values ?? [];
        return {
          rowsAffected: 0,
          rows: {
            _array: arrayResult,
            length: arrayResult.length,
            item: (idx: number) => arrayResult[idx]
          }
        };
      } else {
        let result = await db.executeSet([{ statement: query, values: params }], false);
        // TODO document execute caveat
        return {
          insertId: result.changes?.lastId,
          rowsAffected: result.changes?.changes ?? 0,
          rows: {
            _array: [],
            length: 0,
            item: () => null
          }
        };
      }
    };

    const executeQuery = async (query: string, params?: any[]): Promise<QueryResult> => {
      await this.initializedPromise;
      const db = this.writeConnection;
      let result = await db.query(query, params);

      let arrayResult = result.values ?? [];

      return {
        rowsAffected: 0,
        rows: {
          _array: arrayResult,
          length: arrayResult.length,
          item: (idx: number) => arrayResult[idx]
        }
      };
    };

    const getAll = async <T>(query: string, params?: any[]): Promise<T[]> => {
      const result = await executeQuery(query, params);
      return result.rows?._array ?? ([] as T[]);
    };

    const getOptional = async <T>(query: string, params?: any[]): Promise<T | null> => {
      const results = await getAll<T>(query, params);
      return results.length > 0 ? results[0] : null;
    };

    const get = async <T>(query: string, params?: any[]): Promise<T> => {
      const result = await getOptional<T>(query, params);
      if (!result) {
        throw new Error(`No results for query: ${query}`);
      }
      return result;
    };

    const executeRaw = async (query: string, params?: any[]): Promise<any[][]> => {
      throw new Error('Not supported');
    };

    return {
      getAll,
      getOptional,
      get,
      executeRaw,
      execute
    };
  }

  execute(query: string, params?: any[]): Promise<QueryResult> {
    return this.writeLock((tx) => tx.execute(query, params));
  }

  executeRaw(query: string, params?: any[]): Promise<any[][]> {
    return this.writeLock((tx) => tx.executeRaw(query, params));
  }

  async executeBatch(query: string, params: any[][] = []): Promise<QueryResult> {
    await this.initializedPromise;
    let result = await this.writeConnection.executeSet(
      params.map((param) => ({
        statement: query,
        values: param
      }))
    );

    return {
      rowsAffected: result.changes?.changes ?? 0,
      insertId: result.changes?.lastId
    };
  }

  /**
   * We're not using separate read/write locks here because we can't implement connection pools on top of SQL.js.
   */
  readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.writeLock(fn, options);
  }

  readTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.readLock(async (ctx) => {
      return this.internalTransaction(ctx, fn);
    });
  }

  writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.lock.acquire('lock', async () => {
      await this.initializedPromise;
      const result = await fn(this.generateLockContext());

      const notification: BatchedUpdateNotification = {
        rawUpdates: [],
        tables: Array.from(this.tableUpdatesCache),
        groupedUpdates: {}
      };
      this.tableUpdatesCache.clear();
      this.iterateListeners((l) => l.tablesUpdated?.(notification));
      return result;
    });
  }

  writeTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.writeLock(async (ctx) => {
      return this.internalTransaction(ctx, fn);
    });
  }

  refreshSchema(): Promise<void> {
    return this.get("PRAGMA table_info('sqlite_master')");
  }

  getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
    return this.readLock((tx) => tx.getAll<T>(sql, parameters));
  }

  getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
    return this.readLock((tx) => tx.getOptional<T>(sql, parameters));
  }

  get<T>(sql: string, parameters?: any[]): Promise<T> {
    return this.readLock((tx) => tx.get<T>(sql, parameters));
  }

  protected async internalTransaction<T>(ctx: LockContext, fn: (tx: Transaction) => Promise<T>): Promise<T> {
    let finalized = false;
    const commit = async (): Promise<QueryResult> => {
      if (finalized) {
        return { rowsAffected: 0 };
      }
      finalized = true;
      return ctx.execute('COMMIT');
    };
    const rollback = async (): Promise<QueryResult> => {
      if (finalized) {
        return { rowsAffected: 0 };
      }
      finalized = true;
      return ctx.execute('ROLLBACK');
    };
    try {
      await ctx.execute('BEGIN');
      const result = await fn({
        ...ctx,
        commit,
        rollback
      });
      await commit();
      return result;
    } catch (ex) {
      try {
        await rollback();
      } catch (ex2) {
        // In rare cases, a rollback may fail.
        // Safe to ignore.
      }
      throw ex;
    }
  }
}
