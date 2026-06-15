import { DBAdapter, LockContext, QueryResult, Transaction } from '../db/DBAdapter.js';
import { SyncStatus } from '../db/crud/SyncStatus.js';
import { Schema } from '../db/schema/Schema.js';
import { BaseListener, BaseObserverInterface } from '../utils/BaseObserver.js';
import { WatchedQueryComparator } from './watched/processors/comparators.js';
import { PowerSyncLogger } from '../utils/Logger.js';
import { DatabaseSource } from './SQLOpenFactory.js';
import { TriggerManager } from './triggers/TriggerManager.js';
import { PowerSyncBackendConnector } from './connection/PowerSyncBackendConnector.js';
import { SyncOptions } from './sync/options.js';
import { SyncStream } from './sync/sync-streams.js';
import { UploadQueueStats } from '../db/crud/UploadQueueStatus.js';
import { CrudBatch } from './sync/bucket/CrudBatch.js';
import { CrudTransaction } from './sync/bucket/CrudTransaction.js';
import { ArrayQueryDefinition, Query } from './Query.js';
import { WatchCompatibleQuery } from './watched/WatchedQuery.js';
import { Mutex } from '../utils/mutex.js';

/**
 * @public
 */
export interface DisconnectAndClearOptions {
  /** When set to false, data in local-only tables is preserved. */
  clearLocal?: boolean;
}

/**
 * Options required regardless of how a PowerSync database is opened.
 *
 * @public
 */
export interface BasePowerSyncDatabaseOptions {
  /** Schema used for the local database. */
  schema: Schema;
  logger?: PowerSyncLogger;
}

/**
 * @public
 */
export type PowerSyncDatabaseOptions = BasePowerSyncDatabaseOptions & DatabaseSource;

/**
 * @public
 */
export interface SQLOnChangeOptions {
  signal?: AbortSignal;
  tables?: string[];
  /** The minimum interval between queries. */
  throttleMs?: number;
  /**
   * @deprecated All tables specified in {@link SQLOnChangeOptions.tables} will be watched, including PowerSync tables
   * with prefixes.
   *
   * Allows for watching any SQL table
   * by not removing PowerSync table name prefixes
   */
  rawTableNames?: boolean;
  /**
   * Emits an empty result set immediately
   */
  triggerImmediate?: boolean;
}

/**
 * @public
 */
export interface SQLWatchOptions extends SQLOnChangeOptions {
  /**
   * Optional comparator which will be used to compare the results of the query.
   * The watched query will only yield results if the comparator returns false.
   */
  comparator?: WatchedQueryComparator<QueryResult>;
}

/**
 * @public
 */
export interface WatchOnChangeEvent {
  changedTables: string[];
}

/**
 * @public
 */
export interface WatchHandler {
  onResult: (results: QueryResult) => void;
  onError?: (error: Error) => void;
}

/**
 * @public
 */
export interface WatchOnChangeHandler {
  onChange: (event: WatchOnChangeEvent) => Promise<void> | void;
  onError?: (error: Error) => void;
}

/**
 * @public
 */
export interface PowerSyncDBListener extends BaseListener {
  initialized: () => void;
  schemaChanged: (schema: Schema) => void;
  statusChanged?: ((status: SyncStatus) => void) | undefined;
  closing: () => Promise<void> | void;
  closed: () => Promise<void> | void;
}

/**
 * @public
 */
export interface PowerSyncCloseOptions {
  /**
   * Disconnect the sync stream client if connected.
   * This is usually true, but can be false for Web when using
   * multiple tabs and a shared sync provider.
   */
  disconnect?: boolean;
}

/**
 * @public
 */
export interface PowerSyncDatabaseConstructor<Options> {
  new (options: Options): CommonPowerSyncDatabase;
}

/**
 * @deprecated Use {@link CommonPowerSyncDatabase} instead.
 */
