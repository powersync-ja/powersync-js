/**
 * Set of generic interfaces to allow PowerSync compatibility with
 * different SQLite DB implementations.
 */

import { BaseListener, BaseObserverInterface } from '../utils/BaseObserver.js';

/**
 * TODO most of these types could be exported to a common `types` package
 * which is used by the DB adapter libraries as well.
 */

/**
 * Object returned by SQL Query executions.
 */
export type QueryResult = {
  /** Represents the auto-generated row id if applicable. */
  insertId?: number;
  /** Number of affected rows if result of a update query. */
  rowsAffected: number;
  /** if status is undefined or 0 this object will contain the query results */
  rows?: {
    /** Raw array with all dataset */
    _array: any[];
    /** The length of the dataset */
    length: number;
    /** A convenience function to acess the index based the row object
     * @param idx the row index
     * @returns the row structure identified by column names
     */
    item: (idx: number) => any;
  };
};

export interface DBGetUtils {
  /** Execute a read-only query and return results. */
  getAll<T>(sql: string, parameters?: any[]): Promise<T[]>;
  /** Execute a read-only query and return the first result, or null if the ResultSet is empty. */
  getOptional<T>(sql: string, parameters?: any[]): Promise<T | null>;
  /** Execute a read-only query and return the first result, error if the ResultSet is empty. */
  get<T>(sql: string, parameters?: any[]): Promise<T>;
}

export interface SqlExecutor {
  /** Execute a single write statement. */
  execute: (query: string, params?: any[] | undefined) => Promise<QueryResult>;
  /**
   * Execute a single write statement and return raw results.
   * Unlike `execute`, which returns an object with structured key-value pairs,
   * `executeRaw` returns a nested array of raw values, where each row is
   * represented as an array of column values without field names.
   *
   * Example result:
   *
   * ```[ [ '1', 'list 1', '33', 'Post content', '1' ] ]```
   *
   * Where as `execute`'s `rows._array` would have been:
   *
   * ```[ { id: '33', name: 'list 1', content: 'Post content', list_id: '1' } ]```
   */
  executeRaw: (query: string, params?: any[] | undefined) => Promise<any[][]>;

  executeBatch: (query: string, params?: any[][]) => Promise<QueryResult>;
}

export interface LockContext extends SqlExecutor, DBGetUtils {}

/**
 * Implements {@link DBGetUtils} on a {@link SqlRunner}.
 */
export function DBGetUtilsDefaultMixin<TBase extends new (...args: any[]) => Omit<SqlExecutor, 'executeBatch'>>(
  Base: TBase
) {
  return class extends Base implements DBGetUtils, SqlExecutor {
    async getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
      const res = await this.execute(sql, parameters);
      return res.rows?._array ?? [];
    }

    async getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
      const res = await this.execute(sql, parameters);
      return res.rows?.item(0) ?? null;
    }

    async get<T>(sql: string, parameters?: any[]): Promise<T> {
      const res = await this.execute(sql, parameters);
      const first = res.rows?.item(0);
      if (!first) {
        throw new Error('Result set is empty');
      }
      return first;
    }

    async executeBatch(query: string, params: any[][] = []): Promise<QueryResult> {
      // If this context can run batch statements natively, use that.
      // @ts-ignore
      if (super.executeBatch) {
        // @ts-ignore
        return super.executeBatch(query, params);
      }

      // Emulate executeBatch by running statements individually.
      let lastInsertId: number | undefined;
      let rowsAffected = 0;
      for (const set of params) {
        const result = await this.execute(query, set);
        lastInsertId = result.insertId;
        rowsAffected += result.rowsAffected;
      }

      return {
        rowsAffected,
        insertId: lastInsertId
      };
    }
  };
}

export interface Transaction extends LockContext {
  /** Commit multiple changes to the local DB using the Transaction context. */
  commit: () => Promise<QueryResult>;
  /** Roll back multiple attempted changes using the Transaction context. */
  rollback: () => Promise<QueryResult>;
}

/**
 * Update table operation numbers from SQLite
 */
export enum RowUpdateType {
  SQLITE_INSERT = 18,
  SQLITE_DELETE = 9,
  SQLITE_UPDATE = 23
}
export interface TableUpdateOperation {
  opType: RowUpdateType;
  rowId: number;
}
/**
 * Notification of an update to one or more tables, for the purpose of realtime change notifications.
 */
export interface UpdateNotification extends TableUpdateOperation {
  table: string;
}

