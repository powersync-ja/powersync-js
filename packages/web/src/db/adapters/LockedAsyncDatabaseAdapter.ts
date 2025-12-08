import {
  BaseObserver,
  DBAdapter,
  DBAdapterListener,
  DBGetUtils,
  DBLockOptions,
  LockContext,
  QueryResult,
  Transaction,
  createLogger,
  type ILogger
} from '@powersync/common';
import { getNavigatorLocks } from '../../shared/navigator';
import { AsyncDatabaseConnection, ConnectionClosedError } from './AsyncDatabaseConnection';
import { SharedConnectionWorker, WebDBAdapter } from './WebDBAdapter';
import { WorkerWrappedAsyncDatabaseConnection } from './WorkerWrappedAsyncDatabaseConnection';
import { WASQLiteVFS } from './wa-sqlite/WASQLiteConnection';
import { ResolvedWASQLiteOpenFactoryOptions } from './wa-sqlite/WASQLiteOpenFactory';
import { ResolvedWebSQLOpenOptions } from './web-sql-flags';

/**
 * @internal
 */
export interface LockedAsyncDatabaseAdapterOptions {
  name: string;
  openConnection: () => Promise<AsyncDatabaseConnection>;
  debugMode?: boolean;
  logger?: ILogger;
  defaultLockTimeoutMs?: number;
  reOpenOnConnectionClosed?: boolean;
}

export type LockedAsyncDatabaseAdapterListener = DBAdapterListener & {
  initialized?: () => void;
  /**
   * Fired when the database is re-opened after being closed.
   */
  databaseReOpened?: () => void;
};

/**
 * @internal
 * Wraps a {@link AsyncDatabaseConnection} and provides exclusive locking functions in
 * order to implement {@link DBAdapter}.
 */