export type AbstractPowerSyncDatabase = CommonPowerSyncDatabase;

/**
 * @public
 */
export interface CommonPowerSyncDatabase extends BaseObserverInterface<PowerSyncDBListener> {
  /**
   * Returns true if the connection is closed.
   */
  readonly closed: boolean;
  readonly ready: boolean;

  /**
   * Current connection status.
   */
  readonly currentStatus: SyncStatus;

  readonly sdkVersion: string;

  /**
   * @experimental
   * Allows creating SQLite triggers which can be used to track various operations on SQLite tables.
   */
  readonly triggers: TriggerManager;

  readonly logger: PowerSyncLogger;

  /**
   * Schema used for the local database.
   */
  readonly schema: Schema;

  /**
   * The underlying database.
   *
   * For the most part, behavior is the same whether querying on the underlying database, or on {@link CommonPowerSyncDatabase}.
   */
  get database(): DBAdapter;

  /**
   * Whether a connection to the PowerSync service is currently open.
   */
  get connected(): boolean;

  get connecting(): boolean;

  /**
   * @returns A promise which will resolve once initialization is completed.
   */
  waitForReady(): Promise<void>;

  /**
   * Wait for the first sync operation to complete.
   *
   * @param request - Either an abort signal (after which the promise will complete regardless of
   * whether a full sync was completed) or an object providing an abort signal and a priority target.
   * When a priority target is set, the promise may complete when all buckets with the given (or higher)
   * priorities have been synchronized. This can be earlier than a complete sync.
   * @returns A promise which will resolve once the first full sync has completed.
   */
  waitForFirstSync(request?: AbortSignal | { signal?: AbortSignal; priority?: number }): Promise<void>;

  /**
   * Waits for the first sync status for which the `status` callback returns a truthy value.
   */
  waitForStatus(predicate: (status: SyncStatus) => any, signal?: AbortSignal): Promise<void>;

  /**
   * Replace the schema with a new version. This is for advanced use cases - typically the schema should just be specified once in the constructor.
   *
   * Cannot be used while connected - this should only be called before {@link CommonPowerSyncDatabase.connect}.
   */
  updateSchema(schema: Schema): Promise<void>;

  /**
   * Wait for initialization to complete.
   * While initializing is automatic, this helps to catch and report initialization errors.
   */
  init(): Promise<void>;

  /**
   * Connects to stream of events from the PowerSync instance.
   */
  connect(connector: PowerSyncBackendConnector, options?: SyncOptions): Promise<void>;

  /**
   * Close the sync connection.
   *
   * Use {@link CommonPowerSyncDatabase.connect} to connect again.
   */
  disconnect(): Promise<void>;

  /**
   *  Disconnect and clear the database.
   *  Use this when logging out.
   *  The database can still be queried after this is called, but the tables
   *  would be empty.
   *
   * To preserve data in local-only tables, set clearLocal to false.
   */
  disconnectAndClear(options?: DisconnectAndClearOptions): Promise<void>;

  /**
   * Create a sync stream to query its status or to subscribe to it.
   *
   * @param name - The name of the stream to subscribe to.
   * @param params - Optional parameters for the stream subscription.
   * @returns A {@link SyncStream} instance that can be subscribed to.
   */
  syncStream(name: string, params?: Record<string, any>): SyncStream;

  /**
   * Close the database, releasing resources.
   *
   * Also disconnects any active connection.
   *
   * Once close is called, this connection cannot be used again - a new one
   * must be constructed.
   */
  close(options?: PowerSyncCloseOptions): Promise<void>;

