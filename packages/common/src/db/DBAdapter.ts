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

export interface LockContext extends DBGetUtils {
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

export interface DBAdapter extends BaseObserverInterface<DBAdapterListener>, DBGetUtils {
  close: () => void | Promise<void>;
  execute: (query: string, params?: any[]) => Promise<QueryResult>;
  executeRaw: (query: string, params?: any[]) => Promise<any[][]>;
  executeBatch: (query: string, params?: any[][]) => Promise<QueryResult>;
  name: string;
  readLock: <T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions) => Promise<T>;
  readTransaction: <T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions) => Promise<T>;
  writeLock: <T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions) => Promise<T>;
  writeTransaction: <T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions) => Promise<T>;
  /**
   * This method refreshes the schema information across all connections. This is for advanced use cases, and should generally not be needed.
   */
  refreshSchema: () => Promise<void>;
}

export function isBatchedUpdateNotification(
  update: BatchedUpdateNotification | UpdateNotification
): update is BatchedUpdateNotification {
  return 'tables' in update;
}

export function convertToBatchedUpdateNotification(updates: UpdateNotification[]): BatchedUpdateNotification {
  const groupedUpdates: BatchedUpdateNotification['groupedUpdates'] = {};

  for (const update of updates) {
    groupedUpdates[update.table] ??= [];
    groupedUpdates[update.table].push(update);
  }

  return {
    tables: Object.keys(groupedUpdates),
    rawUpdates: updates,
    groupedUpdates
  };
}

export function convertToUpdateNotifications(update: BatchedUpdateNotification): UpdateNotification[] {
  // Not all implementations emit a complete batched update.
  // Some only emit the table names, or not even that.
  if (update.rawUpdates?.length) {
    return update.rawUpdates;
  }
  if (Object.keys(update.groupedUpdates ?? {}).length) {
    return Object.entries(update.groupedUpdates).flatMap(([table, updates]) =>
      updates.map((update) => ({ ...update, table }))
    );
  }
  if (update.tables?.length) {
    return update.tables.map((table) => {
      return { table } as unknown as UpdateNotification;
    });
  }
  return [];
}

export function extractTableUpdates(update: BatchedUpdateNotification | UpdateNotification) {
  return isBatchedUpdateNotification(update) ? update.tables : [update.table];
}
