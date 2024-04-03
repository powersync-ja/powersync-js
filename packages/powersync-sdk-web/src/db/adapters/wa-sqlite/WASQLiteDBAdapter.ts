import {
  BaseObserver,
  DBAdapter,
  DBAdapterListener,
  DBGetUtils,
  DBLockOptions,
  LockContext,
  PowerSyncOpenFactoryOptions,
  QueryResult,
  Transaction
} from '@journeyapps/powersync-sdk-common';
import * as Comlink from 'comlink';
import Logger, { ILogger } from 'js-logger';
import type { DBWorkerInterface, OpenDB } from '../../../worker/db/open-db';
import { getWorkerDatabaseOpener } from '../../../worker/db/open-worker-database';

export type WASQLiteFlags = {
  enableMultiTabs?: boolean;
};

export interface WASQLiteDBAdapterOptions extends Omit<PowerSyncOpenFactoryOptions, 'schema'> {
  flags?: WASQLiteFlags;
  /**
   * Use an existing port to an initialized worker.
   * A worker will be initialized if none is provided
   */
  workerPort?: MessagePort;
}

/**
 * Adapter for WA-SQLite
 */
export class WASQLiteDBAdapter extends BaseObserver<DBAdapterListener> implements DBAdapter {
  private initialized: Promise<void>;
  private logger: ILogger;
  private dbGetHelpers: DBGetUtils | null;
  private workerMethods: DBWorkerInterface | null;

  constructor(protected options: WASQLiteDBAdapterOptions) {
    super();
    this.logger = Logger.get('WASQLite');
    this.dbGetHelpers = null;
    this.workerMethods = null;
    this.initialized = this.init();
    this.dbGetHelpers = this.generateDBHelpers({ execute: this._execute.bind(this) });
  }

  get name() {
    return this.options.dbFilename;
  }

  protected get flags(): WASQLiteFlags {
    return this.options.flags ?? {};
  }

  getWorker() {}

  protected async init() {
    const { enableMultiTabs } = this.flags;
    if (!enableMultiTabs) {
      this.logger.warn('Multiple tabs are not enabled in this browser');
    }

    const dbOpener = this.options.workerPort
      ? Comlink.wrap<OpenDB>(this.options.workerPort)
      : getWorkerDatabaseOpener(this.options.dbFilename, enableMultiTabs);

    this.workerMethods = await dbOpener(this.options.dbFilename);

    this.workerMethods.registerOnTableChange(
      Comlink.proxy((opType: number, tableName: string, rowId: number) => {
        this.iterateListeners((cb) => cb.tablesUpdated?.({ opType, table: tableName, rowId }));
      })
    );
  }

  async execute(query: string, params?: any[] | undefined): Promise<QueryResult> {
    return this.writeLock((ctx) => ctx.execute(query, params));
  }

  // TODO: Implement batch query execution
  async executeBatch(query: string, parameterSet?: any[] | undefined): Promise<QueryResult> {
    return new Promise(() => '') as Promise<QueryResult>;
  }

  /**
   * Wraps the worker execute function, awaiting for it to be available
   */
  private _execute = async (sql: string, bindings?: any[]): Promise<QueryResult> => {
    await this.initialized;
    const result = await this.workerMethods!.execute!(sql, bindings);
    return {
      ...result,
      rows: {
        ...result.rows,
        item: (idx: number) => result.rows._array[idx]
      }
    };
  };

  /**
   * Attempts to close the connection.
   * Shared workers might not actually close the connection if other
   * tabs are still using it.
   */
  close() {
    this.workerMethods?.close?.();
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
    return navigator.locks.request(`db-lock-${this.options.dbFilename}`, callback);
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
        await rollback();
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
}