  /**
   * Get upload queue size estimate and count.
   */
  getUploadQueueStats(includeSize?: boolean): Promise<UploadQueueStats>;

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
   * Use the `limit` parameter to specify the maximum number of updates to return in a single
   * batch.
   *
   * This method does include transaction ids in the result, but does not group
   * data by transaction. One batch may contain data from multiple transactions,
   * and a single transaction may be split over multiple batches.
   *
   * @param limit - Maximum number of CRUD entries to include in the batch
   * @returns A batch of CRUD operations to upload, or null if there are none
   */
  getCrudBatch(limit?: number): Promise<CrudBatch | null>;

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
   * Unlike {@link AbstractPowerSyncDatabase.getCrudBatch}, this only returns data from a single transaction at a time.
   * All data for the transaction is loaded into memory.
   *
   * @returns A transaction of CRUD operations to upload, or null if there are none
   */
  getNextCrudTransaction(): Promise<CrudTransaction | null>;

  /**
   * Returns an async iterator of completed transactions with local writes against the database.
   *
   * This is typically used from the {@link PowerSyncBackendConnector.uploadData} callback. Each entry emitted by the
   * returned iterator is a full transaction containing all local writes made while that transaction was active.
   *
   * Unlike {@link AbstractPowerSyncDatabase.getNextCrudTransaction}, which always returns the oldest transaction that hasn't been
   * {@link CrudTransaction.complete}d yet, this iterator can be used to receive multiple transactions. Calling
   * {@link CrudTransaction.complete} will mark that and all prior transactions emitted by the iterator as completed.
   *
   * This can be used to upload multiple transactions in a single batch, e.g with:
   *
   * ```JavaScript
   * let lastTransaction = null;
   * let batch = [];
   *
   * for await (const transaction of database.getCrudTransactions()) {
   *   batch.push(...transaction.crud);
   *   lastTransaction = transaction;
   *
   *   if (batch.length > 10) {
   *     break;
   *    }
   * }
   * ```
   *
   * If there is no local data to upload, the async iterator complete without emitting any items.
   *
   * Note that iterating over async iterables requires a [polyfill](https://github.com/powersync-ja/powersync-js/tree/main/packages/react-native#babel-plugins-watched-queries)
   * for React Native.
   */
  getCrudTransactions(): AsyncIterable<CrudTransaction, null>;

  /**
   * Get an unique client id for this database.
   *
   * The id is not reset when the database is cleared, only when the database is deleted.
   *
   * @returns A unique identifier for the database instance
   */
  getClientId(): Promise<string>;

  /**
   * Execute a SQL write (INSERT/UPDATE/DELETE) query
   * and optionally return results.
   *
   * When using the default client-side [JSON-based view system](https://docs.powersync.com/architecture/client-architecture#client-side-schema-and-sqlite-database-structure),
   * the returned result's `rowsAffected` may be `0` for successful `UPDATE` and `DELETE` statements.
   * Use a `RETURNING` clause and inspect `result.rows` when you need to confirm which rows changed.
   *
   * @param sql - The SQL query to execute
   * @param parameters - Optional array of parameters to bind to the query
   * @returns The query result as an object with structured key-value pairs
   */
  execute(sql: string, parameters?: any[]): Promise<QueryResult>;

  /**
   * Execute a SQL write (INSERT/UPDATE/DELETE) query directly on the database without any PowerSync processing.
   * This bypasses certain PowerSync abstractions and is useful for accessing the raw database results.
   *
   * @param sql - The SQL query to execute
   * @param parameters - Optional array of parameters to bind to the query
   * @returns The raw query result from the underlying database as a nested array of raw values, where each row is
   * represented as an array of column values without field names.
   */
  executeRaw(sql: string, parameters?: any[]): Promise<any[][]>;

  /**
   * Execute a write query (INSERT/UPDATE/DELETE) multiple times with each parameter set
   * and optionally return results.
   * This is faster than executing separately with each parameter set.
   *
   * @param sql - The SQL query to execute
   * @param parameters - Optional 2D array of parameter sets, where each inner array is a set of parameters for one execution
   * @returns The query result
   */
  executeBatch(sql: string, parameters?: any[][]): Promise<QueryResult>;

