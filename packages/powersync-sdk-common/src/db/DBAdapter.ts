/**
 * Set of generic interfaces to allow PowerSync compatibility with
 * different SQLite DB implementations.
 */

import { BaseListener, BaseObserverInterface } from '../utils/BaseObserver';

/**
 * Object returned by SQL Query executions {
 *  insertId: Represent the auto-generated row id if applicable
 *  rowsAffected: Number of affected rows if result of a update query
 *  message: if status === 1, here you will find error description
 *  rows: if status is undefined or 0 this object will contain the query results
 * }
 *
 * @interface QueryResult
 */
export type QueryResult = {
  insertId?: number;
  rowsAffected: number;
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
  getAll<T>(sql: string, parameters?: any[]): Promise<T[]>;
  getOptional<T>(sql: string, parameters?: any[]): Promise<T | null>;
  get<T>(sql: string, parameters?: any[]): Promise<T>;
}

export interface LockContext extends DBGetUtils {
  execute: (query: string, params?: any[] | undefined) => QueryResult;
  executeAsync: (query: string, params?: any[] | undefined) => Promise<QueryResult>;
}

export interface Transaction extends LockContext {
  commit: () => QueryResult;
  commitAsync: () => Promise<QueryResult>;
  rollback: () => QueryResult;
  rollbackAsync: () => Promise<QueryResult>;
}

/**
 * Update table operation numbers from SQLite
 */
export enum RowUpdateType {
  SQLITE_INSERT = 18,
  SQLITE_DELETE = 9,
  SQLITE_UPDATE = 23
}
export interface UpdateNotification {
  opType: RowUpdateType;
  table: string;
  rowId: number;
}

export interface DBAdapterListener extends BaseListener {
  tablesUpdated: (updateNotification: UpdateNotification) => void;
}

export interface DBLockOptions {
  timeoutMs?: number;
}

export interface DBAdapter extends BaseObserverInterface<DBAdapterListener>, DBGetUtils {
  close: () => void;
  readLock: <T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions) => Promise<T>;
  readTransaction: <T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions) => Promise<T>;
  writeLock: <T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions) => Promise<T>;
  writeTransaction: <T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions) => Promise<T>;
  execute: (query: string, params?: any[]) => Promise<QueryResult>;
}
