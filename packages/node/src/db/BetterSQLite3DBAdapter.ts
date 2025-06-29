import fs from 'node:fs/promises';
import * as path from 'node:path';
import { Worker } from 'node:worker_threads';
import * as Comlink from 'comlink';

import {
  BaseObserver,
  BatchedUpdateNotification,
  DBAdapter,
  DBAdapterListener,
  LockContext,
  Transaction,
  DBLockOptions,
  QueryResult
} from '@powersync/common';
import { Remote } from 'comlink';
import { AsyncResource } from 'node:async_hooks';
import { AsyncDatabase, AsyncDatabaseOpener } from './AsyncDatabase.js';
import { RemoteConnection } from './RemoteConnection.js';
import { NodeSQLOpenOptions } from './options.js';

export type BetterSQLite3LockContext = LockContext & {
  executeBatch(query: string, params?: any[][]): Promise<QueryResult>;
};

export type BetterSQLite3Transaction = Transaction & BetterSQLite3LockContext;

const READ_CONNECTIONS = 5;

/**
 * Adapter for better-sqlite3
 */
export class BetterSQLite3DBAdapter extends BaseObserver<DBAdapterListener> implements DBAdapter {
  private readonly options: NodeSQLOpenOptions;
  public readonly name: string;

  private readConnections: RemoteConnection[];
  private writeConnection: RemoteConnection;

  private readonly readQueue: Array<(connection: RemoteConnection) => void> = [];
  private readonly writeQueue: Array<() => void> = [];

  constructor(options: NodeSQLOpenOptions) {
    super();

    if (options.readWorkerCount != null && options.readWorkerCount < 1) {
      throw `Needs at least one worker for reads, got ${options.readWorkerCount}`;
    }

    this.options = options;
    this.name = options.dbFilename;
  }

  async initialize() {
    let dbFilePath = this.options.dbFilename;
    if (this.options.dbLocation !== undefined) {
      // Make sure the dbLocation exists, we get a TypeError from better-sqlite3 otherwise.
      let directoryExists = false;
      try {
        const stat = await fs.stat(this.options.dbLocation);
        directoryExists = stat.isDirectory();
      } catch (_) {
        // If we can't even stat, the directory won't be accessible to SQLite either.
      }

      if (!directoryExists) {
        throw new Error(
          `The dbLocation directory at "${this.options.dbLocation}" does not exist. Please create it before opening the PowerSync database!`
        );
      }

      dbFilePath = path.join(this.options.dbLocation, dbFilePath);
    }

    const openWorker = async (isWriter: boolean) => {
      const isCommonJsModule = import.meta.isBundlingToCommonJs ?? false;
      let worker: Worker;
      const workerName = isWriter ? `write ${dbFilePath}` : `read ${dbFilePath}`;

      const workerFactory = this.options.openWorker ?? ((...args) => new Worker(...args));
      if (isCommonJsModule) {
        worker = workerFactory(path.resolve(__dirname, 'DefaultWorker.cjs'), { name: workerName });
      } else {
        worker = workerFactory(new URL('./DefaultWorker.js', import.meta.url), { name: workerName });
      }

      const listeners = new WeakMap<EventListenerOrEventListenerObject, (e: any) => void>();

      const comlink = Comlink.wrap<AsyncDatabaseOpener>({
        postMessage: worker.postMessage.bind(worker),
        addEventListener: (type, listener) => {
          let resolved: (event: any) => void =
            'handleEvent' in listener ? listener.handleEvent.bind(listener) : listener;

          // Comlink wants message events, but the message event on workers in Node returns the data only.
          if (type === 'message') {
            const original = resolved;

            resolved = (data) => {
              original({ data });
            };
          }

          listeners.set(listener, resolved);
          worker.addListener(type, resolved);
        },
        removeEventListener: (type, listener) => {
          const resolved = listeners.get(listener);
          if (!resolved) {
            return;
          }
          worker.removeListener(type, resolved);
        }
      });

      worker.once('error', (e) => {
        console.error('Unexpected PowerSync database worker error', e);
      });

      const database = (await comlink.open(dbFilePath, isWriter)) as Remote<AsyncDatabase>;
      return new RemoteConnection(worker, comlink, database);
    };

    // Open the writer first to avoid multiple threads enabling WAL concurrently (causing "database is locked" errors).
    this.writeConnection = await openWorker(true);
    const createWorkers: Promise<RemoteConnection>[] = [];
    const amountOfReaders = this.options.readWorkerCount ?? READ_CONNECTIONS;
    for (let i = 0; i < amountOfReaders; i++) {
      createWorkers.push(openWorker(false));
    }
    this.readConnections = await Promise.all(createWorkers);
  }

