import {
  type DBAdapter,
  type DBAdapterListener,
  type DBGetUtils,
  type DBLockOptions,
  type LockContext,
  type PowerSyncOpenFactoryOptions,
  type QueryResult,
  type Transaction,
  BaseObserver
} from '@powersync/common';
import * as Comlink from 'comlink';
import Logger, { type ILogger } from 'js-logger';
import type { DBFunctionsInterface, OpenDB } from '../../../shared/types';
import { _openDB } from '../../../shared/open-db';
import { getWorkerDatabaseOpener, resolveWorkerDatabasePortFactory } from '../../../worker/db/open-worker-database';
import { ResolvedWebSQLOpenOptions, resolveWebSQLFlags, TemporaryStorageOption, WebSQLFlags } from '../web-sql-flags';
import { getNavigatorLocks } from '../../../shared/navigator';

/**
 * These flags are the same as {@link WebSQLFlags}.
 * This export is maintained only for API consistency
 */
export type WASQLiteFlags = WebSQLFlags;

export interface WASQLiteDBAdapterOptions extends Omit<PowerSyncOpenFactoryOptions, 'schema'> {
  flags?: WASQLiteFlags;
  /**
   * Use an existing port to an initialized worker.
   * A worker will be initialized if none is provided
   */
  workerPort?: MessagePort;

  worker?: string | URL | ((options: ResolvedWebSQLOpenOptions) => Worker | SharedWorker);

  temporaryStorage?: TemporaryStorageOption;
}

/**
 * Adapter for WA-SQLite SQLite connections.
 */
export class WASQLiteDBAdapter extends BaseObserver<DBAdapterListener> implements DBAdapter {
  private initialized: Promise<void>;
  private logger: ILogger;
  private dbGetHelpers: DBGetUtils | null;
  private methods: DBFunctionsInterface | null;
  private debugMode: boolean;

  constructor(protected options: WASQLiteDBAdapterOptions) {
    super();
    this.logger = Logger.get('WASQLite');
    this.dbGetHelpers = null;
    this.methods = null;
    this.debugMode = options.debugMode ?? false;
    if (this.debugMode) {
      const originalExecute = this._execute.bind(this);
      this._execute = async (sql, bindings) => {
        const start = performance.now();
        try {
          const r = await originalExecute(sql, bindings);
          const end = performance.now();
          performance.measure(`[SQL] ${sql}`, { start, end });
          const duration = end - start;
          if (duration >= 10) {
            const rw = await originalExecute(`EXPLAIN QUERY PLAN ${sql}`, bindings);
            const explain = rw.rows?._array ?? [];
            const sqlMessage = sql.trim();
            const newline = sqlMessage.indexOf('\n');
            const firstLine = newline >= 0 ? sqlMessage.substring(0, newline) + '...' : sqlMessage;
            console.groupCollapsed(
              '%c[SQL] %c%s %c%s',
              'color: grey; font-weight: normal',
              durationStyle(duration),
              `[${duration.toFixed(1)}ms]`,
              'color: grey; font-weight: normal',
              firstLine
            );
            if (newline >= 0) {
              console.log('%c%s', 'color: grey', sqlMessage);
            }
            if (explain.length > 0) {
              const emessage = explain.map((r) => `  ${r.detail}`).join('\n');
              console.log('%c%s\n%c%s', 'color: blue', '[EXPLAIN QUERY PLAN]', 'color: grey', emessage);
            }
            console.groupEnd();
          }
          return r;
        } catch (e: any) {
          performance.measure(`[SQL] [ERROR: ${e.message}] ${sql}`, { start });
          throw e;
        }
      };
    }
    this.initialized = this.init();
    this.dbGetHelpers = this.generateDBHelpers({
      execute: (query, params) => this.acquireLock(() => this._execute(query, params))
    });
  }

  get name() {
    return this.options.dbFilename;
  }

  protected get flags(): Required<WASQLiteFlags> {
    return resolveWebSQLFlags(this.options.flags ?? {});
  }

  getWorker() {}

