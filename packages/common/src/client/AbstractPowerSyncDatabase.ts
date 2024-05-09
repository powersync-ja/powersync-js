import { Mutex } from 'async-mutex';
import { EventIterator } from 'event-iterator';
import Logger, { ILogger } from 'js-logger';
import throttle from 'lodash/throttle';
import {
  BatchedUpdateNotification,
  DBAdapter,
  QueryResult,
  Transaction,
  UpdateNotification,
  isBatchedUpdateNotification
} from '../db/DBAdapter';
import { SyncStatus } from '../db/crud/SyncStatus';
import { UploadQueueStats } from '../db/crud/UploadQueueStatus';
import { Schema } from '../db/schema/Schema';
import { BaseObserver } from '../utils/BaseObserver';
import { mutexRunExclusive } from '../utils/mutex';
import { quoteIdentifier } from '../utils/strings';
import { PowerSyncBackendConnector } from './connection/PowerSyncBackendConnector';
import { BucketStorageAdapter, PSInternalTable } from './sync/bucket/BucketStorageAdapter';
import { CrudBatch } from './sync/bucket/CrudBatch';
import { CrudEntry, CrudEntryJSON } from './sync/bucket/CrudEntry';
import { CrudTransaction } from './sync/bucket/CrudTransaction';
import {
  AbstractStreamingSyncImplementation,
  DEFAULT_CRUD_UPLOAD_THROTTLE_MS,
  StreamingSyncImplementationListener,
  StreamingSyncImplementation
} from './sync/stream/AbstractStreamingSyncImplementation';

export interface DisconnectAndClearOptions {
  /** When set to false, data in local-only tables is preserved. */
  clearLocal?: boolean;
}

export interface PowerSyncDatabaseOptions {
  /** Schema used for the local database. */
  schema: Schema;
  database: DBAdapter;
  /**
   * Delay for retrying sync streaming operations
   * from the PowerSync backend after an error occurs.
   */
  retryDelay?: number;
  /**
   * Backend Connector CRUD operations are throttled
   * to occur at most every `crudUploadThrottleMs`
   * milliseconds.
   */
  crudUploadThrottleMs?: number;
  logger?: ILogger;
}

export interface SQLWatchOptions {
  signal?: AbortSignal;
  tables?: string[];
  /** The minimum interval between queries. */
  throttleMs?: number;
  /**
   * Allows for watching any SQL table
   * by not removing PowerSync table name prefixes
   */
  rawTableNames?: boolean;
}

export interface WatchOnChangeEvent {
  changedTables: string[];
}

export interface WatchHandler {
  onResult: (results: QueryResult) => void;
  onError?: (error: Error) => void;
}

export interface WatchOnChangeHandler {
  onChange: (event: WatchOnChangeEvent) => void;
  onError?: (error: Error) => void;
}

export interface PowerSyncDBListener extends StreamingSyncImplementationListener {
  initialized: () => void;
}

export interface PowerSyncCloseOptions {
  /**
   * Disconnect the sync stream client if connected.
   * This is usually true, but can be false for Web when using
   * multiple tabs and a shared sync provider.
   */
  disconnect?: boolean;
}

const POWERSYNC_TABLE_MATCH = /(^ps_data__|^ps_data_local__)/;

const DEFAULT_DISCONNECT_CLEAR_OPTIONS: DisconnectAndClearOptions = {
  clearLocal: true
};

export const DEFAULT_POWERSYNC_CLOSE_OPTIONS: PowerSyncCloseOptions = {
  disconnect: true
};

export const DEFAULT_WATCH_THROTTLE_MS = 30;

export const DEFAULT_POWERSYNC_DB_OPTIONS = {
  retryDelay: 5000,
  logger: Logger.get('PowerSyncDatabase'),
  crudUploadThrottleMs: DEFAULT_CRUD_UPLOAD_THROTTLE_MS
};

/**
 * Requesting nested or recursive locks can block the application in some circumstances.
 * This default lock timeout will act as a failsafe to throw an error if a lock cannot
 * be obtained.
 */
export const DEFAULT_LOCK_TIMEOUT_MS = 120_000; // 2 mins

export abstract class AbstractPowerSyncDatabase extends BaseObserver<PowerSyncDBListener> {
  /**
   * Transactions should be queued in the DBAdapter, but we also want to prevent
   * calls to `.execute` while an async transaction is running.
   */
  protected static transactionMutex: Mutex = new Mutex();