export interface BatchedUpdateNotification {
  rawUpdates: UpdateNotification[];
  tables: string[];
  groupedUpdates: Record<string, TableUpdateOperation[]>;
}

export interface DBAdapterListener extends BaseListener {
  /**
   * Listener for table updates.
   * Allows for single table updates in order to maintain API compatibility
   * without the need for a major version bump
   * The DB adapter can also batch update notifications if supported.
   */
  tablesUpdated: (updateNotification: BatchedUpdateNotification | UpdateNotification) => void;
}

export interface DBLockOptions {
  timeoutMs?: number;
}

export interface ConnectionPool extends BaseObserverInterface<DBAdapterListener> {
  name: string;
  close: () => void | Promise<void>;
  readLock: <T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions) => Promise<T>;
  writeLock: <T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions) => Promise<T>;

  /**
   * This method refreshes the schema information across all connections. This is for advanced use cases, and should generally not be needed.
   */
  refreshSchema: () => Promise<void>;
}

export interface DBAdapter extends ConnectionPool, SqlExecutor, DBGetUtils {
  readTransaction: <T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions) => Promise<T>;
  writeTransaction: <T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions) => Promise<T>;
}

/**
 * A mixin to implement {@link DBAdapter} by delegating to {@link ConnectionPool.readLock} and
 * {@link ConnectionPool.writeLock}.
 */
export function DBAdapterDefaultMixin<TBase extends new (...args: any[]) => ConnectionPool>(Base: TBase) {
  return class extends Base implements DBAdapter {
    readTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions): Promise<T> {
      return this.readLock((ctx) => TransactionImplementation.runWith(ctx, fn), options);
    }

    writeTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions): Promise<T> {
      return this.writeLock((ctx) => TransactionImplementation.runWith(ctx, fn), options);
    }

    getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
      return this.readLock((ctx) => ctx.getAll(sql, parameters));
    }

    getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
      return this.readLock((ctx) => ctx.getOptional(sql, parameters));
    }

    get<T>(sql: string, parameters?: any[]): Promise<T> {
      return this.readLock((ctx) => ctx.get(sql, parameters));
    }

    execute(query: string, params?: any[]): Promise<QueryResult> {
      return this.writeLock((ctx) => ctx.execute(query, params));
    }

    executeRaw(query: string, params?: any[]): Promise<any[][]> {
      return this.writeLock((ctx) => ctx.executeRaw(query, params));
    }

    executeBatch(query: string, params?: any[][]): Promise<QueryResult> {
      return this.writeTransaction((tx) => tx.executeBatch(query, params));
    }
  };
}

class BaseTransaction implements SqlExecutor {
  private finalized = false;

  constructor(private inner: SqlExecutor) {}

  async commit(): Promise<QueryResult> {
    if (this.finalized) {
      return { rowsAffected: 0 };
    }
    this.finalized = true;
    return this.inner.execute('COMMIT');
  }

  async rollback(): Promise<QueryResult> {
    if (this.finalized) {
      return { rowsAffected: 0 };
    }
    this.finalized = true;
    return this.inner.execute('ROLLBACK');
  }

  execute(query: string, params?: any[] | undefined): Promise<QueryResult> {
    return this.inner.execute(query, params);
  }

  executeRaw(query: string, params?: any[] | undefined): Promise<any[][]> {
    return this.inner.executeRaw(query, params);
  }

  executeBatch(query: string, params?: any[][]): Promise<QueryResult> {
    return this.inner.executeBatch(query, params);
  }
}

class TransactionImplementation extends DBGetUtilsDefaultMixin(BaseTransaction) {
  static async runWith<T>(ctx: LockContext, fn: (tx: Transaction) => Promise<T>): Promise<T> {
    let tx = new TransactionImplementation(ctx);

    try {
      await ctx.execute('BEGIN IMMEDIATE');

      const result = await fn(tx);
      await tx.commit();
      return result;
    } catch (ex) {
      try {
        await tx.rollback();
      } catch (ex2) {
        // In rare cases, a rollback may fail.
        // Safe to ignore.
      }
      throw ex;
    }
  }
}

export function isBatchedUpdateNotification(
  update: BatchedUpdateNotification | UpdateNotification
): update is BatchedUpdateNotification {
  return 'tables' in update;
}

export function extractTableUpdates(update: BatchedUpdateNotification | UpdateNotification) {
  return isBatchedUpdateNotification(update) ? update.tables : [update.table];
}
