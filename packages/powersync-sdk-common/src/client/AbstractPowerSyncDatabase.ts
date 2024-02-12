import _ from 'lodash';
import { Mutex } from 'async-mutex';
import Logger, { ILogger } from 'js-logger';
import { DBAdapter, QueryResult, Transaction, isBatchedUpdateNotification } from '../db/DBAdapter';
import { Schema } from '../db/schema/Schema';
import { SyncStatus } from '../db/crud/SyncStatus';
import { UploadQueueStats } from '../db/crud/UploadQueueStatus';
import { PowerSyncBackendConnector } from './connection/PowerSyncBackendConnector';
import {
  AbstractStreamingSyncImplementation,
  DEFAULT_CRUD_UPLOAD_THROTTLE_MS,
  StreamingSyncImplementationListener
} from './sync/stream/AbstractStreamingSyncImplementation';
import { CrudBatch } from './sync/bucket/CrudBatch';
import { CrudTransaction } from './sync/bucket/CrudTransaction';
import { BucketStorageAdapter, PSInternalTable } from './sync/bucket/BucketStorageAdapter';
import { CrudEntry, CrudEntryJSON } from './sync/bucket/CrudEntry';
import { mutexRunExclusive } from '../utils/mutex';
import { BaseObserver } from '../utils/BaseObserver';
import { EventIterator } from 'event-iterator';
import { quoteIdentifier } from '../utils/strings';

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

export interface PowerSyncDBListener extends StreamingSyncImplementationListener {
  initialized: () => void;
}

const POWERSYNC_TABLE_MATCH = /(^ps_data__|^ps_data_local__)/;