  /**
   * Returns true if the connection is closed.
   */
  closed: boolean;
  ready: boolean;

  /**
   * Current connection status.
   */
  currentStatus: SyncStatus;

  syncStreamImplementation?: StreamingSyncImplementation;
  sdkVersion: string;

  protected bucketStorageAdapter: BucketStorageAdapter;
  private syncStatusListenerDisposer?: () => void;
  protected _isReadyPromise: Promise<void>;

  private hasSyncedWatchDisposer?: () => void;

  protected _schema: Schema;

  constructor(protected options: PowerSyncDatabaseOptions) {
    super();
    this.bucketStorageAdapter = this.generateBucketStorageAdapter();
    this.closed = false;
    this.currentStatus = new SyncStatus({});
    this.options = { ...DEFAULT_POWERSYNC_DB_OPTIONS, ...options };
    this._schema = options.schema;
    this.ready = false;
    this.sdkVersion = '';
    // Start async init
    this._isReadyPromise = this.initialize();
  }

  /**
   * Schema used for the local database.
   */
  get schema() {
    return this._schema;
  }

  /**
   * The underlying database.
   *
   * For the most part, behavior is the same whether querying on the underlying database, or on {@link AbstractPowerSyncDatabase}.
   */
  get database() {
    return this.options.database;
  }

  /**
   * Whether a connection to the PowerSync service is currently open.
   */
  get connected() {
    return this.currentStatus?.connected || false;
  }

