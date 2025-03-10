import { Mutex } from 'async-mutex';
import { EventIterator } from 'event-iterator';
import Logger, { ILogger } from 'js-logger';
import {
  BatchedUpdateNotification,
  DBAdapter,
  QueryResult,
  Transaction,
  UpdateNotification,
  isBatchedUpdateNotification
} from '../db/DBAdapter.js';
import { SyncPriorityStatus, SyncStatus } from '../db/crud/SyncStatus.js';
import { UploadQueueStats } from '../db/crud/UploadQueueStatus.js';
import { Schema } from '../db/schema/Schema.js';
import { BaseObserver } from '../utils/BaseObserver.js';
import { ControlledExecutor } from '../utils/ControlledExecutor.js';
import { mutexRunExclusive } from '../utils/mutex.js';
import { throttleTrailing } from '../utils/throttle.js';
import { SQLOpenFactory, SQLOpenOptions, isDBAdapter, isSQLOpenFactory, isSQLOpenOptions } from './SQLOpenFactory.js';
import { PowerSyncBackendConnector } from './connection/PowerSyncBackendConnector.js';
import { runOnSchemaChange } from './runOnSchemaChange.js';
import { BucketStorageAdapter, PSInternalTable } from './sync/bucket/BucketStorageAdapter.js';
import { CrudBatch } from './sync/bucket/CrudBatch.js';
import { CrudEntry, CrudEntryJSON } from './sync/bucket/CrudEntry.js';
import { CrudTransaction } from './sync/bucket/CrudTransaction.js';
import {
  DEFAULT_CRUD_UPLOAD_THROTTLE_MS,
  DEFAULT_RETRY_DELAY_MS,
  StreamingSyncImplementation,
  StreamingSyncImplementationListener,
  type AdditionalConnectionOptions,
  type PowerSyncConnectionOptions,
  type RequiredAdditionalConnectionOptions
} from './sync/stream/AbstractStreamingSyncImplementation.js';

export interface DisconnectAndClearOptions {
  /** When set to false, data in local-only tables is preserved. */
  clearLocal?: boolean;
}

export interface BasePowerSyncDatabaseOptions extends AdditionalConnectionOptions {
  /** Schema used for the local database. */
  schema: Schema;
  /**
   * @deprecated Use {@link retryDelayMs} instead as this will be removed in future releases.
   */
  retryDelay?: number;
  logger?: ILogger;
}

export interface PowerSyncDatabaseOptions extends BasePowerSyncDatabaseOptions {
  /**
   * Source for a SQLite database connection.
   * This can be either:
   *  - A {@link DBAdapter} if providing an instantiated SQLite connection
   *  - A {@link SQLOpenFactory} which will be used to open a SQLite connection
   *  - {@link SQLOpenOptions} for opening a SQLite connection with a default {@link SQLOpenFactory}
   */
  database: DBAdapter | SQLOpenFactory | SQLOpenOptions;
}

export interface PowerSyncDatabaseOptionsWithDBAdapter extends BasePowerSyncDatabaseOptions {
  database: DBAdapter;
}
export interface PowerSyncDatabaseOptionsWithOpenFactory extends BasePowerSyncDatabaseOptions {
  database: SQLOpenFactory;
}
export interface PowerSyncDatabaseOptionsWithSettings extends BasePowerSyncDatabaseOptions {
  database: SQLOpenOptions;
}

