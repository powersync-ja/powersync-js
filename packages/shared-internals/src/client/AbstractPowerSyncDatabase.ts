import {
  ArrayQueryDefinition,
  BasePowerSyncDatabaseOptions,
  BatchedUpdateNotification,
  CommonPowerSyncDatabase,
  createConsoleLogger,
  CrudBatch,
  CrudEntry,
  CrudTransaction,
  DBAdapter,
  DisconnectAndClearOptions,
  isBatchedUpdateNotification,
  LockContext,
  LogLevels,
  PowerSyncBackendConnector,
  PowerSyncCloseOptions,
  PowerSyncDBListener,
  PowerSyncLogger,
  Query,
  QueryResult,
  Schema,
  SQLOnChangeOptions,
  SQLWatchOptions,
  SyncOptions,
  SyncStatus,
  SyncStream,
  Transaction,
  TriggerManager,
  UpdateNotification,
  UploadQueueStats,
  WatchCompatibleQuery,
  WatchHandler,
  WatchOnChangeEvent,
  WatchOnChangeHandler
} from '@powersync/common';
import { BucketStorageAdapter, PSInternalTable } from './sync/bucket/BucketStorageAdapter.js';
import { EventIterator } from 'event-iterator';
import { SyncStatusSnapshot } from '../db/crud/SyncStatus.js';
import {
  ConnectionManager,
  CreateSyncImplementationOptions,
  InternalSubscriptionAdapter
} from './ConnectionManager.js';
import { Mutex } from '../utils/mutex.js';
import { BaseObserver } from '../utils/BaseObserver.js';
import { TriggerManagerConfig, TriggerManagerImpl } from './triggers/TriggerManagerImpl.js';
import { StreamingSyncImplementation } from './sync/stream/AbstractStreamingSyncImplementation.js';
import { CoreSyncStatus } from './sync/stream/core-instruction.js';
import { CrudEntryImpl, CrudEntryJSON } from './sync/bucket/CrudEntry.js';
import { OnChangeQueryProcessor } from './watched/OnChangeQueryProcessor.js';
import { throttleTrailing } from '../utils/async.js';
import { ControlledExecutor } from '../utils/ControlledExecutor.js';
import { DEFAULT_WATCH_THROTTLE_MS } from './watched/WatchedQuery.js';
import { CustomQuery } from './CustomQuery.js';
import { MEMORY_TRIGGER_CLAIM_MANAGER } from './triggers/MemoryTriggerClaimManager.js';

const POWERSYNC_TABLE_MATCH = /(^ps_data__|^ps_data_local__)/;

const DEFAULT_DISCONNECT_CLEAR_OPTIONS: DisconnectAndClearOptions = {
  clearLocal: true
};

/**
 * @internal
 */
export const DEFAULT_POWERSYNC_CLOSE_OPTIONS: PowerSyncCloseOptions = {
  disconnect: true
};

const DEFAULT_CRUD_BATCH_LIMIT = 100;

/**
 * Requesting nested or recursive locks can block the application in some circumstances.
 * This default lock timeout will act as a failsafe to throw an error if a lock cannot
 * be obtained.
 *
 * @internal
 */
export const DEFAULT_LOCK_TIMEOUT_MS = 120_000; // 2 mins

export abstract class AbstractPowerSyncDatabase<
  Options extends BasePowerSyncDatabaseOptions = BasePowerSyncDatabaseOptions
