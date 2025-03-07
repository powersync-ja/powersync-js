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

export function extractTableUpdates(update: BatchedUpdateNotification | UpdateNotification) {
  return isBatchedUpdateNotification(update) ? update.tables : [update.table];
}