  /**
   *  Execute a read-only query and return results.
   *
   * @param sql - The SQL query to execute
   * @param parameters - Optional array of parameters to bind to the query
   * @returns An array of results
   */
  getAll<T>(sql: string, parameters?: any[]): Promise<T[]>;

  /**
   * Execute a read-only query and return the first result, or null if the ResultSet is empty.
   *
   * @param sql - The SQL query to execute
   * @param parameters - Optional array of parameters to bind to the query
   * @returns The first result if found, or null if no results are returned
   */
  getOptional<T>(sql: string, parameters?: any[]): Promise<T | null>;

  /**
   * Execute a read-only query and return the first result, error if the ResultSet is empty.
   *
   * @param sql - The SQL query to execute
   * @param parameters - Optional array of parameters to bind to the query
   * @returns The first result matching the query
   * @throws Error if no rows are returned
   */
  get<T>(sql: string, parameters?: any[]): Promise<T>;

  /**
   * Takes a read lock, without starting a transaction.
   * In most cases, {@link CommonPowerSyncDatabase.readTransaction} should be used instead.
   */
  readLock<T>(callback: (db: LockContext) => Promise<T>): Promise<T>;

  /**
   * Takes a global lock, without starting a transaction.
   * In most cases, {@link CommonPowerSyncDatabase.writeTransaction} should be used instead.
   */
  writeLock<T>(callback: (db: LockContext) => Promise<T>): Promise<T>;

  /**
   * Open a read-only transaction.
   * Read transactions can run concurrently to a write transaction.
   * Changes from any write transaction are not visible to read transactions started before it.
   *
   * @param callback - Function to execute within the transaction
   * @param lockTimeout - Time in milliseconds to wait for a lock before throwing an error
   * @returns The result of the callback
   * @throws Error if the lock cannot be obtained within the timeout period
   */
  readTransaction<T>(callback: (tx: Transaction) => Promise<T>, lockTimeout?: number): Promise<T>;

  /**
   * Open a read-write transaction.
   * This takes a global lock - only one write transaction can execute against the database at a time.
   * Statements within the transaction must be done on the provided {@link Transaction} interface.
   *
   * @param callback - Function to execute within the transaction
   * @param lockTimeout - Time in milliseconds to wait for a lock before throwing an error
   * @returns The result of the callback
   * @throws Error if the lock cannot be obtained within the timeout period
   */
  writeTransaction<T>(callback: (tx: Transaction) => Promise<T>, lockTimeout?: number): Promise<T>;

  /**
   * This version of `watch` uses `AsyncGenerator`, for documentation see {@link AbstractPowerSyncDatabase.watchWithAsyncGenerator}.
   * Can be overloaded to use a callback handler instead, for documentation see {@link AbstractPowerSyncDatabase.watchWithCallback}.
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
   * See {@link AbstractPowerSyncDatabase.watchWithCallback}.
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

  /**
   * Allows defining a query which can be used to build a {@link WatchedQuery}.
   * The defined query will be executed with {@link AbstractPowerSyncDatabase#getAll}.
   * An optional mapper function can be provided to transform the results.
   *
   * @example
   * ```javascript
   * const watchedTodos = powersync.query({
   *  sql: `SELECT photo_id as id FROM todos WHERE photo_id IS NOT NULL`,
   *  parameters: [],
   *  mapper: (row) => ({
   *    ...row,
   *    created_at: new Date(row.created_at as string)
   *  })
   * })
   * .watch()
   * // OR use .differentialWatch() for fine-grained watches.
   * ```
   */
  query<RowType>(query: ArrayQueryDefinition<RowType>): Query<RowType>;