>
  extends BaseObserver<PowerSyncDBListener>
  implements CommonPowerSyncDatabase
{
  closed: boolean;
  ready: boolean;

  currentStatus: SyncStatusSnapshot;

  sdkVersion: string;

  protected bucketStorageAdapter: BucketStorageAdapter;
  protected _isReadyPromise: Promise<void>;
  protected connectionManager: ConnectionManager;
  private subscriptions: InternalSubscriptionAdapter;

  get syncStreamImplementation() {
    return this.connectionManager.syncStreamImplementation;
  }

  /**
   * The connector used to connect to the PowerSync service.
   *
   * @returns The connector used to connect to the PowerSync service or null if `connect()` has not been called.
   */
  get connector() {
    return this.connectionManager.connector;
  }

  /**
   * The resolved connection options used to connect to the PowerSync service.
   *
   * @returns The resolved connection options used to connect to the PowerSync service or null if `connect()` has not been called.
   */
  get connectionOptions() {
    return this.connectionManager.connectionOptions;
  }

  protected _schema: Schema;
  private _database: DBAdapter;

  protected runExclusiveMutex: Mutex;

  /**
   * @experimental
   * Allows creating SQLite triggers which can be used to track various operations on SQLite tables.
   */
  readonly triggers: TriggerManager;
  protected triggersImpl: TriggerManagerImpl;

  logger: PowerSyncLogger;

  constructor(protected options: Options) {
    super();
    this.logger = options.logger ?? createConsoleLogger();

    const { schema } = options;

    if (typeof schema?.toJSON != 'function') {
      throw new Error('The `schema` option should be provided and should be an instance of `Schema`.');
    }

    this._database = this.openDBAdapter();
    this.bucketStorageAdapter = this.generateBucketStorageAdapter();
    this.closed = false;
    this.currentStatus = new SyncStatusSnapshot(null, {});
    this.options = { ...options };
    this._schema = schema;
    this.ready = false;
    this.sdkVersion = '';
    this.runExclusiveMutex = new Mutex();

    // Start async init
    this.subscriptions = {
      firstStatusMatching: (predicate, abort) => this.waitForStatus(predicate, abort),
      resolveOfflineSyncStatus: () => this.resolveOfflineSyncStatus(),
      rustSubscriptionsCommand: async (payload) => {
        await this.writeTransaction((tx) => {
          return tx.execute('select powersync_control(?,?)', ['subscriptions', JSON.stringify(payload)]);
        });
      }
    };
    this.connectionManager = new ConnectionManager({
      createSyncImplementation: async (connector, options) => {
        await this.waitForReady();
        return this.runExclusive(async () => {
          const sync = this.generateSyncStreamImplementation(connector, options);
          const onDispose = sync.registerListener({
            statusChanged: (status, dataFlow) => {
              this.currentStatus = new SyncStatusSnapshot(status, dataFlow);
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

    this.triggers = this.triggersImpl = new TriggerManagerImpl({
      db: this,
      schema: this.schema,
      ...this.generateTriggerManagerConfig()
    });
  }

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
  protected abstract openDBAdapter(): DBAdapter;

  /**
   * Generates a base configuration for {@link TriggerManagerImpl}.
   * Implementations should override this if necessary.
   */
  protected generateTriggerManagerConfig(): TriggerManagerConfig {
    return {
      claimManager: MEMORY_TRIGGER_CLAIM_MANAGER
    };
  }

  protected abstract generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector,
    options: CreateSyncImplementationOptions
  ): StreamingSyncImplementation;

  protected abstract generateBucketStorageAdapter(): BucketStorageAdapter;

  async waitForReady(): Promise<void> {
    if (this.ready) {
      return;
    }

    await this._isReadyPromise;
  }

  async waitForFirstSync(request?: AbortSignal | { signal?: AbortSignal; priority?: number }): Promise<void> {
    const signal = request instanceof AbortSignal ? request : request?.signal;
    const priority = request && 'priority' in request ? request.priority : undefined;

    const statusMatches =
      priority === undefined
        ? (status: SyncStatus) => status.hasSynced
        : (status: SyncStatus) => status.statusForPriority(priority)?.hasSynced == true;

    return this.waitForStatus(statusMatches, signal);
  }

  async waitForStatus(predicate: (status: SyncStatus) => any, signal?: AbortSignal): Promise<void> {
    if (predicate(this.currentStatus)) {
      return;
    }

    return new Promise((resolve) => {
      const dispose = this.registerListener({
        statusChanged: (status) => {
          if (predicate(status)) {
            abort();
          }
        }
      });

      function abort() {
        dispose();
        resolve();
      }

      if (signal?.aborted) {
        abort();
      } else {
        signal?.addEventListener('abort', abort);
      }
    });
  }

  /**
   * Allows for extended implementations to execute custom initialization
   * logic as part of the total init process
   */
  protected abstract _initialize(): Promise<void>;

  /**
   * Entry point for executing initialization logic.
   * This is to be automatically executed in the constructor.
   */
  protected async initialize() {
    await this._initialize();
    await this.bucketStorageAdapter.init();
    await this.loadVersion();
    await this.updateSchema(this.options.schema);
    await this.resolveOfflineSyncStatus();
    await this.database.execute('PRAGMA RECURSIVE_TRIGGERS=TRUE');
    await this.triggersImpl.cleanupResources();
    this.ready = true;
    this.iterateListeners((cb) => cb.initialized?.());
  }

  protected async loadVersion() {
    try {
      const { version } = await this.database.get<{ version: string }>('SELECT powersync_rs_version() as version');
      this.sdkVersion = version;
    } catch (e: any) {
      throw new Error(`The powersync extension is not loaded correctly. Details: ${e.message}`);
    }
    let versionInts: number[];
    try {
      versionInts = this.sdkVersion!.split(/[.\/]/)
        .slice(0, 3)
        .map((n) => parseInt(n));
    } catch (e: any) {
      throw new Error(
        `Unsupported powersync extension version. Need >=0.4.10 <1.0.0, got: ${this.sdkVersion}. Details: ${e.message}`
      );
    }

    // Validate >=0.4.10 <1.0.0
    if (versionInts[0] != 0 || versionInts[1] < 4 || (versionInts[1] == 4 && versionInts[2] < 10)) {
      throw new Error(`Unsupported powersync extension version. Need >=0.4.10 <1.0.0, got: ${this.sdkVersion}`);
    }
  }

  protected async resolveOfflineSyncStatus() {
    const result = await this.database.get<{ r: string }>('SELECT powersync_offline_sync_status() as r');
    const parsed = JSON.parse(result.r) as CoreSyncStatus;

    const updatedStatus = new SyncStatusSnapshot(parsed, this.currentStatus.dataFlowStatus);

    if (!updatedStatus.isEqual(this.currentStatus)) {
      this.currentStatus = updatedStatus;
      this.iterateListeners((l) => l.statusChanged?.(this.currentStatus));
    }
  }

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
      this.logger.log({
        level: LogLevels.warn,
        message: 'Schema validation failed. Unexpected behaviour could occur',
        error: ex
      });
    }
    this._schema = schema;

    await this.database.execute('SELECT powersync_replace_schema(?)', [JSON.stringify(this.schema.toJSON())]);
    await this.database.refreshSchema();
    this.iterateListeners(async (cb) => cb.schemaChanged?.(schema));
  }

  async init() {
    return this.waitForReady();
  }

  /**
   * @deprecated Use {@link AbstractPowerSyncDatabase#close} instead.
   * Clears all listeners registered by {@link AbstractPowerSyncDatabase#registerListener}.
   */
  dispose(): void {
    return super.dispose();
  }

  /**
   * Locking mechanism for exclusively running critical portions of connect/disconnect operations.
   * Locking here is mostly only important on web for multiple tab scenarios.
   */
  protected runExclusive<T>(callback: () => Promise<T>): Promise<T> {
    return this.runExclusiveMutex.runExclusive(callback);
  }

  async connect(connector: PowerSyncBackendConnector, options?: SyncOptions) {
    return this.connectionManager.connect(connector, options ?? {}, this.schema.toJSON());
  }

  async disconnect() {
    return this.connectionManager.disconnect();
  }

  async disconnectAndClear(options = DEFAULT_DISCONNECT_CLEAR_OPTIONS) {
    await this.disconnect();
    await this.waitForReady();

    const { clearLocal } = options;

    await this.database.writeTransaction(async (tx) => {
      await tx.execute('SELECT powersync_clear(?)', [clearLocal ? 1 : 0]);
    });

    // The data has been deleted - reset the sync status
    await this.resolveOfflineSyncStatus();
  }

  syncStream(name: string, params?: Record<string, any>): SyncStream {
    return this.connectionManager.stream(this.subscriptions, name, params ?? null);
  }

  async close(options: PowerSyncCloseOptions = DEFAULT_POWERSYNC_CLOSE_OPTIONS) {
    await this.waitForReady();

    if (this.closed) {
      return;
    }

    this.triggersImpl.dispose();

    await this.iterateAsyncListeners(async (cb) => cb.closing?.());

    const { disconnect } = options;
    if (disconnect) {
      await this.disconnect();
    }

    await this.connectionManager.close();
    await this.database.close();
    this.closed = true;
    await this.iterateAsyncListeners(async (cb) => cb.closed?.());
  }

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

  async getCrudBatch(limit: number = DEFAULT_CRUD_BATCH_LIMIT): Promise<CrudBatch | null> {
    const result = await this.getAll<CrudEntryJSON>(
      `SELECT id, tx_id, data FROM ${PSInternalTable.CRUD} ORDER BY id ASC LIMIT ?`,
      [limit + 1]
    );

    const all: CrudEntry[] = result.map((row) => CrudEntryImpl.fromRow(row)) ?? [];

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

  async getNextCrudTransaction(): Promise<CrudTransaction | null> {
    const iterator = this.getCrudTransactions()[Symbol.asyncIterator]();
    return (await iterator.next()).value;
  }

  getCrudTransactions(): AsyncIterable<CrudTransaction, null> {
    return {
      [Symbol.asyncIterator]: () => {
        let lastCrudItemId = -1;
        const sql = `
WITH RECURSIVE crud_entries AS (
  SELECT id, tx_id, data FROM ps_crud WHERE id = (SELECT min(id) FROM ps_crud WHERE id > ?)
  UNION ALL
  SELECT ps_crud.id, ps_crud.tx_id, ps_crud.data FROM ps_crud
    INNER JOIN crud_entries ON crud_entries.id + 1 = rowid
  WHERE crud_entries.tx_id = ps_crud.tx_id
)
SELECT * FROM crud_entries;
    `;

        return {
          next: async () => {
            const nextTransaction = await this.database.getAll<CrudEntryJSON>(sql, [lastCrudItemId]);
            if (nextTransaction.length == 0) {
              return { done: true, value: null };
            }

            const items = nextTransaction.map((row) => CrudEntryImpl.fromRow(row));
            const last = items[items.length - 1];
            const txId = last.transactionId;
            lastCrudItemId = last.clientId;

            return {
              done: false,
              value: new CrudTransaction(
                items,
                async (writeCheckpoint?: string) => this.handleCrudCheckpoint(last.clientId, writeCheckpoint),
                txId
              )
            };
          }
        };
      }
    };
  }

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

  async execute(sql: string, parameters?: any[]) {
    return this.writeLock((tx) => tx.execute(sql, parameters));
  }

  async executeRaw(sql: string, parameters?: any[]) {
    await this.waitForReady();
    return this.database.executeRaw(sql, parameters);
  }

  async executeBatch(sql: string, parameters?: any[][]) {
    await this.waitForReady();
    return this.database.executeBatch(sql, parameters);
  }

  async getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
    await this.waitForReady();
    return this.database.getAll(sql, parameters);
  }

  async getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
    await this.waitForReady();
    return this.database.getOptional(sql, parameters);
  }

  async get<T>(sql: string, parameters?: any[]): Promise<T> {
    await this.waitForReady();
    return this.database.get(sql, parameters);
  }

  async readLock<T>(callback: (db: LockContext) => Promise<T>) {
    await this.waitForReady();
    return this.database.readLock(callback);
  }

  async writeLock<T>(callback: (db: LockContext) => Promise<T>) {
    await this.waitForReady();
    return this.database.writeLock(callback);
  }

  async readTransaction<T>(
    callback: (tx: Transaction) => Promise<T>,
    lockTimeout: number = DEFAULT_LOCK_TIMEOUT_MS
  ): Promise<T> {
    await this.waitForReady();
    return this.database.readTransaction(
      async (tx) => {
        const res = await callback(tx);
        await tx.rollback();
        return res;
      },
      { timeoutMs: lockTimeout }
    );
  }

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

  watch(sql: string, parameters?: any[], options?: SQLWatchOptions): AsyncIterable<QueryResult>;

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

  query<RowType>(query: ArrayQueryDefinition<RowType>): Query<RowType> {
    const { sql, parameters = [], mapper } = query;
    const compatibleQuery: WatchCompatibleQuery<RowType[]> = {
      compile: () => ({
        sql,
        parameters
      }),
      execute: async ({ sql, parameters }) => {
        const result = await this.getAll<Record<string, any>>(sql, parameters);
        return mapper ? result.map(mapper) : (result as RowType[]);
      }
    };
    return this.customQuery(compatibleQuery);
  }

  customQuery<RowType>(query: WatchCompatibleQuery<RowType[]>): Query<RowType> {
    return new CustomQuery({
      db: this,
      query
    });
  }

  watchWithCallback(sql: string, parameters?: any[], handler?: WatchHandler, options?: SQLWatchOptions): void {
    const {
      onResult,
      onError = (e: Error) => this.logger.log({ level: LogLevels.error, message: 'Error in watch', error: e })
    } = handler ?? {};
    if (!onResult) {
      throw new Error('onResult is required');
    }
    const { comparator } = options ?? {};

    // This API yields a QueryResult type.
    // This is not a standard Array result, which makes it incompatible with the .query API.
    const watchedQuery = new OnChangeQueryProcessor({
      db: this,
      comparator,
      placeholderData: null as unknown as QueryResult, // FIXME
      watchOptions: {
        query: {
          compile: () => ({
            sql: sql,
            parameters: parameters ?? []
          }),
          execute: () => this.executeReadOnly(sql, parameters)
        },
        reportFetching: false,
        throttleMs: options?.throttleMs ?? DEFAULT_WATCH_THROTTLE_MS,
        triggerOnTables: options?.tables
      }
    });

    const dispose = watchedQuery.registerListener({
      onData: (data) => {
        if (!data) {
          // This should not happen. We only use null for the initial data.
          return;
        }
        onResult(data);
      },
      onError: (error) => {
        onError(error);
      }
    });

    options?.signal?.addEventListener('abort', () => {
      dispose();
      watchedQuery.close();
    });
  }

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

  onChange(options?: SQLOnChangeOptions): AsyncIterable<WatchOnChangeEvent>;
  onChange(handler?: WatchOnChangeHandler, options?: SQLOnChangeOptions): () => void;

  onChange(
    handlerOrOptions?: WatchOnChangeHandler | SQLOnChangeOptions,
    maybeOptions?: SQLOnChangeOptions
  ): (() => void) | AsyncIterable<WatchOnChangeEvent> {
    if (handlerOrOptions && typeof handlerOrOptions === 'object' && 'onChange' in handlerOrOptions) {
      const handler = handlerOrOptions as WatchOnChangeHandler;
      const options = maybeOptions;

      return this.onChangeWithCallback(handler, options);
    }

    const options = handlerOrOptions as SQLWatchOptions | undefined;
    return this.onChangeWithAsyncGenerator(options);
  }

  onChangeWithCallback(handler?: WatchOnChangeHandler, options?: SQLOnChangeOptions): () => void {
    const {
      onChange,
      onError = (e: Error) => this.logger.log({ level: LogLevels.error, message: 'error in onChange', error: e })
    } = handler ?? {};
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

    if (options?.triggerImmediate) {
      executor.schedule({ changedTables: [] });
    }

    const dispose = this.database.registerListener({
      tablesUpdated: async (update) => {
        try {
          this.processTableUpdates(update, changedTables);
          flushTableUpdates();
        } catch (error: any) {
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

  createMutex() {
    return new Mutex();
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

  private async executeReadOnly(sql: string, params?: any[]) {
    await this.waitForReady();
    return this.database.readLock((tx) => tx.execute(sql, params));
  }
}