  protected async init() {
    const { enableMultiTabs, useWebWorker } = this.flags;
    if (!enableMultiTabs) {
      this.logger.warn('Multiple tabs are not enabled in this browser');
    }

    const tempStoreQuery = `PRAGMA temp_store = ${this.options.temporaryStorage ?? TemporaryStorageOption.MEMORY};`;

    if (useWebWorker) {
      const optionsDbWorker = this.options.worker;

      const dbOpener = this.options.workerPort
        ? Comlink.wrap<OpenDB>(this.options.workerPort)
        : typeof optionsDbWorker === 'function'
          ? Comlink.wrap<OpenDB>(
              resolveWorkerDatabasePortFactory(() =>
                optionsDbWorker({
                  ...this.options,
                  flags: this.flags
                })
              )
            )
          : getWorkerDatabaseOpener(this.options.dbFilename, enableMultiTabs, optionsDbWorker);

      this.methods = await dbOpener(this.options.dbFilename);
      await this.methods!.execute(tempStoreQuery);
      this.methods.registerOnTableChange(
        Comlink.proxy((event) => {
          this.iterateListeners((cb) => cb.tablesUpdated?.(event));
        })
      );

      return;
    }
    this.methods = await _openDB(this.options.dbFilename, { useWebWorker: false });
    await this.methods!.execute(tempStoreQuery);
    this.methods.registerOnTableChange((event) => {
      this.iterateListeners((cb) => cb.tablesUpdated?.(event));
    });
  }

  async execute(query: string, params?: any[] | undefined): Promise<QueryResult> {
    return this.writeLock((ctx) => ctx.execute(query, params));
  }

  async executeBatch(query: string, params?: any[][]): Promise<QueryResult> {
    return this.writeLock((ctx) => this._executeBatch(query, params));
  }

  /**
   * Wraps the worker execute function, awaiting for it to be available
   */
  private _execute = async (sql: string, bindings?: any[]): Promise<QueryResult> => {
    await this.initialized;
    const result = await this.methods!.execute!(sql, bindings);
    return {
      ...result,
      rows: {
        ...result.rows,
        item: (idx: number) => result.rows._array[idx]
      }
    };
  };

  /**
   * Wraps the worker executeBatch function, awaiting for it to be available
   */
  private _executeBatch = async (query: string, params?: any[]): Promise<QueryResult> => {
    await this.initialized;
    const result = await this.methods!.executeBatch!(query, params);
    return {
      ...result,
      rows: undefined
    };
  };

  /**
   * Attempts to close the connection.
   * Shared workers might not actually close the connection if other
   * tabs are still using it.
   */
  close() {
    this.methods?.close?.();
  }

  async getAll<T>(sql: string, parameters?: any[] | undefined): Promise<T[]> {
    await this.initialized;
    return this.dbGetHelpers!.getAll(sql, parameters);
  }

  async getOptional<T>(sql: string, parameters?: any[] | undefined): Promise<T | null> {
    await this.initialized;
    return this.dbGetHelpers!.getOptional(sql, parameters);
  }

  async get<T>(sql: string, parameters?: any[] | undefined): Promise<T> {
    await this.initialized;
    return this.dbGetHelpers!.get(sql, parameters);
  }

  async readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions | undefined): Promise<T> {
    await this.initialized;
    return this.acquireLock(async () => fn(this.generateDBHelpers({ execute: this._execute })));
  }

  async writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions | undefined): Promise<T> {
    await this.initialized;
    return this.acquireLock(async () => fn(this.generateDBHelpers({ execute: this._execute })));
  }

  protected acquireLock(callback: () => Promise<any>): Promise<any> {
    return getNavigatorLocks().request(`db-lock-${this.options.dbFilename}`, callback);
  }

  async readTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions | undefined): Promise<T> {
    return this.readLock(this.wrapTransaction(fn));
  }

  writeTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions | undefined): Promise<T> {
    return this.writeLock(this.wrapTransaction(fn));
  }

  /**
   * Wraps a lock context into a transaction context
   */
  private wrapTransaction<T>(cb: (tx: Transaction) => Promise<T>) {
    return async (tx: LockContext): Promise<T> => {
      await this._execute('BEGIN TRANSACTION');
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

  async refreshSchema(): Promise<void> {}
}

function durationStyle(duration: number) {
  if (duration < 30) {
    return 'color: grey; font-weight: normal';
  } else if (duration < 300) {
    return 'color: blue; font-weight: normal';
  } else {
    return 'color: red; font-weight: normal';
  }
}