  /**
   * Allows building a {@link WatchedQuery} using an existing {@link WatchCompatibleQuery}.
   * The watched query will use the provided {@link WatchCompatibleQuery.execute} method to query results.
   *
   * @example
   * ```javascript
   *
   * // Potentially a query from an ORM like Drizzle
   * const query = db.select().from(lists);
   *
   * const watchedTodos = powersync.customQuery(query)
   * .watch()
   * // OR use .differentialWatch() for fine-grained watches.
   * ```
   */
  customQuery<RowType>(query: WatchCompatibleQuery<RowType[]>): Query<RowType>;

  /**
   * Execute a read query every time the source tables are modified.
   * Use {@link SQLOnChangeOptions.throttleMs} to specify the minimum interval between queries.
   * Source tables are automatically detected using `EXPLAIN QUERY PLAN`.
   *
   * Note that the `onChange` callback member of the handler is required.
   *
   * @param sql - The SQL query to execute
   * @param parameters - Optional array of parameters to bind to the query
   * @param handler - Callbacks for handling results and errors
   * @param options - Options for configuring watch behavior
   */
  watchWithCallback(sql: string, parameters?: any[], handler?: WatchHandler, options?: SQLWatchOptions): void;

  /**
   * Execute a read query every time the source tables are modified.
   * Use {@link SQLOnChangeOptions.throttleMs} to specify the minimum interval between queries.
   * Source tables are automatically detected using `EXPLAIN QUERY PLAN`.
   *
   * @param sql - The SQL query to execute
   * @param parameters - Optional array of parameters to bind to the query
   * @param options - Options for configuring watch behavior
   * @returns An AsyncIterable that yields QueryResults whenever the data changes
   */
  watchWithAsyncGenerator(sql: string, parameters?: any[], options?: SQLWatchOptions): AsyncIterable<QueryResult>;

  /**
   * Resolves the list of tables that are used in a SQL query.
   * If tables are specified in the options, those are used directly.
   * Otherwise, analyzes the query using EXPLAIN to determine which tables are accessed.
   *
   * @param sql - The SQL query to analyze
   * @param parameters - Optional parameters for the SQL query
   * @param options - Optional watch options that may contain explicit table list
   * @returns Array of table names that the query depends on
   */
  resolveTables(sql: string, parameters?: any[], options?: SQLWatchOptions): Promise<string[]>;

  /**
   * This version of `onChange` uses `AsyncGenerator`, for documentation see {@link AbstractPowerSyncDatabase.onChangeWithAsyncGenerator}.
   * Can be overloaded to use a callback handler instead, for documentation see {@link AbstractPowerSyncDatabase.onChangeWithCallback}.
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
  onChange(options?: SQLOnChangeOptions): AsyncIterable<WatchOnChangeEvent>;
  /**
   * See {@link AbstractPowerSyncDatabase.onChangeWithCallback}.
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
  onChange(handler?: WatchOnChangeHandler, options?: SQLOnChangeOptions): () => void;

  /**
   * Invoke the provided callback on any changes to any of the specified tables.
   *
   * This is preferred over {@link AbstractPowerSyncDatabase.watchWithCallback} when multiple queries need to be performed
   * together when data is changed.
   *
   * Note that the `onChange` callback member of the handler is required.
   *
   * @param handler - Callbacks for handling change events and errors
   * @param options - Options for configuring watch behavior
   * @returns A dispose function to stop watching for changes
   */
  onChangeWithCallback(handler?: WatchOnChangeHandler, options?: SQLOnChangeOptions): () => void;

  /**
   * Create a Stream of changes to any of the specified tables.
   *
   * This is preferred over {@link AbstractPowerSyncDatabase.watchWithAsyncGenerator} when multiple queries need to be
   * performed together when data is changed.
   *
   * Note: do not declare this as `async *onChange` as it will not work in React Native.
   *
   * @param options - Options for configuring watch behavior
   * @returns An AsyncIterable that yields change events whenever the specified tables change
   */
  onChangeWithAsyncGenerator(options?: SQLWatchOptions): AsyncIterable<WatchOnChangeEvent>;

  /**
   * @internal
   */
  createMutex(): Mutex;
}
