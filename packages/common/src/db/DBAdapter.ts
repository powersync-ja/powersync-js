/**
 * Set of generic interfaces to allow PowerSync compatibility with
 * different SQLite DB implementations.
 */

import { BaseListener, BaseObserver } from '../utils/BaseObserver.js';
import {
  QueryResult,
  queryResultFromRaw,
  queryResultWithoutRows,
  RawQueryResult,
  SqliteRecord
} from './QueryResult.js';

/**
 * @public
 */
export interface DBGetUtils {
  /**
   *  Execute a read-only query and return results.
   *
   * @param sql - The SQL query to execute
   * @param parameters - Optional array of parameters to bind to the query
   * @returns An array of results
   */
  getAll<T>(sql: string, parameters?: any[]): Promise<T[]>;
  /**
   * Execute a read-only query and return the first result, or null if the ResultSet is empty.
   *
   * @param sql - The SQL query to execute
   * @param parameters - Optional array of parameters to bind to the query
   * @returns The first result if found, or null if no results are returned
   */
  getOptional<T>(sql: string, parameters?: any[]): Promise<T | null>;
  /**
   * Execute a read-only query and return the first result, error if the ResultSet is empty.
   *
   * @param sql - The SQL query to execute
   * @param parameters - Optional array of parameters to bind to the query
   * @returns The first result matching the query
   * @throws Error if no rows are returned
   */
  get<T>(sql: string, parameters?: any[]): Promise<T>;
}

/**
 * @public
 */
export interface SqlExecutor {
  /**
   * Execute a SQL write (INSERT/UPDATE/DELETE) query
   * and optionally return results.
   *
   * When using the default client-side [JSON-based view system](https://docs.powersync.com/architecture/client-architecture#client-side-schema-and-sqlite-database-structure),
   * the returned result's `rowsAffected` may be `0` for successful `UPDATE` and `DELETE` statements.
   * Use a `RETURNING` clause and inspect `result.rows` when you need to confirm which rows changed.
   *
   * @param sql - The SQL query to execute
   * @param parameters - Optional array of parameters to bind to the query
   * @returns The query result as an object with structured key-value pairs
   */
  execute: <T = SqliteRecord>(query: string, params?: any[] | undefined) => Promise<QueryResult<T>>;

  /**
   * Execute a SQL write (INSERT/UPDATE/DELETE) query directly on the database without any PowerSync processing.
   * This bypasses certain PowerSync abstractions and is useful for accessing the raw database results.
   *
   * @param sql - The SQL query to execute
   * @param parameters - Optional array of parameters to bind to the query
   * @returns The {@link RawQueryResult} representing each row as an array.
   */
  executeRaw: (query: string, params?: any[] | undefined) => Promise<RawQueryResult>;

  /**
   * Execute a write query (INSERT/UPDATE/DELETE) multiple times with each parameter set
   * and optionally return results.
   * This is faster than executing separately with each parameter set.
   *
   * @param sql - The SQL query to execute
   * @param parameters - Optional 2D array of parameter sets, where each inner array is a set of parameters for one execution
   * @returns The query result
   */
  executeBatch: (query: string, params?: any[][]) => Promise<QueryResult<never>>;
}

/**
 * @public
 */
export abstract class LockContext implements SqlExecutor, DBGetUtils {
  /**
   * How the connection has been opened.
   *
   * `readWrite` indicates that the lock context is capable of writing to the database.
   * `queryOnly` indicates that the lock context has been opened in a readwrite mode, but a `PRAGMA query_only = TRUE`
   * disabled writes.
   * `readOnly` indicates that the lock context has been opened by passing `SQLITE_OPEN_READONLY` to `sqlite3_open_v2`.
   */
  abstract get connectionType(): 'readWrite' | 'queryOnly' | 'readOnly';

  abstract executeRaw<T>(query: string, params?: any[] | undefined): Promise<RawQueryResult>;

