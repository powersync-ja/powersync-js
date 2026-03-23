import * as Comlink from 'comlink';
import fs from 'node:fs/promises';
import * as path from 'node:path';
import { Worker } from 'node:worker_threads';

import {
  BaseObserver,
  BatchedUpdateNotification,
  ConnectionPool,
  DBAdapterDefaultMixin,
  DBAdapterListener,
  DBLockOptions,
  LockContext,
  QueryResult,
  Semaphore,
  timeoutSignal,
  Transaction
} from '@powersync/common';
import { Remote } from 'comlink';
import { isBundledToCommonJs } from '../utils/modules.js';
import { AsyncDatabase, AsyncDatabaseOpener } from './AsyncDatabase.js';
import { RemoteConnection } from './RemoteConnection.js';
import { NodeDatabaseImplementation, NodeSQLOpenOptions } from './options.js';

export type BetterSQLite3LockContext = LockContext & {
  executeBatch(query: string, params?: any[][]): Promise<QueryResult>;
};

export type BetterSQLite3Transaction = Transaction & BetterSQLite3LockContext;

const READ_CONNECTIONS = 5;

const defaultDatabaseImplementation: NodeDatabaseImplementation = {
  type: 'better-sqlite3'
};

/**
 * Adapter for better-sqlite3
 */
export class WorkerConnectionPool extends BaseObserver<DBAdapterListener> implements ConnectionPool {
  private readonly options: NodeSQLOpenOptions;
  public readonly name: string;

  private writeConnection: Semaphore<RemoteConnection>;
  private readConnections: Semaphore<RemoteConnection>;

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
      const isCommonJsModule = isBundledToCommonJs;
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

      const database = (await comlink.open({
        path: dbFilePath,
        isWriter,
        implementation: this.options.implementation ?? defaultDatabaseImplementation
      })) as Remote<AsyncDatabase>;
      if (isWriter) {
        await database.execute("SELECT powersync_update_hooks('install');", []);
      }

      const connection = new RemoteConnection(worker, comlink, database);
      if (this.options.initializeConnection) {
        await this.options.initializeConnection(connection, isWriter);
      }
      if (!isWriter) {
        await connection.execute('pragma query_only = true');
      } else {
        // We only need to enable this on the writer connection.
        // We can get `database is locked` errors if we enable this on concurrently opening read connections.
        await connection.execute('pragma journal_mode = WAL');
      }

      return connection;
    };

    // Open the writer first to avoid multiple threads enabling WAL concurrently (causing "database is locked" errors).
    this.writeConnection = new Semaphore([await openWorker(true)]);
    const createWorkers: Promise<RemoteConnection>[] = [];
    const amountOfReaders = this.options.readWorkerCount ?? READ_CONNECTIONS;
    for (let i = 0; i < amountOfReaders; i++) {
      createWorkers.push(openWorker(false));
    }
    this.readConnections = new Semaphore(await Promise.all(createWorkers));
  }

  async close() {
    const { item: writeConnection, release: returnWrite } = await this.writeConnection.requestOne();
    const { items: readers, release: returnReaders } = await this.readConnections.requestAll();

    try {
      await writeConnection.close();
      await Promise.all(readers.map((r) => r.close()));
    } finally {
      returnWrite();
      returnReaders();
    }
  }

  async readLock<T>(fn: (tx: RemoteConnection) => Promise<T>, options?: DBLockOptions | undefined): Promise<T> {
    const lease = await this.readConnections.requestOne(timeoutSignal(options?.timeoutMs));
    try {
      return await fn(lease.item);
    } finally {
      lease.release();
    }
  }

  async writeLock<T>(fn: (tx: RemoteConnection) => Promise<T>, options?: DBLockOptions | undefined): Promise<T> {
    const { item, release } = await this.writeConnection.requestOne(timeoutSignal(options?.timeoutMs));

    try {
      try {
        return await fn(item);
      } finally {
        const serializedUpdates = await item.executeRaw("SELECT powersync_update_hooks('get');", []);
        const updates = JSON.parse(serializedUpdates[0][0] as string) as string[];

        if (updates.length > 0) {
          const event: BatchedUpdateNotification = {
            tables: updates,
            groupedUpdates: {},
            rawUpdates: []
          };
          this.iterateListeners((cb) => cb.tablesUpdated?.(event));
        }
      }
    } finally {
      release();
    }
  }

  async refreshSchema() {
    await this.writeLock((l) => l.refreshSchema());

    const { items, release } = await this.readConnections.requestAll();
    try {
      await Promise.all(items.map((c) => c.refreshSchema()));
    } finally {
      release();
    }
  }
}

export class WorkerPoolDatabaseAdapter extends DBAdapterDefaultMixin(WorkerConnectionPool) {}