  async close() {
    await this.writeConnection.close();
    for (const connection of this.readConnections) {
      await connection.close();
    }
  }

  readLock<T>(fn: (tx: BetterSQLite3LockContext) => Promise<T>, _options?: DBLockOptions | undefined): Promise<T> {
    let resolveConnectionPromise!: (connection: RemoteConnection) => void;
    const connectionPromise = new Promise<RemoteConnection>((resolve, _reject) => {
      resolveConnectionPromise = AsyncResource.bind(resolve);
    });

    const connection = this.readConnections.find((connection) => !connection.isBusy);
    if (connection) {
      connection.isBusy = true;
      resolveConnectionPromise(connection);
    } else {
      this.readQueue.push(resolveConnectionPromise);
    }

    return (async () => {
      const connection = await connectionPromise;

      try {
        return await fn(connection);
      } finally {
        const next = this.readQueue.shift();
        if (next) {
          next(connection);
        } else {
          connection.isBusy = false;
        }
      }
    })();
  }

  writeLock<T>(fn: (tx: BetterSQLite3LockContext) => Promise<T>, _options?: DBLockOptions | undefined): Promise<T> {
    let resolveLockPromise!: () => void;
    const lockPromise = new Promise<void>((resolve, _reject) => {
      resolveLockPromise = AsyncResource.bind(resolve);
    });

    if (!this.writeConnection.isBusy) {
      this.writeConnection.isBusy = true;
      resolveLockPromise();
    } else {
      this.writeQueue.push(resolveLockPromise);
    }

    return (async () => {
      await lockPromise;

      try {
        try {
          return await fn(this.writeConnection);
        } finally {
          const updates = await this.writeConnection.database.collectCommittedUpdates();

          if (updates.tables.length > 0) {
            this.iterateListeners((cb) => cb.tablesUpdated?.(updates));
          }
        }
      } finally {
        const next = this.writeQueue.shift();
        if (next) {
          next();
        } else {
          this.writeConnection.isBusy = false;
        }
      }
    })();
  }

  readTransaction<T>(
    fn: (tx: BetterSQLite3Transaction) => Promise<T>,
    _options?: DBLockOptions | undefined
  ): Promise<T> {
    return this.readLock((ctx) => this.internalTransaction(ctx as RemoteConnection, fn));
  }

  writeTransaction<T>(
    fn: (tx: BetterSQLite3Transaction) => Promise<T>,
    _options?: DBLockOptions | undefined
  ): Promise<T> {
    return this.writeLock((ctx) => this.internalTransaction(ctx as RemoteConnection, fn));
  }

  private async internalTransaction<T>(
    connection: RemoteConnection,
    fn: (tx: BetterSQLite3Transaction) => Promise<T>
  ): Promise<T> {
    let finalized = false;
    const commit = async (): Promise<QueryResult> => {
      if (!finalized) {
        finalized = true;
        await connection.execute('COMMIT');
      }
      return { rowsAffected: 0 };
    };
    const rollback = async (): Promise<QueryResult> => {
      if (!finalized) {
        finalized = true;
        await connection.execute('ROLLBACK');
      }
      return { rowsAffected: 0 };
    };
    try {
      await connection.execute('BEGIN');
      const result = await fn({
        execute: (query, params) => connection.execute(query, params),
        executeRaw: (query, params) => connection.executeRaw(query, params),
        executeBatch: (query, params) => connection.executeBatch(query, params),
        get: (query, params) => connection.get(query, params),
        getAll: (query, params) => connection.getAll(query, params),
        getOptional: (query, params) => connection.getOptional(query, params),
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

  getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
    return this.readLock((ctx) => ctx.getAll(sql, parameters));
  }

  getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
    return this.readLock((ctx) => ctx.getOptional(sql, parameters));
  }

  get<T>(sql: string, parameters?: any[]): Promise<T> {
    return this.readLock((ctx) => ctx.get(sql, parameters));
  }

  execute(query: string, params?: any[] | undefined): Promise<QueryResult> {
    return this.writeLock((ctx) => ctx.execute(query, params));
  }

  executeRaw(query: string, params?: any[] | undefined): Promise<any[][]> {
    return this.writeLock((ctx) => ctx.executeRaw(query, params));
  }

  executeBatch(query: string, params?: any[][]): Promise<QueryResult> {
    return this.writeTransaction((ctx) => ctx.executeBatch(query, params));
  }

  async refreshSchema() {
    await this.writeConnection.refreshSchema();

    for (const readConnection of this.readConnections) {
      await readConnection.refreshSchema();
    }
  }
}