  async getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
    const rs = await this.execute<T>(sql, parameters);
    return Array.from(rs);
  }

  async getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
    const { array } = await this.execute<T>(sql, parameters);
    if (array.length > 0) {
      return array[0];
    }

    return null;
  }

  async get<T>(sql: string, parameters?: any[]): Promise<T> {
    const row = await this.getOptional<T>(sql, parameters);
    if (row == null) {
      throw new Error('Result set is empty');
    }

    return row;
  }

  async execute<T = SqliteRecord>(query: string, params?: any[] | undefined): Promise<QueryResult<T>> {
    const raw = await this.executeRaw(query, params);
    return queryResultFromRaw(raw);
  }

  async executeBatch(query: string, params: any[][] = []): Promise<QueryResult<never>> {
    // Emulate executeBatch by running statements individually.
    let lastInsertId: number | undefined;
    let rowsAffected = 0;
    for (const set of params) {
      const result = await this.execute(query, set);
      lastInsertId = result.insertId;
      rowsAffected += result.rowsAffected ?? 0;
    }

    return queryResultWithoutRows({
      rowsAffected,
      insertId: lastInsertId
    });
  }
}

/**
 * @public
 */
export interface Transaction extends LockContext {
  /** Commit multiple changes to the local DB using the Transaction context. */
  commit: () => Promise<void>;
  /** Roll back multiple attempted changes using the Transaction context. */
  rollback: () => Promise<void>;
}

/**
 * @public
 */
export interface BatchedUpdateNotification {
  tables: string[];
}

/**
 * @public
 */
export interface DBAdapterListener extends BaseListener {
  /**
   * Listener for table updates.
   * Allows for single table updates in order to maintain API compatibility
   * without the need for a major version bump
   * The DB adapter can also batch update notifications if supported.
   */
  tablesUpdated: (updateNotification: BatchedUpdateNotification) => void;
}

/**
 * @public
 */
export interface DBLockOptions {
  timeoutMs?: number;
}

/**
 * @public
 */
export abstract class DBAdapter extends BaseObserver<DBAdapterListener> implements SqlExecutor, DBGetUtils {
  abstract get name(): string;

  abstract close(): void | Promise<void>;

  abstract readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T>;
  abstract writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T>;

  /**
   * This method refreshes the schema information across all connections. This is for advanced use cases, and should generally not be needed.
   */
  abstract refreshSchema(): Promise<void>;

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

  execute<T>(query: string, params?: any[]): Promise<QueryResult<T>> {
    return this.writeLock((ctx) => ctx.execute(query, params));
  }

  executeRaw(query: string, params?: any[]): Promise<RawQueryResult> {
    return this.writeLock((ctx) => ctx.executeRaw(query, params));
  }

  executeBatch(query: string, params?: any[][]): Promise<QueryResult<never>> {
    return this.writeTransaction((tx) => tx.executeBatch(query, params));
  }
}

class TransactionImplementation extends LockContext {
  private finalized = false;

  constructor(private inner: LockContext) {
    super();
  }

  get connectionType() {
    return this.inner.connectionType;
  }

  async commit(): Promise<void> {
    if (this.finalized) {
      return;
    }
    this.finalized = true;
    await this.inner.execute('COMMIT');
  }

  async rollback(): Promise<void> {
    if (this.finalized) {
      return;
    }
    this.finalized = true;
    await this.inner.execute('ROLLBACK');
  }

  execute<T>(query: string, params?: any[] | undefined): Promise<QueryResult<T>> {
    return this.inner.execute(query, params);
  }

  executeRaw(query: string, params?: any[] | undefined): Promise<RawQueryResult> {
    return this.inner.executeRaw(query, params);
  }

  executeBatch(query: string, params?: any[][]): Promise<QueryResult<never>> {
    return this.inner.executeBatch(query, params);
  }

  static async runWith<T>(ctx: LockContext, fn: (tx: Transaction) => Promise<T>): Promise<T> {
    let tx = new TransactionImplementation(ctx);

    // For write transactions, use BEGIN IMMEDIATE to immediately obtain a write lock on the database (instead of doing
    // that on the first statement). If we have a genuine read-only connection, we also use BEGIN IMMEDIATE there: In
    // WAL mode, that ensures we pin the current state of the database (instead of the state at the first statement in
    // the transaction). But if we have a "fake" read-only connection implemented through `pragma query_only = true`, we
    // can't use this trick because it would attempt to lock the connection. So there, we use a regular `BEGIN`
    // statement.
    const useBeginImmediate = ctx.connectionType != 'queryOnly';

    try {
      await ctx.execute(useBeginImmediate ? 'BEGIN IMMEDIATE' : 'BEGIN');

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