  protected abstract generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector
  ): AbstractStreamingSyncImplementation;

  protected abstract generateBucketStorageAdapter(): BucketStorageAdapter;

  /**
   * @returns A promise which will resolve once initialization is completed.
   */
  async waitForReady(): Promise<void> {
    if (this.ready) {
      return;
    }

    await this._isReadyPromise;
  }

  /**
   * @returns A promise which will resolve once the first full sync has completed.
   */
  async waitForFirstSync(signal?: AbortSignal): Promise<void> {
    if (this.currentStatus.hasSynced) {
      return;
    }
    return new Promise((resolve) => {
      const dispose = this.registerListener({
        statusChanged: (status) => {
          if (status.hasSynced) {
            dispose();
            resolve();
          }
        }
      });

      signal?.addEventListener('abort', () => {
        dispose();
        resolve();
      });
    });
  }

  /**
   * Allows for extended implementations to execute custom initialization
   * logic as part of the total init process
   */
  abstract _initialize(): Promise<void>;

  /**
   * Entry point for executing initialization logic.
   * This is to be automatically executed in the constructor.
   */
  protected async initialize() {
    await this._initialize();
    await this.bucketStorageAdapter.init();
    const version = await this.options.database.execute('SELECT powersync_rs_version()');
    this.sdkVersion = version.rows?.item(0)['powersync_rs_version()'] ?? '';
    await this.updateSchema(this.options.schema);
    this.updateHasSynced();
    await this.database.execute('PRAGMA RECURSIVE_TRIGGERS=TRUE');
    this.ready = true;
    this.iterateListeners((cb) => cb.initialized?.());
  }

  protected async updateHasSynced() {
    const syncedSQL = 'SELECT 1 FROM ps_buckets WHERE last_applied_op > 0 LIMIT 1';

    const abortController = new AbortController();
    this.hasSyncedWatchDisposer = () => abortController.abort();

    // Abort the watch after the first sync is detected
    this.watch(
      syncedSQL,
      [],
      {
        onResult: () => {
          const hasSynced = !!this.currentStatus.lastSyncedAt;

          if (hasSynced != this.currentStatus.hasSynced) {
            this.currentStatus = new SyncStatus({ ...this.currentStatus.toJSON(), hasSynced });
            this.iterateListeners((l) => l.statusChanged?.(this.currentStatus));
          }

          if (hasSynced) {
            abortController.abort();
          }
        },
        onError: (ex) => {
          this.options.logger?.warn('Failure while watching synced state', ex);
          abortController.abort();
        }
      },
      {
        rawTableNames: true,
        signal: abortController.signal
      }
    );
  }

  /**
   * Replace the schema with a new version. This is for advanced use cases - typically the schema should just be specified once in the constructor.
   *
   * Cannot be used while connected - this should only be called before {@link AbstractPowerSyncDatabase.connect}.
   */
  async updateSchema(schema: Schema) {
    if (this.syncStreamImplementation) {
      throw new Error('Cannot update schema while connected');
    }

    /**
     * TODO
     * Validations only show a warning for now.
     * The next major release should throw an exception.
     */
    try {
      schema.validate();
    } catch (ex) {
      this.options.logger?.warn('Schema validation failed. Unexpected behaviour could occur', ex);
    }
    this._schema = schema;
    await this.database.execute('SELECT powersync_replace_schema(?)', [JSON.stringify(this.schema.toJSON())]);
  }

  /**
   * Wait for initialization to complete.
   * While initializing is automatic, this helps to catch and report initialization errors.
   */
  async init() {
    return this.waitForReady();
  }

  /**
   * Connects to stream of events from the PowerSync instance.
   */
  async connect(connector: PowerSyncBackendConnector) {
    await this.waitForReady();

    // close connection if one is open
    await this.disconnect();
    if (this.closed) {
      throw new Error('Cannot connect using a closed client');
    }

    this.syncStreamImplementation = this.generateSyncStreamImplementation(connector);
    this.syncStatusListenerDisposer = this.syncStreamImplementation.registerListener({
      statusChanged: (status) => {
        this.currentStatus = new SyncStatus({ ...status.toJSON(), hasSynced: this.currentStatus?.hasSynced });
        this.iterateListeners((cb) => cb.statusChanged?.(this.currentStatus));
      }
    });

    await this.syncStreamImplementation.waitForReady();
    this.syncStreamImplementation.triggerCrudUpload();
    await this.syncStreamImplementation.connect();
  }

  /**
   * Close the sync connection.
   *
   * Use {@link connect} to connect again.
   */
  async disconnect() {
    await this.waitForReady();
    await this.syncStreamImplementation?.disconnect();
    this.syncStatusListenerDisposer?.();
    await this.syncStreamImplementation?.dispose();
    this.syncStreamImplementation = undefined;
  }

  /**
   *  Disconnect and clear the database.
   *  Use this when logging out.
   *  The database can still be queried after this is called, but the tables
   *  would be empty.
   *
   * To preserve data in local-only tables, set clearLocal to false.
   */
  async disconnectAndClear(options = DEFAULT_DISCONNECT_CLEAR_OPTIONS) {
    await this.disconnect();
    await this.waitForReady();

    const { clearLocal } = options;

    // TODO DB name, verify this is necessary with extension
    await this.database.writeTransaction(async (tx) => {
      await tx.execute(`DELETE FROM ${PSInternalTable.OPLOG}`);
      await tx.execute(`DELETE FROM ${PSInternalTable.CRUD}`);
      await tx.execute(`DELETE FROM ${PSInternalTable.BUCKETS}`);
      await tx.execute(`DELETE FROM ${PSInternalTable.UNTYPED}`);

      const tableGlob = clearLocal ? 'ps_data_*' : 'ps_data__*';

      const existingTableRows = await tx.execute(
        `
      SELECT name FROM sqlite_master WHERE type='table' AND name GLOB ?
      `,
        [tableGlob]
      );

      if (!existingTableRows.rows?.length) {
        return;
      }
      for (const row of existingTableRows.rows._array) {
        await tx.execute(`DELETE FROM ${quoteIdentifier(row.name)} WHERE 1`);
      }
    });
  }

  /**
   * Close the database, releasing resources.
   *
   * Also disconnects any active connection.
   *
   * Once close is called, this connection cannot be used again - a new one
   * must be constructed.
   */
  async close(options: PowerSyncCloseOptions = DEFAULT_POWERSYNC_CLOSE_OPTIONS) {
    await this.waitForReady();
    this.hasSyncedWatchDisposer?.();

    const { disconnect } = options;
    if (disconnect) {
      await this.disconnect();
    }

    await this.syncStreamImplementation?.dispose();
    this.database.close();
    this.closed = true;
  }

  /**
   * Get upload queue size estimate and count.
   */
  async getUploadQueueStats(includeSize?: boolean): Promise<UploadQueueStats> {
    return this.readTransaction(async (tx) => {
      if (includeSize) {
        const result = await tx.execute(
          `SELECT SUM(cast(data as blob) + 20) as size, count(*) as count FROM ${PSInternalTable.CRUD}`
        );

        const row = result.rows!.item(0);
        return new UploadQueueStats(row?.count ?? 0, row?.size ?? 0);
      } else {
        const result = await tx.execute(`SELECT count(*) as count FROM ${PSInternalTable.CRUD}`);
        const row = result.rows!.item(0);
        return new UploadQueueStats(row?.count ?? 0);
      }
    });
  }

  /**
   * Get a batch of crud data to upload.
   *
   * Returns null if there is no data to upload.
   *
   * Use this from the {@link PowerSyncBackendConnector.uploadData} callback.
   *
   * Once the data have been successfully uploaded, call {@link CrudBatch.complete} before
   * requesting the next batch.
   *
   * Use {@link limit} to specify the maximum number of updates to return in a single
   * batch.
   *
   * This method does include transaction ids in the result, but does not group
   * data by transaction. One batch may contain data from multiple transactions,
   * and a single transaction may be split over multiple batches.
   */
  async getCrudBatch(limit: number): Promise<CrudBatch | null> {
    const result = await this.getAll<CrudEntryJSON>(
      `SELECT id, tx_id, data FROM ${PSInternalTable.CRUD} ORDER BY id ASC LIMIT ?`,
      [limit + 1]
    );

    const all: CrudEntry[] = result.map((row) => CrudEntry.fromRow(row)) ?? [];

    let haveMore = false;
    if (all.length > limit) {
      all.pop();
      haveMore = true;
    }
    if (all.length == 0) {
      return null;
    }

    const last = all[all.length - 1];
    return new CrudBatch(all, haveMore, async (writeCheckpoint?: string) =>
      this.handleCrudCheckpoint(last.clientId, writeCheckpoint)
    );
  }

  /**
   * Get the next recorded transaction to upload.
   *
   * Returns null if there is no data to upload.
   *
   * Use this from the {@link PowerSyncBackendConnector.uploadData} callback.
   *
   * Once the data have been successfully uploaded, call {@link CrudTransaction.complete} before
   * requesting the next transaction.
   *
   * Unlike {@link getCrudBatch}, this only returns data from a single transaction at a time.
   * All data for the transaction is loaded into memory.
   */
  async getNextCrudTransaction(): Promise<CrudTransaction | null> {
    return await this.readTransaction(async (tx) => {
      const first = await tx.getOptional<CrudEntryJSON>(
        `SELECT id, tx_id, data FROM ${PSInternalTable.CRUD} ORDER BY id ASC LIMIT 1`
      );

      if (!first) {
        return null;
      }
      const txId = first.tx_id;

      let all: CrudEntry[];
      if (!txId) {
        all = [CrudEntry.fromRow(first)];
      } else {
        const result = await tx.getAll<CrudEntryJSON>(
          `SELECT id, tx_id, data FROM ${PSInternalTable.CRUD} WHERE tx_id = ? ORDER BY id ASC`,
          [txId]
        );
        all = result.map((row) => CrudEntry.fromRow(row));
      }

      const last = all[all.length - 1];

      return new CrudTransaction(
        all,
        async (writeCheckpoint?: string) => this.handleCrudCheckpoint(last.clientId, writeCheckpoint),
        txId
      );
    });
  }

  private async handleCrudCheckpoint(lastClientId: number, writeCheckpoint?: string) {
    return this.writeTransaction(async (tx) => {
      await tx.execute(`DELETE FROM ${PSInternalTable.CRUD} WHERE id <= ?`, [lastClientId]);
      if (writeCheckpoint) {
        const check = await tx.execute(`SELECT 1 FROM ${PSInternalTable.CRUD} LIMIT 1`);
        if (!check.rows?.length) {
          await tx.execute(`UPDATE ${PSInternalTable.BUCKETS} SET target_op = ? WHERE name='$local'`, [
            writeCheckpoint
          ]);
        }
      } else {
        await tx.execute(`UPDATE ${PSInternalTable.BUCKETS} SET target_op = ? WHERE name='$local'`, [
          this.bucketStorageAdapter.getMaxOpId()
        ]);
      }
    });
  }

  /**
   * Execute a write (INSERT/UPDATE/DELETE) query
   * and optionally return results.
   */
  async execute(sql: string, parameters?: any[]) {
    await this.waitForReady();
    return this.database.execute(sql, parameters);
  }

  /**
   * Execute a write query (INSERT/UPDATE/DELETE) multiple times with each parameter set
   * and optionally return results.
   * This is faster than executing separately with each parameter set.
   */
  async executeBatch(sql: string, parameters?: any[][]) {
    await this.waitForReady();
    return this.database.executeBatch(sql, parameters);
  }

  /**
   *  Execute a read-only query and return results.
   */
  async getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
    await this.waitForReady();
    return this.database.getAll(sql, parameters);
  }

  /**
   * Execute a read-only query and return the first result, or null if the ResultSet is empty.
   */
  async getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
    await this.waitForReady();
    return this.database.getOptional(sql, parameters);
  }

  /**
   * Execute a read-only query and return the first result, error if the ResultSet is empty.
   */
  async get<T>(sql: string, parameters?: any[]): Promise<T> {
    await this.waitForReady();
    return this.database.get(sql, parameters);
  }

  /**
   * Takes a read lock, without starting a transaction.
   * In most cases, {@link readTransaction} should be used instead.
   */
  async readLock<T>(callback: (db: DBAdapter) => Promise<T>) {
    await this.waitForReady();
    return mutexRunExclusive(AbstractPowerSyncDatabase.transactionMutex, () => callback(this.database));
  }

  /**
   * Takes a global lock, without starting a transaction.
   * In most cases, {@link writeTransaction} should be used instead.
   */
  async writeLock<T>(callback: (db: DBAdapter) => Promise<T>) {
    await this.waitForReady();
    return mutexRunExclusive(AbstractPowerSyncDatabase.transactionMutex, async () => {
      const res = await callback(this.database);
      return res;
    });
  }

  /**
   * Open a read-only transaction.
   * Read transactions can run concurrently to a write transaction.
   * Changes from any write transaction are not visible to read transactions started before it.
   */
  async readTransaction<T>(
    callback: (tx: Transaction) => Promise<T>,
    lockTimeout: number = DEFAULT_LOCK_TIMEOUT_MS
  ): Promise<T> {
    await this.waitForReady();
    return this.database.readTransaction(
      async (tx) => {
        const res = await callback({ ...tx });
        await tx.rollback();
        return res;
      },
      { timeoutMs: lockTimeout }
    );
  }

  /**
   * Open a read-write transaction.
   * This takes a global lock - only one write transaction can execute against the database at a time.
   * Statements within the transaction must be done on the provided {@link Transaction} interface.
   */
  async writeTransaction<T>(
    callback: (tx: Transaction) => Promise<T>,
    lockTimeout: number = DEFAULT_LOCK_TIMEOUT_MS
  ): Promise<T> {
    await this.waitForReady();
    return this.database.writeTransaction(
      async (tx) => {
        const res = await callback(tx);
        await tx.commit();
        return res;
      },
      { timeoutMs: lockTimeout }
    );
  }

  /**
   * This version of `watch` uses {@link AsyncGenerator}, for documentation see {@link watchWithAsyncGenerator}.
   * Can be overloaded to use a callback handler instead, for documentation see {@link watchWithCallback}.
   *
   * @example
   * ```javascript
   * async *attachmentIds() {
   *   for await (const result of this.powersync.watch(
   *     `SELECT photo_id as id FROM todos WHERE photo_id IS NOT NULL`,
   *     []
   *   )) {
   *     yield result.rows?._array.map((r) => r.id) ?? [];
   *   }
   * }
   * ```
   */
  watch(sql: string, parameters?: any[], options?: SQLWatchOptions): AsyncIterable<QueryResult>;
  /**
   * See {@link watchWithCallback}.
   *
   * @example
   * ```javascript
   * onAttachmentIdsChange(onResult) {
   *   this.powersync.watch(
   *     `SELECT photo_id as id FROM todos WHERE photo_id IS NOT NULL`,
   *     [],
   *     {
   *       onResult: (result) => onResult(result.rows?._array.map((r) => r.id) ?? [])
   *     }
   *   );
   * }
   * ```
   */
  watch(sql: string, parameters?: any[], handler?: WatchHandler, options?: SQLWatchOptions): void;

  watch(
    sql: string,
    parameters?: any[],
    handlerOrOptions?: WatchHandler | SQLWatchOptions,
    maybeOptions?: SQLWatchOptions
  ): void | AsyncIterable<QueryResult> {
    if (handlerOrOptions && typeof handlerOrOptions === 'object' && 'onResult' in handlerOrOptions) {
      const handler = handlerOrOptions as WatchHandler;
      const options = maybeOptions;

      return this.watchWithCallback(sql, parameters, handler, options);
    }

    const options = handlerOrOptions as SQLWatchOptions | undefined;
    return this.watchWithAsyncGenerator(sql, parameters, options);
  }

  /**
   * Execute a read query every time the source tables are modified.
   * Use {@link SQLWatchOptions.throttleMs} to specify the minimum interval between queries.
   * Source tables are automatically detected using `EXPLAIN QUERY PLAN`.
   *
   * Note that the `onChange` callback member of the handler is required.
   */
  watchWithCallback(sql: string, parameters?: any[], handler?: WatchHandler, options?: SQLWatchOptions): void {
    const { onResult, onError = (e: Error) => this.options.logger?.error(e) } = handler ?? {};
    if (!onResult) {
      throw new Error('onResult is required');
    }

    (async () => {
      try {
        const resolvedTables = await this.resolveTables(sql, parameters, options);

        // Fetch initial data
        const result = await this.executeReadOnly(sql, parameters);
        onResult(result);

        this.onChangeWithCallback(
          {
            onChange: async () => {
              try {
                const result = await this.executeReadOnly(sql, parameters);
                onResult(result);
              } catch (error) {
                onError?.(error);
              }
            },
            onError
          },
          {
            ...(options ?? {}),
            tables: resolvedTables
          }
        );
      } catch (error) {
        onError?.(error);
      }
    })();
  }

  /**
   * Execute a read query every time the source tables are modified.
   * Use {@link SQLWatchOptions.throttleMs} to specify the minimum interval between queries.
   * Source tables are automatically detected using `EXPLAIN QUERY PLAN`.
   */
  watchWithAsyncGenerator(sql: string, parameters?: any[], options?: SQLWatchOptions): AsyncIterable<QueryResult> {
    return new EventIterator<QueryResult>((eventOptions) => {
      (async () => {
        const resolvedTables = await this.resolveTables(sql, parameters, options);

        // Fetch initial data
        eventOptions.push(await this.executeReadOnly(sql, parameters));

        for await (const event of this.onChangeWithAsyncGenerator({
          ...(options ?? {}),
          tables: resolvedTables
        })) {
          eventOptions.push(await this.executeReadOnly(sql, parameters));
        }
      })();
    });
  }

  async resolveTables(sql: string, parameters?: any[], options?: SQLWatchOptions): Promise<string[]> {
    const resolvedTables = options?.tables ? [...options.tables] : [];
    if (!options?.tables) {
      const explained = await this.getAll<{ opcode: string; p3: number; p2: number }>(`EXPLAIN ${sql}`, parameters);
      const rootPages = explained
        .filter((row) => row.opcode == 'OpenRead' && row.p3 == 0 && typeof row.p2 == 'number')
        .map((row) => row.p2);
      const tables = await this.getAll<{ tbl_name: string }>(
        `SELECT DISTINCT tbl_name FROM sqlite_master WHERE rootpage IN (SELECT json_each.value FROM json_each(?))`,
        [JSON.stringify(rootPages)]
      );
      for (const table of tables) {
        resolvedTables.push(table.tbl_name.replace(POWERSYNC_TABLE_MATCH, ''));
      }
    }

    return resolvedTables;
  }

  /**
   * This version of `onChange` uses {@link AsyncGenerator}, for documentation see {@link onChangeWithAsyncGenerator}.
   * Can be overloaded to use a callback handler instead, for documentation see {@link onChangeWithCallback}.
   *
   * @example
   * ```javascript
   * async monitorChanges() {
   *   for await (const event of this.powersync.onChange({tables: ['todos']})) {
   *     console.log('Detected change event:', event);
   *   }
   * }
   * ```
   */
  onChange(options?: SQLWatchOptions): AsyncIterable<WatchOnChangeEvent>;
  /**
   * See {@link onChangeWithCallback}.
   *
   * @example
   * ```javascript
   * monitorChanges() {
   *   this.powersync.onChange({
   *     onChange: (event) => {
   *       console.log('Change detected:', event);
   *     }
   *   }, { tables: ['todos'] });
   * }
   * ```
   */
  onChange(handler?: WatchOnChangeHandler, options?: SQLWatchOptions): () => void;

  onChange(
    handlerOrOptions?: WatchOnChangeHandler | SQLWatchOptions,
    maybeOptions?: SQLWatchOptions
  ): (() => void) | AsyncIterable<WatchOnChangeEvent> {
    if (handlerOrOptions && typeof handlerOrOptions === 'object' && 'onChange' in handlerOrOptions) {
      const handler = handlerOrOptions as WatchOnChangeHandler;
      const options = maybeOptions;

      return this.onChangeWithCallback(handler, options);
    }

    const options = handlerOrOptions as SQLWatchOptions | undefined;
    return this.onChangeWithAsyncGenerator(options);
  }

  /**
   * Invoke the provided callback on any changes to any of the specified tables.
   *
   * This is preferred over {@link watchWithCallback} when multiple queries need to be performed
   * together when data is changed.
   *
   * Note that the `onChange` callback member of the handler is required.
   *
   * Returns dispose function to stop watching.
   */
  onChangeWithCallback(handler?: WatchOnChangeHandler, options?: SQLWatchOptions): () => void {
    const { onChange, onError = (e: Error) => this.options.logger?.error(e) } = handler ?? {};
    if (!onChange) {
      throw new Error('onChange is required');
    }

    const resolvedOptions = options ?? {};
    const watchedTables = new Set(resolvedOptions.tables ?? []);

    const changedTables = new Set<string>();
    const throttleMs = resolvedOptions.throttleMs ?? DEFAULT_WATCH_THROTTLE_MS;

    const flushTableUpdates = throttle(
      () =>
        this.handleTableChanges(changedTables, watchedTables, (intersection) => {
          if (resolvedOptions?.signal?.aborted) return;

          onChange({ changedTables: intersection });
        }),
      throttleMs,
      { leading: false, trailing: true }
    );

    const dispose = this.database.registerListener({
      tablesUpdated: async (update) => {
        try {
          const { rawTableNames } = resolvedOptions;
          this.processTableUpdates(update, rawTableNames, changedTables);
          flushTableUpdates();
        } catch (error) {
          onError?.(error);
        }
      }
    });

    resolvedOptions.signal?.addEventListener('abort', () => {
      dispose();
    });

    return () => dispose();
  }

  /**
   * Create a Stream of changes to any of the specified tables.
   *
   * This is preferred over {@link watchWithAsyncGenerator} when multiple queries need to be performed
   * together when data is changed.
   *
   * Note, do not declare this as `async *onChange` as it will not work in React Native
   */
  onChangeWithAsyncGenerator(options?: SQLWatchOptions): AsyncIterable<WatchOnChangeEvent> {
    const resolvedOptions = options ?? {};

    return new EventIterator<WatchOnChangeEvent>((eventOptions) => {
      const dispose = this.onChangeWithCallback(
        {
          onChange: (event): void => {
            eventOptions.push(event);
          },
          onError: (error) => {
            eventOptions.fail(error);
          }
        },
        options
      );

      resolvedOptions.signal?.addEventListener('abort', () => {
        eventOptions.stop();
        // Maybe fail?
      });

      return () => dispose();
    });
  }

  private handleTableChanges(
    changedTables: Set<string>,
    watchedTables: Set<string>,
    onDetectedChanges: (changedTables: string[]) => void
  ): void {
    if (changedTables.size > 0) {
      const intersection = Array.from(changedTables.values()).filter((change) => watchedTables.has(change));
      if (intersection.length) {
        onDetectedChanges(intersection);
      }
    }
    changedTables.clear();
  }

  private processTableUpdates(
    updateNotification: BatchedUpdateNotification | UpdateNotification,
    rawTableNames: boolean | undefined,
    changedTables: Set<string>
  ): void {
    const tables = isBatchedUpdateNotification(updateNotification)
      ? updateNotification.tables
      : [updateNotification.table];

    const filteredTables = rawTableNames ? tables : tables.filter((t) => !!t.match(POWERSYNC_TABLE_MATCH));
    if (!filteredTables.length) {
      return;
    }

    // Remove any PowerSync table prefixes if necessary
    const mappedTableNames = rawTableNames
      ? filteredTables
      : filteredTables.map((t) => t.replace(POWERSYNC_TABLE_MATCH, ''));

    for (const table of mappedTableNames) {
      changedTables.add(table);
    }
  }

  /**
   * @ignore
   */
  private async executeReadOnly(sql: string, params?: any[]) {
    await this.waitForReady();
    return this.database.readLock((tx) => tx.execute(sql, params));
  }
}
