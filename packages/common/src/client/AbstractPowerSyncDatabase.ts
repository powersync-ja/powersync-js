import { Mutex } from 'async-mutex';
import { EventIterator } from 'event-iterator';
import Logger, { ILogger } from 'js-logger';
import {
  BatchedUpdateNotification,
  DBAdapter,
  QueryResult,
  Transaction,
  UpdateNotification,
  convertToBatchedUpdateNotification,
  convertToUpdateNotifications,
  isBatchedUpdateNotification
} from '../db/DBAdapter.js';
import { FULL_SYNC_PRIORITY } from '../db/crud/SyncProgress.js';
import { SyncPriorityStatus, SyncStatus } from '../db/crud/SyncStatus.js';
import { UploadQueueStats } from '../db/crud/UploadQueueStatus.js';
import { Schema } from '../db/schema/Schema.js';
import { BaseObserver } from '../utils/BaseObserver.js';
import { DisposeManager } from '../utils/DisposeManager.js';
import { mutexRunExclusive } from '../utils/mutex.js';
import { ConnectionManager } from './ConnectionManager.js';
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
  changedTables: string[]; // kept for backwards compatibility
  update: BatchedUpdateNotification;
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

  sdkVersion: string;

  protected bucketStorageAdapter: BucketStorageAdapter;
  protected _isReadyPromise: Promise<void>;
  protected connectionManager: ConnectionManager;

  get syncStreamImplementation() {
    return this.connectionManager.syncStreamImplementation;
  }

  protected _schema: Schema;

  private _database: DBAdapter;

  protected runExclusiveMutex: Mutex;

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
    this.runExclusiveMutex = new Mutex();
    // Start async init
    this.connectionManager = new ConnectionManager({
      createSyncImplementation: async (connector, options) => {
        await this.waitForReady();

        return this.runExclusive(async () => {
          const sync = this.generateSyncStreamImplementation(connector, this.resolvedConnectionOptions(options));
          const onDispose = sync.registerListener({
            statusChanged: (status) => {
              this.currentStatus = new SyncStatus({
                ...status.toJSON(),
                hasSynced: this.currentStatus?.hasSynced || !!status.lastSyncedAt
              });
              this.iterateListeners((cb) => cb.statusChanged?.(this.currentStatus));
            }
          });
          await sync.waitForReady();

          return {
            sync,
            onDispose
          };
        });
      },
      logger: this.logger
    });
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
   * @param request Either an abort signal (after which the promise will complete regardless of
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

  get logger() {
    return this.options.logger!;
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
      ...options,
      retryDelayMs:
        options?.retryDelayMs ?? this.options.retryDelayMs ?? this.options.retryDelay ?? DEFAULT_RETRY_DELAY_MS,
      crudUploadThrottleMs:
        options?.crudUploadThrottleMs ?? this.options.crudUploadThrottleMs ?? DEFAULT_CRUD_UPLOAD_THROTTLE_MS
    };
  }

  /**
   * Locking mechanism for exclusively running critical portions of connect/disconnect operations.
   * Locking here is mostly only important on web for multiple tab scenarios.
   */
  protected runExclusive<T>(callback: () => Promise<T>): Promise<T> {
    return this.runExclusiveMutex.runExclusive(callback);
  }

  /**
   * Connects to stream of events from the PowerSync instance.
   */
  async connect(connector: PowerSyncBackendConnector, options?: PowerSyncConnectionOptions) {
    return this.connectionManager.connect(connector, options);
  }

  /**
   * Close the sync connection.
   *
   * Use {@link connect} to connect again.
   */
  async disconnect() {
    return this.connectionManager.disconnect();
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

    await this.connectionManager.close();
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
   * Get a batch of CRUD data to upload.
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
   *
   * @param limit Maximum number of CRUD entries to include in the batch
   * @returns A batch of CRUD operations to upload, or null if there are none
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
   *
   * @returns A transaction of CRUD operations to upload, or null if there are none
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
   *
   * @returns A unique identifier for the database instance
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
   * Execute a SQL write (INSERT/UPDATE/DELETE) query
   * and optionally return results.
   *
   * @param sql The SQL query to execute
   * @param parameters Optional array of parameters to bind to the query
   * @returns The query result as an object with structured key-value pairs
   */
  async execute(sql: string, parameters?: any[]) {
    await this.waitForReady();
    return this.database.execute(sql, parameters);
  }

  /**
   * Execute a SQL write (INSERT/UPDATE/DELETE) query directly on the database without any PowerSync processing.
   * This bypasses certain PowerSync abstractions and is useful for accessing the raw database results.
   *
   * @param sql The SQL query to execute
   * @param parameters Optional array of parameters to bind to the query
   * @returns The raw query result from the underlying database as a nested array of raw values, where each row is
   * represented as an array of column values without field names.
   */
  async executeRaw(sql: string, parameters?: any[]) {
    await this.waitForReady();
    return this.database.executeRaw(sql, parameters);
  }

  /**
   * Execute a write query (INSERT/UPDATE/DELETE) multiple times with each parameter set
   * and optionally return results.
   * This is faster than executing separately with each parameter set.
   *
   * @param sql The SQL query to execute
   * @param parameters Optional 2D array of parameter sets, where each inner array is a set of parameters for one execution
   * @returns The query result
   */
  async executeBatch(sql: string, parameters?: any[][]) {
    await this.waitForReady();
    return this.database.executeBatch(sql, parameters);
  }

  /**
   *  Execute a read-only query and return results.
   *
   * @param sql The SQL query to execute
   * @param parameters Optional array of parameters to bind to the query
   * @returns An array of results
   */
  async getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
    await this.waitForReady();
    return this.database.getAll(sql, parameters);
  }

  /**
   * Execute a read-only query and return the first result, or null if the ResultSet is empty.
   *
   * @param sql The SQL query to execute
   * @param parameters Optional array of parameters to bind to the query
   * @returns The first result if found, or null if no results are returned
   */
  async getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
    await this.waitForReady();
    return this.database.getOptional(sql, parameters);
  }

  /**
   * Execute a read-only query and return the first result, error if the ResultSet is empty.
   *
   * @param sql The SQL query to execute
   * @param parameters Optional array of parameters to bind to the query
   * @returns The first result matching the query
   * @throws Error if no rows are returned
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
   *
   * @param callback Function to execute within the transaction
   * @param lockTimeout Time in milliseconds to wait for a lock before throwing an error
   * @returns The result of the callback
   * @throws Error if the lock cannot be obtained within the timeout period
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
   *
   * @param callback Function to execute within the transaction
   * @param lockTimeout Time in milliseconds to wait for a lock before throwing an error
   * @returns The result of the callback
   * @throws Error if the lock cannot be obtained within the timeout period
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
   *
   * @param sql The SQL query to execute
   * @param parameters Optional array of parameters to bind to the query
   * @param handler Callbacks for handling results and errors
   * @param options Options for configuring watch behavior
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
   *
   * @param sql The SQL query to execute
   * @param parameters Optional array of parameters to bind to the query
   * @param options Options for configuring watch behavior
   * @returns An AsyncIterable that yields QueryResults whenever the data changes
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

  /**
   * Resolves the list of tables that are used in a SQL query.
   * If tables are specified in the options, those are used directly.
   * Otherwise, analyzes the query using EXPLAIN to determine which tables are accessed.
   *
   * @param sql The SQL query to analyze
   * @param parameters Optional parameters for the SQL query
   * @param options Optional watch options that may contain explicit table list
   * @returns Array of table names that the query depends on
   */
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
   * @param handler Callbacks for handling change events and errors
   * @param options Options for configuring watch behavior
   * @returns A dispose function to stop watching for changes
   */
  onChangeWithCallback(handler?: WatchOnChangeHandler, options?: SQLWatchOptions): () => void {
    const { onChange, onError = (error: Error) => this.options.logger?.error(error) } = handler ?? {};
    if (!onChange) {
      throw new Error('onChange is required');
    }

    const resolvedOptions = options ?? {};
    const watchedTables = new Set<string>(
      (resolvedOptions?.tables ?? []).flatMap((table) => [table, `ps_data__${table}`, `ps_data_local__${table}`])
    );
    const updatedTables = new Array<UpdateNotification>();
    const throttleMs = resolvedOptions.throttleMs ?? DEFAULT_WATCH_THROTTLE_MS;

    const disposeManager = new DisposeManager();

    const dispose = () => disposeManager.dispose();

    if (resolvedOptions.signal?.aborted || this.closed) {
      return dispose;
    }

    // Periodically flush the accumulated updates from the db listener.
    let isFlushing = false;
    const flushIntervalId = setInterval(async () => {
      // Skip if we're already flushing.
      // Will retry in the next interval.
      if (isFlushing) {
        return;
      }
      try {
        // Prevent concurrent flushes.
        isFlushing = true;
        await flushTableUpdates();
      } catch (error) {
        onError?.(error);
      } finally {
        // Allow future flush attempts.
        isFlushing = false;
      }
    }, throttleMs);

    const flushTableUpdates = async () => {
      // Get snapshot of the updated tables to avoid race conditions
      // between async operations here and the listener that adds updates.
      const updatesToFlush = [...updatedTables];
      // Reset the queue to begin collecting new updates by the listener.
      updatedTables.length = 0;
      // Skip if we're already disposed.
      if (disposeManager.isDisposed()) {
        return;
      }
      // Dispose then skip if we're closed.
      if (this.closed) {
        disposeManager.dispose();
        return;
      }
      // Broadcast the updates.
      const update = convertToBatchedUpdateNotification(updatesToFlush);
      if (update.tables.length > 0) {
        await onChange({ changedTables: update.tables, update });
      }
    };

    const disposeListener = this.database.registerListener({
      tablesUpdated: (update) => {
        try {
          if (isBatchedUpdateNotification(update)) {
            const rawUpdates = convertToUpdateNotifications(update);
            for (const rawUpdate of rawUpdates) {
              if (watchedTables.has(rawUpdate.table)) {
                updatedTables.push(rawUpdate);
              }
            }
          } else {
            if (watchedTables.has(update.table)) {
              updatedTables.push(update);
            }
          }
        } catch (error) {
          onError?.(error);
        }
      }
    });

    disposeManager.add(() => disposeListener());
    disposeManager.add(() => clearInterval(flushIntervalId));

    if (resolvedOptions.signal) {
      disposeManager.disposeOnAbort(resolvedOptions.signal);
    }

    return dispose;
  }

  /**
   * Create a Stream of changes to any of the specified tables.
   *
   * This is preferred over {@link watchWithAsyncGenerator} when multiple queries need to be performed
   * together when data is changed.
   *
   * Note: do not declare this as `async *onChange` as it will not work in React Native.
   *
   * @param options Options for configuring watch behavior
   * @returns An AsyncIterable that yields change events whenever the specified tables change
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

  /**
   * @ignore
   */
  private async executeReadOnly(sql: string, params?: any[]) {
    await this.waitForReady();
    return this.database.readLock((tx) => tx.execute(sql, params));
  }
}
