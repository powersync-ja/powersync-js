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
import { getNavigatorLocks } from '../..//shared/navigator';
import { AsyncDatabaseConnection } from './AsyncDatabaseConnection';
import { SharedConnectionWorker, WebDBAdapter } from './WebDBAdapter';
import {
  WorkerConnectionClosedError,
  WorkerWrappedAsyncDatabaseConnection
} from './WorkerWrappedAsyncDatabaseConnection';
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
}

export type LockedAsyncDatabaseAdapterListener = DBAdapterListener & {
  initialized?: () => void;
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
  protected requiresReOpen: boolean;

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
    this.requiresReOpen = false;
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
    // Dispose any previous table change listener.
    this._disposeTableChangeListener?.();
    this._disposeTableChangeListener = null;

    this._db = await this.options.openConnection();
    await this._db.init();
    this._config = await this._db.getConfig();
    await this.registerOnChangeListener(this._db);
    /**
     * This is only required for the long-lived shared IndexedDB connections.
     */
    this.requiresHolds = (this._config as ResolvedWASQLiteOpenFactoryOptions).vfs == WASQLiteVFS.IDBBatchAtomicVFS;
  }

  protected async _init() {
    await this.openInternalDB();
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

  protected async acquireLock(callback: () => Promise<any>, options?: { timeoutMs?: number }): Promise<any> {
    await this.waitForInitialized();

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
        const holdId = this.requiresHolds ? await this.baseDB.markHold() : null;
        try {
          if (this.requiresReOpen) {
            await this.openInternalDB();
            this.requiresReOpen = false;
          }
          return await callback();
        } catch (ex) {
          if (ex instanceof WorkerConnectionClosedError) {
            this.requiresReOpen = true;
          }
          throw ex;
        } finally {
          if (holdId) {
            await this.baseDB.releaseHold(holdId);
          }
        }
      }
    );
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