const DEFAULT_DISCONNECT_CLEAR_OPTIONS: DisconnectAndClearOptions = {
  clearLocal: true
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

  closed: boolean;
  ready: boolean;

  currentStatus?: SyncStatus;
  syncStreamImplementation?: AbstractStreamingSyncImplementation;
  sdkVersion: string;

  private abortController: AbortController | null;
  protected bucketStorageAdapter: BucketStorageAdapter;
  private syncStatusListenerDisposer?: () => void;
  protected _isReadyPromise: Promise<void>;
  protected _schema: Schema;

  constructor(protected options: PowerSyncDatabaseOptions) {
    super();
    this.bucketStorageAdapter = this.generateBucketStorageAdapter();
    this.closed = true;
    this.currentStatus = null;
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
  protected get database() {
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
    this.ready = true;
    this.iterateListeners((cb) => cb.initialized?.());
  }

  /**
   * Replace the schema with a new version. This is for advanced use cases - typically the schema should just be specified once in the constructor.
   *
   * Cannot be used while connected - this should only be called before {@link AbstractPowerSyncDatabase.connect}.
   */
  async updateSchema(schema: Schema) {
    if (this.abortController) {
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
      this.options.logger.warn('Schema validation failed. Unexpected behaviour could occur', ex);
    }
    this._schema = schema;
    await this.database.execute('SELECT powersync_replace_schema(?)', [JSON.stringify(this.schema.toJSON())]);
  }

  /**
   * Queues a CRUD upload when internal CRUD tables have been updated
   */
  protected async watchCrudUploads() {
    for await (const event of this.onChange({
      tables: [PSInternalTable.CRUD],
      rawTableNames: true,
      signal: this.abortController?.signal
    })) {
      this.syncStreamImplementation?.triggerCrudUpload();
    }
  }

  /**
   * Wait for initialization to complete.
   * While initializing is automatic, this helps to catch and report initialization errors.
   */
  async init() {
    return this.waitForReady();
  }

  /**
   * Connects to stream of events from PowerSync instance
   */
  async connect(connector: PowerSyncBackendConnector) {
    // close connection if one is open
    await this.disconnect();

    await this.waitForReady();
    this.syncStreamImplementation = this.generateSyncStreamImplementation(connector);
    this.syncStatusListenerDisposer = this.syncStreamImplementation.registerListener({
      statusChanged: (status) => {
        this.currentStatus = status;
        this.iterateListeners((cb) => cb.statusChanged?.(status));
      }
    });

    this.abortController = new AbortController();
    // Begin network stream
    this.syncStreamImplementation.triggerCrudUpload();
    this.syncStreamImplementation.streamingSync(this.abortController.signal);
    this.watchCrudUploads();
  }

  /**
   * Close the sync connection.
   *
   * Use {@link connect} to connect again.
   */
  async disconnect() {
    this.abortController?.abort();
    this.syncStatusListenerDisposer?.();
    this.abortController = null;
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

    const { clearLocal } = options;

    // TODO DB name, verify this is necessary with extension
    await this.database.writeTransaction(async (tx) => {
      await tx.execute(`DELETE FROM ${PSInternalTable.OPLOG}`);
      await tx.execute(`DELETE FROM ${PSInternalTable.CRUD}`);
      await tx.execute(`DELETE FROM ${PSInternalTable.BUCKETS}`);

      const tableGlob = clearLocal ? 'ps_data_*' : 'ps_data__*';

      const existingTableRows = await tx.execute(
        `
      SELECT name FROM sqlite_master WHERE type='table' AND name GLOB ?
      `,
        [tableGlob]
      );

      if (!existingTableRows.rows.length) {
        return;
      }
      for (const row of existingTableRows.rows._array) {
        await tx.execute(`DELETE FROM ${quoteIdentifier(row.name)} WHERE 1`);
      }
    });
  }

  /*
   * Close the database, releasing resources.
   *
   * Also disconnects any active connection.
   *
   * Once close is called, this connection cannot be used again - a new one
   * must be constructed.
   */
  async close() {
    await this.waitForReady();

    await this.disconnect();
    this.database.close();
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

        const row = result.rows.item(0);
        return new UploadQueueStats(row?.count ?? 0, row?.size ?? 0);
      } else {
        const result = await tx.execute(`SELECT count(*) as count FROM ${PSInternalTable.CRUD}`);
        const row = result.rows.item(0);
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
    const result = await this.database.execute(
      `SELECT id, tx_id, data FROM ${PSInternalTable.CRUD} ORDER BY id ASC LIMIT ?`,
      [limit + 1]
    );

    const all: CrudEntry[] = result.rows?._array?.map((row) => CrudEntry.fromRow(row)) ?? [];

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
  async getNextCrudTransaction(): Promise<CrudTransaction> {
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
   * Execute a statement and optionally return results.
   */
  async execute(sql: string, parameters?: any[]) {
    await this.waitForReady();
    return this.database.execute(sql, parameters);
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
   * Execute a read query every time the source tables are modified.
   * Use {@link SQLWatchOptions.throttleMs} to specify the minimum interval between queries.
   * Source tables are automatically detected using `EXPLAIN QUERY PLAN`.
   */
  async *watch(sql: string, parameters?: any[], options?: SQLWatchOptions): AsyncIterable<QueryResult> {
    //Fetch initial data
    yield await this.executeReadOnly(sql, parameters);

    const resolvedTables = options?.tables ?? [];
    if (!options?.tables) {
      const explained = await this.getAll(`EXPLAIN ${sql}`, parameters);
      const rootPages = _.chain(explained)
        .filter((row) => row['opcode'] == 'OpenRead' && row['p3'] == 0 && _.isNumber(row['p2']))
        .map((row) => row['p2'])
        .value();
      const tables = await this.getAll<{ tbl_name: string }>(
        `SELECT tbl_name FROM sqlite_master WHERE rootpage IN (SELECT json_each.value FROM json_each(?))`,
        [JSON.stringify(rootPages)]
      );
      tables.forEach((t) => resolvedTables.push(t.tbl_name.replace(POWERSYNC_TABLE_MATCH, '')));
    }
    for await (const event of this.onChange({
      ...(options ?? {}),
      tables: _.uniq(resolvedTables)
    })) {
      yield await this.executeReadOnly(sql, parameters);
    }
  }

  /**
   * Create a Stream of changes to any of the specified tables.
   *
   * This is preferred over {@link watch} when multiple queries need to be performed
   * together when data is changed.
   *
   * Note, do not declare this as `async *onChange` as it will not work in React Native
   */
  onChange(options?: SQLWatchOptions): AsyncIterable<WatchOnChangeEvent> {
    const watchedTables = options.tables ?? [];

    let throttledTableUpdates: string[] = [];
    const throttleMs = options.throttleMs ?? DEFAULT_WATCH_THROTTLE_MS;

    return new EventIterator<WatchOnChangeEvent>((eventOptions) => {
      const flushTableUpdates = _.throttle(
        () => {
          const intersection = _.intersection(watchedTables, throttledTableUpdates);
          if (intersection.length) {
            eventOptions.push({
              changedTables: intersection
            });
          }
          throttledTableUpdates = [];
        },
        throttleMs,
        { leading: false, trailing: true }
      );

      const dispose = this.database.registerListener({
        tablesUpdated: async (update) => {
          const { rawTableNames } = options;

          const tables = isBatchedUpdateNotification(update) ? update.tables : [update.table];

          const filteredTables = rawTableNames ? tables : tables.filter((t) => !!t.match(POWERSYNC_TABLE_MATCH));
          if (!filteredTables.length) {
            return;
          }

          // Remove any PowerSync table prefixes if necessary
          const mappedTableNames = rawTableNames
            ? filteredTables
            : filteredTables.map((t) => t.replace(POWERSYNC_TABLE_MATCH, ''));

          throttledTableUpdates.push(...mappedTableNames);

          flushTableUpdates();
        }
      });

      options.signal?.addEventListener('abort', () => {
        dispose();
        eventOptions.stop();
        // Maybe fail?
      });

      return () => dispose();
    });
  }

  private async executeReadOnly(sql: string, params: any[]) {
    await this.waitForReady();
    return this.database.readLock((tx) => tx.execute(sql, params));
  }
}