export class LockedAsyncDatabaseAdapter
  extends BaseObserver<LockedAsyncDatabaseAdapterListener>
  implements WebDBAdapter
{
  private logger: ILogger;
  private dbGetHelpers: DBGetUtils | null;
  private debugMode: boolean;
  private _dbIdentifier: string;
  protected initPromise: Promise<void>;
  private _db: AsyncDatabaseConnection | null = null;
  protected _disposeTableChangeListener: (() => void) | null = null;
  private _config: ResolvedWebSQLOpenOptions | null = null;
  protected pendingAbortControllers: Set<AbortController>;
  protected requiresHolds: boolean | null;
  protected databaseOpenPromise: Promise<void> | null = null;

  closing: boolean;
  closed: boolean;

  constructor(protected options: LockedAsyncDatabaseAdapterOptions) {
    super();
    this._dbIdentifier = options.name;
    this.logger = options.logger ?? createLogger(`LockedAsyncDatabaseAdapter - ${this._dbIdentifier}`);
    this.pendingAbortControllers = new Set<AbortController>();
    this.closed = false;
    this.closing = false;
    this.requiresHolds = null;
    // Set the name if provided. We can query for the name if not available yet
    this.debugMode = options.debugMode ?? false;
    if (this.debugMode) {
      const originalExecute = this._execute.bind(this);
      this._execute = async (sql, bindings) => {
        const start = performance.now();
        try {
          const r = await originalExecute(sql, bindings);
          performance.measure(`[SQL] ${sql}`, { start });
          return r;
        } catch (e: any) {
          performance.measure(`[SQL] [ERROR: ${e.message}] ${sql}`, { start });
          throw e;
        }
      };
    }

    this.dbGetHelpers = this.generateDBHelpers({
      execute: (query, params) => this.acquireLock(() => this._execute(query, params)),
      executeRaw: (query, params) => this.acquireLock(() => this._executeRaw(query, params))
    });
    this.initPromise = this._init();
  }

  protected get baseDB() {
    if (!this._db) {
      throw new Error(`Initialization has not completed yet. Cannot access base db`);
    }
    return this._db;
  }

  get name() {
    return this._dbIdentifier;
  }

  /**
   * Init is automatic, this helps catch errors or explicitly await initialization
   */
  async init() {
    return this.initPromise;
  }

  protected async openInternalDB() {
    /**
     * Execute opening of the db in a lock in order not to interfere with other operations.
     */
    return this._acquireLock(async () => {
      // Dispose any previous table change listener.
      this._disposeTableChangeListener?.();
      this._disposeTableChangeListener = null;
      this._db?.close().catch((ex) => this.logger.warn(`Error closing database before opening new instance`, ex));
      const isReOpen = !!this._db;
      this._db = null;

      this._db = await this.options.openConnection();
      await this._db.init();
      this._config = await this._db.getConfig();
      await this.registerOnChangeListener(this._db);
      if (isReOpen) {
        this.iterateListeners((cb) => cb.databaseReOpened?.());
      }
      /**
       * This is only required for the long-lived shared IndexedDB connections.
       */
      this.requiresHolds = (this._config as ResolvedWASQLiteOpenFactoryOptions).vfs == WASQLiteVFS.IDBBatchAtomicVFS;
    });
  }

  protected _reOpen() {
    this.databaseOpenPromise = this.openInternalDB().finally(() => {
      this.databaseOpenPromise = null;
    });
    return this.databaseOpenPromise;
  }

  /**
   * Re-opens the underlying database.
   * Returns a pending operation if one is already in progress.
   */
  async reOpenInternalDB(): Promise<void> {
    if (!this.options.reOpenOnConnectionClosed) {
      throw new Error(`Cannot re-open underlying database, reOpenOnConnectionClosed is not enabled`);
    }
    if (this.databaseOpenPromise) {
      return this.databaseOpenPromise;
    }
    return this._reOpen();
  }

  protected async _init() {
    /**
     * For OPFS, we can see this open call sometimes fail due to NoModificationAllowedError.
     * We should be able to recover from this by re-opening the database.
     */
    const maxAttempts = 3;
    for (let count = 0; count < maxAttempts; count++) {
      try {
        await this.openInternalDB();
        break;
      } catch (ex) {
        if (count == maxAttempts - 1) {
          throw ex;
        }
        this.logger.warn(`Attempt ${count + 1} of ${maxAttempts} to open database failed, retrying in 1 second...`, ex);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    this.iterateListeners((cb) => cb.initialized?.());
  }

  getConfiguration(): ResolvedWebSQLOpenOptions {
    if (!this._config) {
      throw new Error(`Cannot get config before initialization is completed`);
    }
    return this._config;
  }

  protected async waitForInitialized() {
    // Awaiting this will expose errors on function calls like .execute etc
    await this.initPromise;
  }

  async shareConnection(): Promise<SharedConnectionWorker> {
    if (false == this._db instanceof WorkerWrappedAsyncDatabaseConnection) {
      throw new Error(`Only worker connections can be shared`);
    }
    return (this._db as WorkerWrappedAsyncDatabaseConnection).shareConnection();
  }

  /**
   * Registers a table change notification callback with the base database.
   * This can be extended by custom implementations in order to handle proxy events.
   */
  protected async registerOnChangeListener(db: AsyncDatabaseConnection) {
    this._disposeTableChangeListener = await db.registerOnTableChange((event) => {
      this.iterateListeners((cb) => cb.tablesUpdated?.(event));
    });
  }

  /**
   * This is currently a no-op on web
   */
  async refreshSchema(): Promise<void> {}

  async execute(query: string, params?: any[] | undefined): Promise<QueryResult> {
    return this.writeLock((ctx) => ctx.execute(query, params));
  }

  async executeRaw(query: string, params?: any[] | undefined): Promise<any[][]> {
    return this.writeLock((ctx) => ctx.executeRaw(query, params));
  }

  async executeBatch(query: string, params?: any[][]): Promise<QueryResult> {
    return this.writeLock((ctx) => this._executeBatch(query, params));
  }

  /**
   * Attempts to close the connection.
   * Shared workers might not actually close the connection if other
   * tabs are still using it.
   */
  async close() {
    this.closing = true;
    this._disposeTableChangeListener?.();
    this.pendingAbortControllers.forEach((controller) => controller.abort('Closed'));
    await this.baseDB?.close?.();
    this.closed = true;
  }

  async getAll<T>(sql: string, parameters?: any[] | undefined): Promise<T[]> {
    await this.waitForInitialized();
    return this.dbGetHelpers!.getAll(sql, parameters);
  }

  async getOptional<T>(sql: string, parameters?: any[] | undefined): Promise<T | null> {
    await this.waitForInitialized();
    return this.dbGetHelpers!.getOptional(sql, parameters);
  }

  async get<T>(sql: string, parameters?: any[] | undefined): Promise<T> {
    await this.waitForInitialized();
    return this.dbGetHelpers!.get(sql, parameters);
  }

  async readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions | undefined): Promise<T> {
    await this.waitForInitialized();
    return this.acquireLock(
      async () => fn(this.generateDBHelpers({ execute: this._execute, executeRaw: this._executeRaw })),
      {
        timeoutMs: options?.timeoutMs ?? this.options.defaultLockTimeoutMs
      }
    );
  }

  async writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions | undefined): Promise<T> {
    await this.waitForInitialized();
    return this.acquireLock(
      async () => fn(this.generateDBHelpers({ execute: this._execute, executeRaw: this._executeRaw })),
      {
        timeoutMs: options?.timeoutMs ?? this.options.defaultLockTimeoutMs
      }
    );
  }

  protected async _acquireLock(callback: () => Promise<any>, options?: { timeoutMs?: number }): Promise<any> {
    if (this.closing) {
      throw new Error(`Cannot acquire lock, the database is closing`);
    }
    const abortController = new AbortController();
    this.pendingAbortControllers.add(abortController);
    const { timeoutMs } = options ?? {};

    const timeoutId = timeoutMs
      ? setTimeout(() => {
          abortController.abort(`Timeout after ${timeoutMs}ms`);
          this.pendingAbortControllers.delete(abortController);
        }, timeoutMs)
      : null;

    return getNavigatorLocks().request(
      `db-lock-${this._dbIdentifier}`,
      { signal: abortController.signal },
      async () => {
        this.pendingAbortControllers.delete(abortController);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        return await callback();
      }
    );
  }

  protected async acquireLock(callback: () => Promise<any>, options?: { timeoutMs?: number }): Promise<any> {
    await this.waitForInitialized();

    // The database is being opened in the background. Wait for it here.
    if (this.databaseOpenPromise) {
      await this.databaseOpenPromise;
    }

    return this._acquireLock(async () => {
      let holdId: string | null = null;
      try {
        // We can't await this since it uses the same lock as we're in now.
        if (this.databaseOpenPromise) {
          throw new ConnectionClosedError('Connection is busy re-opening');
        }

        holdId = this.requiresHolds ? await this.baseDB.markHold() : null;
        return await callback();
      } catch (ex) {
        if (ex instanceof ConnectionClosedError) {
          if (this.options.reOpenOnConnectionClosed && !this.databaseOpenPromise && !this.closing) {
            // Immediately re-open the database. We need to miss as little table updates as possible.
            // Note, don't await this since it uses the same lock as we're in now.
            this.reOpenInternalDB();
          }
        }
        throw ex;
      } finally {
        if (holdId) {
          await this.baseDB.releaseHold(holdId);
        }
      }
    }, options);
  }

  async readTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions | undefined): Promise<T> {
    return this.readLock(this.wrapTransaction(fn));
  }

  writeTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions | undefined): Promise<T> {
    return this.writeLock(this.wrapTransaction(fn, true));
  }

  private generateDBHelpers<
    T extends {
      execute: (sql: string, params?: any[]) => Promise<QueryResult>;
      executeRaw: (sql: string, params?: any[]) => Promise<any[][]>;
    }
  >(tx: T): T & DBGetUtils {
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

  /**
   * Wraps a lock context into a transaction context
   */
  private wrapTransaction<T>(cb: (tx: Transaction) => Promise<T>, write = false) {
    return async (tx: LockContext): Promise<T> => {
      await this._execute(write ? 'BEGIN EXCLUSIVE' : 'BEGIN');
      let finalized = false;
      const commit = async (): Promise<QueryResult> => {
        if (finalized) {
          return { rowsAffected: 0 };
        }
        finalized = true;
        return this._execute('COMMIT');
      };

      const rollback = () => {
        finalized = true;
        return this._execute('ROLLBACK');
      };

      try {
        const result = await cb({
          ...tx,
          commit,
          rollback
        });

        if (!finalized) {
          await commit();
        }
        return result;
      } catch (ex) {
        this.logger.debug('Caught ex in transaction', ex);
        try {
          await rollback();
        } catch (ex2) {
          // In rare cases, a rollback may fail.
          // Safe to ignore.
        }
        throw ex;
      }
    };
  }

  /**
   * Wraps the worker execute function, awaiting for it to be available
   */
  private _execute = async (sql: string, bindings?: any[]): Promise<QueryResult> => {
    await this.waitForInitialized();

    const result = await this.baseDB.execute(sql, bindings);
    return {
      ...result,
      rows: {
        ...result.rows,
        item: (idx: number) => result.rows._array[idx]
      }
    };
  };

  /**
   * Wraps the worker executeRaw function, awaiting for it to be available
   */
  private _executeRaw = async (sql: string, bindings?: any[]): Promise<any[][]> => {
    await this.waitForInitialized();
    return await this.baseDB.executeRaw(sql, bindings);
  };

  /**
   * Wraps the worker executeBatch function, awaiting for it to be available
   */
  private _executeBatch = async (query: string, params?: any[]): Promise<QueryResult> => {
    await this.waitForInitialized();
    const result = await this.baseDB.executeBatch(query, params);
    return {
      ...result,
      rows: undefined
    };
  };
}