export interface SQLWatchOptions {
  signal?: AbortSignal;
  tables?: string[];
  /** The minimum interval between queries. */
  throttleMs?: number;
  /**
   * @deprecated All tables specified in {@link tables} will be watched, including PowerSync tables with prefixes.
   *
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
  onChange: (event: WatchOnChangeEvent) => Promise<void> | void;
  onError?: (error: Error) => void;
}

export interface PowerSyncDBListener extends StreamingSyncImplementationListener {
  initialized: () => void;
  schemaChanged: (schema: Schema) => void;
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
  retryDelayMs: 5000,
  logger: Logger.get('PowerSyncDatabase'),
  crudUploadThrottleMs: DEFAULT_CRUD_UPLOAD_THROTTLE_MS
};

export const DEFAULT_CRUD_BATCH_LIMIT = 100;

/**
 * Requesting nested or recursive locks can block the application in some circumstances.
 * This default lock timeout will act as a failsafe to throw an error if a lock cannot
 * be obtained.
 */
export const DEFAULT_LOCK_TIMEOUT_MS = 120_000; // 2 mins

/**
 * Tests if the input is a {@link PowerSyncDatabaseOptionsWithSettings}
 * @internal
 */
export const isPowerSyncDatabaseOptionsWithSettings = (test: any): test is PowerSyncDatabaseOptionsWithSettings => {
  return typeof test == 'object' && isSQLOpenOptions(test.database);
};

/**
 * The priority used by the core extension to indicate that a full sync was completed.
 */
const FULL_SYNC_PRIORITY = 2147483647;

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

  protected _schema: Schema;

  private _database: DBAdapter;

  constructor(options: PowerSyncDatabaseOptionsWithDBAdapter);
  constructor(options: PowerSyncDatabaseOptionsWithOpenFactory);
  constructor(options: PowerSyncDatabaseOptionsWithSettings);
  constructor(options: PowerSyncDatabaseOptions); // Note this is important for extending this class and maintaining API compatibility
  constructor(protected options: PowerSyncDatabaseOptions) {
    super();

    const { database, schema } = options;

    if (typeof schema?.toJSON != 'function') {
      throw new Error('The `schema` option should be provided and should be an instance of `Schema`.');
    }

    if (isDBAdapter(database)) {
      this._database = database;
    } else if (isSQLOpenFactory(database)) {
      this._database = database.openDB();
    } else if (isPowerSyncDatabaseOptionsWithSettings(options)) {
      this._database = this.openDBAdapter(options);
    } else {
      throw new Error('The provided `database` option is invalid.');
    }

    this.bucketStorageAdapter = this.generateBucketStorageAdapter();
    this.closed = false;
    this.currentStatus = new SyncStatus({});
    this.options = { ...DEFAULT_POWERSYNC_DB_OPTIONS, ...options };
    this._schema = schema;
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
    return this._database;
  }

  /**
   * Whether a connection to the PowerSync service is currently open.
   */
  get connected() {
    return this.currentStatus?.connected || false;
  }

  get connecting() {
    return this.currentStatus?.connecting || false;
  }

  /**
   * Opens the DBAdapter given open options using a default open factory
   */
  protected abstract openDBAdapter(options: PowerSyncDatabaseOptionsWithSettings): DBAdapter;

