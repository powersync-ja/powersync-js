import * as path from 'node:path';
import * as OS from 'node:os';
import * as url from 'node:url';
import { Worker } from 'node:worker_threads';
import * as Comlink from 'comlink';

import BetterSQLite3Database from 'better-sqlite3';

import {
  BaseObserver,
  BatchedUpdateNotification,
  DBAdapter,
  DBAdapterListener,
  LockContext,
  Transaction,
  DBLockOptions,
  QueryResult,
  SQLOpenOptions,
} from '@powersync/common';
import { releaseProxy, Remote } from 'comlink';
import { AsyncDatabase, BetterSqliteWorker, ProxiedQueryResult } from './AsyncBetterSqlite.js';
import { AsyncResource } from 'node:async_hooks';

export type BetterSQLite3LockContext = LockContext & {
  executeBatch(query: string, params?: any[][]): Promise<QueryResult>;
};

export type BetterSQLite3Transaction = Transaction & BetterSQLite3LockContext;

const READ_CONNECTIONS = 5;

/**
 * Adapter for better-sqlite3
 */
export class BetterSQLite3DBAdapter extends BaseObserver<DBAdapterListener> implements DBAdapter {
  private readonly options: SQLOpenOptions;
  public readonly name: string;

  private readConnections: RemoteConnection[];
  private writeConnection: RemoteConnection;
  
  private readonly readQueue: Array<(connection: RemoteConnection) => void> = [];
  private readonly writeQueue: Array<() => void> = [];

  private readonly uncommittedUpdatedTables = new Set<string>();
  private readonly committedUpdatedTables = new Set<string>();

  constructor(options: SQLOpenOptions) {
    super();

    this.options = options;
    this.name = options.dbFilename;

    /*
    baseDB.updateHook((_op, _dbName, tableName, _rowid) => {
      this.uncommittedUpdatedTables.add(tableName);
    });
    baseDB.commitHook(() => {
      for (const tableName of this.uncommittedUpdatedTables) {
        this.committedUpdatedTables.add(tableName);
      }
      this.uncommittedUpdatedTables.clear();
      return true;
    });
    baseDB.rollbackHook(() => {
      this.uncommittedUpdatedTables.clear();
    });
    */
  }

  async initialize() {
    let dbFilePath = this.options.dbFilename;
    if (this.options.dbLocation !== undefined) {
      dbFilePath = path.join(this.options.dbLocation, dbFilePath);
    }

    const openWorker = async (isWriter: boolean) => {
      const worker = new Worker(new URL('./AsyncBetterSqlite.js', import.meta.url));
      const listeners = new WeakMap<EventListenerOrEventListenerObject, (e: any) => void>();

      const comlink = Comlink.wrap<BetterSqliteWorker>({
        postMessage: worker.postMessage.bind(worker),
        addEventListener: (type, listener) => {
          let resolved: (event: any) => void = 'handleEvent' in listener ? listener.handleEvent.bind(listener) : listener;

          // Comlink wants message events, but the message event on workers in Node returns the data only.
          if (type === 'message') {
            const original = resolved;

            resolved = (data) => {
              original({data});
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
        },
      });

      worker.once('error', (e) => {
        console.error('Unexpected PowerSync database worker error', e);
      });

      const database = await comlink.open(dbFilePath, isWriter) as Remote<AsyncDatabase>;
      return new RemoteConnection(worker, comlink, database);
    };

    const createWorkers = [openWorker(true)];
    for (let i = 0; i < READ_CONNECTIONS; i++) {
      createWorkers.push(openWorker(false));
    }

    const [writer, ...readers] = await Promise.all(createWorkers);
    this.writeConnection = writer;
    this.readConnections = readers;
  }

  async close() {
    this.writeConnection.close();
    for (const connection of this.readConnections) {
      connection.close();
    }
  }

  readLock<T>(
    fn: (tx: BetterSQLite3LockContext) => Promise<T>,
    _options?: DBLockOptions | undefined,
  ): Promise<T> {
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

  writeLock<T>(
    fn: (tx: BetterSQLite3LockContext) => Promise<T>,
    _options?: DBLockOptions | undefined,
  ): Promise<T> {
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
          if (this.committedUpdatedTables.size > 0) {
            const event: BatchedUpdateNotification = {
              tables: [...this.committedUpdatedTables],
              groupedUpdates: {},
              rawUpdates: [],
            };
            this.committedUpdatedTables.clear();
            this.iterateListeners((cb) => cb.tablesUpdated?.(event));
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
    _options?: DBLockOptions | undefined,
  ): Promise<T> {
    return this.readLock((ctx) => this.internalTransaction(ctx as RemoteConnection, fn));
  }

  writeTransaction<T>(
    fn: (tx: BetterSQLite3Transaction) => Promise<T>,
    _options?: DBLockOptions | undefined,
  ): Promise<T> {
    return this.writeLock((ctx) => this.internalTransaction(ctx as RemoteConnection, fn));
  }

  private async internalTransaction<T>(
    connection: RemoteConnection,
    fn: (tx: BetterSQLite3Transaction) => Promise<T>,
  ): Promise<T> {
    let finalized = false;
    const commit = async (): Promise<QueryResult> => {
      if (!finalized) {
        finalized = true;
        connection.execute("COMMIT");
      }
      return { rowsAffected: 0 };
    };
    const rollback = async (): Promise<QueryResult> => {
      if (!finalized) {
        finalized = true;
        connection.execute('ROLLBACK');
      }
      return { rowsAffected: 0 };
    };
    try {
      connection.execute('BEGIN');
      const result = await fn({
        execute: (query, params) => connection.execute(query, params),
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
      await rollback();
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

class RemoteConnection implements BetterSQLite3LockContext {
  isBusy = false

  private readonly worker: Worker;
  private readonly comlink: Remote<BetterSqliteWorker>;
  private readonly database: Remote<AsyncDatabase>;

  constructor(worker: Worker, comlink: Remote<BetterSqliteWorker>, database: Remote<AsyncDatabase>) {
    this.worker = worker;
    this.comlink = comlink;
    this.database = database;
  }

  async executeBatch(query: string, params: any[][] = []): Promise<QueryResult> {
    const result = await this.database.executeBatch(query, params ?? []);
    return RemoteConnection.wrapQueryResult(result);
  }

  async execute(query: string, params?: any[] | undefined): Promise<QueryResult> {
    const result = await this.database.execute(query, params ?? []);
    return RemoteConnection.wrapQueryResult(result);
  }

  async getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
    const res = await this.execute(sql, parameters);
    return res.rows?._array ?? [];
  }

  async getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
    const res = await this.execute(sql, parameters);
    return res.rows?.item(0) ?? null;
  }

  async get<T>(sql: string, parameters?: any[]): Promise<T> {
    const res = await this.execute(sql, parameters);
    const first = res.rows?.item(0);
    if (!first) {
      throw new Error('Result set is empty');
    }
    return first;
  }

  async refreshSchema() {
    await this.execute("pragma table_info('sqlite_master')");
  }

  async close() {
    await this.database.close();
    this.database[releaseProxy]();
    this.comlink[releaseProxy]();
    await this.worker.terminate();
  }

  static wrapQueryResult(result: ProxiedQueryResult): QueryResult {
    let rows: QueryResult['rows'] | undefined = undefined;
    if (result.rows) {
      rows = {
        ...result.rows,
        item: (idx) => result.rows?._array[idx],
      } satisfies QueryResult['rows'];
    }

    return {
      ...result,
      rows,
    };
  }
}