  protected abstract generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector,
    options: RequiredAdditionalConnectionOptions
  ): StreamingSyncImplementation;

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
   * Wait for the first sync operation to complete.
   *
   * @argument request Either an abort signal (after which the promise will complete regardless of
   * whether a full sync was completed) or an object providing an abort signal and a priority target.
   * When a priority target is set, the promise may complete when all buckets with the given (or higher)
   * priorities have been synchronized. This can be earlier than a complete sync.
   * @returns A promise which will resolve once the first full sync has completed.
   */
  async waitForFirstSync(request?: AbortSignal | { signal?: AbortSignal; priority?: number }): Promise<void> {
    const signal = request instanceof AbortSignal ? request : request?.signal;
    const priority = request && 'priority' in request ? request.priority : undefined;

    const statusMatches =
      priority === undefined
        ? (status: SyncStatus) => status.hasSynced
        : (status: SyncStatus) => status.statusForPriority(priority).hasSynced;

    if (statusMatches(this.currentStatus)) {
      return;
    }
    return new Promise((resolve) => {
      const dispose = this.registerListener({
        statusChanged: (status) => {
          if (statusMatches(status)) {
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
    await this._loadVersion();
    await this.updateSchema(this.options.schema);
    await this.updateHasSynced();
    await this.database.execute('PRAGMA RECURSIVE_TRIGGERS=TRUE');
    this.ready = true;
    this.iterateListeners((cb) => cb.initialized?.());
  }

  private async _loadVersion() {
    try {
      const { version } = await this.database.get<{ version: string }>('SELECT powersync_rs_version() as version');
      this.sdkVersion = version;
    } catch (e) {
      throw new Error(`The powersync extension is not loaded correctly. Details: ${e.message}`);
    }
    let versionInts: number[];
    try {
      versionInts = this.sdkVersion!.split(/[.\/]/)
        .slice(0, 3)
        .map((n) => parseInt(n));
    } catch (e) {
      throw new Error(
        `Unsupported powersync extension version. Need >=0.3.11 <1.0.0, got: ${this.sdkVersion}. Details: ${e.message}`
      );
    }

    // Validate >=0.3.11 <1.0.0
    if (versionInts[0] != 0 || versionInts[1] < 3 || (versionInts[1] == 3 && versionInts[2] < 11)) {
      throw new Error(`Unsupported powersync extension version. Need >=0.3.11 <1.0.0, got: ${this.sdkVersion}`);
    }
  }

  protected async updateHasSynced() {
    const result = await this.database.getAll<{ priority: number; last_synced_at: string }>(
      'SELECT priority, last_synced_at FROM ps_sync_state ORDER BY priority DESC'
    );
    let lastCompleteSync: Date | undefined;
    const priorityStatusEntries: SyncPriorityStatus[] = [];

    for (const { priority, last_synced_at } of result) {
      const parsedDate = new Date(last_synced_at + 'Z');

      if (priority == FULL_SYNC_PRIORITY) {
        // This lowest-possible priority represents a complete sync.
        lastCompleteSync = parsedDate;
      } else {
        priorityStatusEntries.push({ priority, hasSynced: true, lastSyncedAt: parsedDate });
      }
    }

    const hasSynced = lastCompleteSync != null;
    const updatedStatus = new SyncStatus({
      ...this.currentStatus.toJSON(),
      hasSynced,
      priorityStatusEntries,
      lastSyncedAt: lastCompleteSync
    });

    if (!updatedStatus.isEqual(this.currentStatus)) {
      this.currentStatus = updatedStatus;
      this.iterateListeners((l) => l.statusChanged?.(this.currentStatus));
    }
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
    await this.database.refreshSchema();
    this.iterateListeners(async (cb) => cb.schemaChanged?.(schema));
  }

  /**
   * Wait for initialization to complete.
   * While initializing is automatic, this helps to catch and report initialization errors.
   */
  async init() {
    return this.waitForReady();
  }

  // Use the options passed in during connect, or fallback to the options set during database creation or fallback to the default options
  resolvedConnectionOptions(options?: PowerSyncConnectionOptions): RequiredAdditionalConnectionOptions {
    return {
      retryDelayMs:
        options?.retryDelayMs ?? this.options.retryDelayMs ?? this.options.retryDelay ?? DEFAULT_RETRY_DELAY_MS,
      crudUploadThrottleMs:
        options?.crudUploadThrottleMs ?? this.options.crudUploadThrottleMs ?? DEFAULT_CRUD_UPLOAD_THROTTLE_MS
    };
  }

  /**
   * Connects to stream of events from the PowerSync instance.
   */
  async connect(connector: PowerSyncBackendConnector, options?: PowerSyncConnectionOptions) {
    await this.waitForReady();

    // close connection if one is open
    await this.disconnect();
    if (this.closed) {
      throw new Error('Cannot connect using a closed client');
    }

    const { retryDelayMs, crudUploadThrottleMs } = this.resolvedConnectionOptions(options);

    this.syncStreamImplementation = this.generateSyncStreamImplementation(connector, {
      retryDelayMs,
      crudUploadThrottleMs
    });
    this.syncStatusListenerDisposer = this.syncStreamImplementation.registerListener({
      statusChanged: (status) => {
        this.currentStatus = new SyncStatus({
          ...status.toJSON(),
          hasSynced: this.currentStatus?.hasSynced || !!status.lastSyncedAt
        });
        this.iterateListeners((cb) => cb.statusChanged?.(this.currentStatus));
      }
    });

    await this.syncStreamImplementation.waitForReady();
    this.syncStreamImplementation.triggerCrudUpload();
    await this.syncStreamImplementation.connect(options);
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
      await tx.execute('SELECT powersync_clear(?)', [clearLocal ? 1 : 0]);
    });

    // The data has been deleted - reset the sync status
    this.currentStatus = new SyncStatus({});
    this.iterateListeners((l) => l.statusChanged?.(this.currentStatus));
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

    if (this.closed) {
      return;
    }

    const { disconnect } = options;
    if (disconnect) {
      await this.disconnect();
    }

    await this.syncStreamImplementation?.dispose();
    await this.database.close();
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
  async getCrudBatch(limit: number = DEFAULT_CRUD_BATCH_LIMIT): Promise<CrudBatch | null> {
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

  /**
   * Get an unique client id for this database.
   *
   * The id is not reset when the database is cleared, only when the database is deleted.
   */
  async getClientId(): Promise<string> {
    return this.bucketStorageAdapter.getClientId();
  }

  private async handleCrudCheckpoint(lastClientId: number, writeCheckpoint?: string) {
    return this.writeTransaction(async (tx) => {
      await tx.execute(`DELETE FROM ${PSInternalTable.CRUD} WHERE id <= ?`, [lastClientId]);
      if (writeCheckpoint) {
        const check = await tx.execute(`SELECT 1 FROM ${PSInternalTable.CRUD} LIMIT 1`);
        if (!check.rows?.length) {
          await tx.execute(`UPDATE ${PSInternalTable.BUCKETS} SET target_op = CAST(? as INTEGER) WHERE name='$local'`, [
            writeCheckpoint
          ]);
        }
      } else {
        await tx.execute(`UPDATE ${PSInternalTable.BUCKETS} SET target_op = CAST(? as INTEGER) WHERE name='$local'`, [
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

    const watchQuery = async (abortSignal: AbortSignal) => {
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
            tables: resolvedTables,
            // Override the abort signal since we intercept it
            signal: abortSignal
          }
        );
      } catch (error) {
        onError?.(error);
      }
    };

    runOnSchemaChange(watchQuery, this, options);
  }

  /**
   * Execute a read query every time the source tables are modified.
   * Use {@link SQLWatchOptions.throttleMs} to specify the minimum interval between queries.
   * Source tables are automatically detected using `EXPLAIN QUERY PLAN`.
   */
  watchWithAsyncGenerator(sql: string, parameters?: any[], options?: SQLWatchOptions): AsyncIterable<QueryResult> {
    return new EventIterator<QueryResult>((eventOptions) => {
      const handler: WatchHandler = {
        onResult: (result) => {
          eventOptions.push(result);
        },
        onError: (error) => {
          eventOptions.fail(error);
        }
      };

      this.watchWithCallback(sql, parameters, handler, options);

      options?.signal?.addEventListener('abort', () => {
        eventOptions.stop();
      });
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
    const watchedTables = new Set<string>(
      (resolvedOptions?.tables ?? []).flatMap((table) => [table, `ps_data__${table}`, `ps_data_local__${table}`])
    );

    const changedTables = new Set<string>();
    const throttleMs = resolvedOptions.throttleMs ?? DEFAULT_WATCH_THROTTLE_MS;

    const executor = new ControlledExecutor(async (e: WatchOnChangeEvent) => {
      await onChange(e);
    });

    const flushTableUpdates = throttleTrailing(
      () =>
        this.handleTableChanges(changedTables, watchedTables, (intersection) => {
          if (resolvedOptions?.signal?.aborted) return;
          executor.schedule({ changedTables: intersection });
        }),
      throttleMs
    );

    const dispose = this.database.registerListener({
      tablesUpdated: async (update) => {
        try {
          this.processTableUpdates(update, changedTables);
          flushTableUpdates();
        } catch (error) {
          onError?.(error);
        }
      }
    });

    resolvedOptions.signal?.addEventListener('abort', () => {
      executor.dispose();
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
    changedTables: Set<string>
  ): void {
    const tables = isBatchedUpdateNotification(updateNotification)
      ? updateNotification.tables
      : [updateNotification.table];

    for (const table of tables) {
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
