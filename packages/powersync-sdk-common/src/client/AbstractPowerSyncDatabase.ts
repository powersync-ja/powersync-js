import _ from 'lodash';
import { Mutex } from 'async-mutex';
import Logger, { ILogger } from 'js-logger';
import { DBAdapter, QueryResult, Transaction } from '../db/DBAdapter';
import { Schema } from '../db/schema/Schema';
import { SyncStatus } from '../db/crud/SyncStatus';
import { UploadQueueStats } from '../db/crud/UploadQueueStatus';
import { PowerSyncBackendConnector } from './connection/PowerSyncBackendConnector';
import {
  AbstractStreamingSyncImplementation,
  StreamingSyncImplementationListener
} from './sync/stream/AbstractStreamingSyncImplementation';
import { CrudBatch } from './sync/bucket/CrudBatch';
import { CrudTransaction } from './sync/bucket/CrudTransaction';
import { BucketStorageAdapter } from './sync/bucket/BucketStorageAdapter';
import { CrudEntry } from './sync/bucket/CrudEntry';
import { mutexRunExclusive } from '../utils/mutex';
import { BaseObserver } from '../utils/BaseObserver';
import { EventIterator } from 'event-iterator';

export interface PowerSyncDatabaseOptions {
  schema: Schema;
  database: DBAdapter;
  retryDelay?: number;
  logger?: ILogger;
}

export interface SQLWatchOptions {
  signal?: AbortSignal;
  tables?: string[];
  throttleMs?: number;
}

export interface WatchOnChangeEvent {
  changedTables: string[];
}

export interface PowerSyncDBListener extends StreamingSyncImplementationListener {}

const POWERSYNC_TABLE_MATCH = /(^ps_data__|^ps_data_local__)/;

export const DEFAULT_WATCH_THROTTLE_MS = 30;

export const DEFAULT_POWERSYNC_DB_OPTIONS = {
  retryDelay: 5000,
  logger: Logger.get('PowerSyncDatabase')
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

  currentStatus?: SyncStatus;
  syncStreamImplementation?: AbstractStreamingSyncImplementation;
  sdkVersion: string;

  private abortController: AbortController | null;
  protected bucketStorageAdapter: BucketStorageAdapter;
  private syncStatusListenerDisposer?: () => void;
  protected initialized: Promise<void>;

  /**
   * Initializes PowerSync
   */
  public init: () => Promise<void>;

  constructor(protected options: PowerSyncDatabaseOptions) {
    super();
    this.currentStatus = null;
    this.closed = true;
    this.options = { ...DEFAULT_POWERSYNC_DB_OPTIONS, ...options };
    this.bucketStorageAdapter = this.generateBucketStorageAdapter();
    this.sdkVersion = '';
    // This ensures the `initialized` promise is pending even before `init` is called
    this.initialized = new Promise((resolve, reject) => {
      this.init = async () => {
        try {
          resolve(await this.initFn());
        } catch (ex) {
          reject(ex);
        }
      };
    });
  }

  get schema() {
    return this.options.schema;
  }

  protected get database() {
    return this.options.database;
  }

  get connected() {
    return this.currentStatus?.connected || false;
  }

  protected abstract generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector
  ): AbstractStreamingSyncImplementation;

  protected abstract generateBucketStorageAdapter(): BucketStorageAdapter;

  abstract _init(): Promise<void>;

  /**
   * This performs the total initialization process.
   */
  private async initFn() {
    await this._init();
    await this.bucketStorageAdapter.init();
    await this.database.execute('SELECT powersync_replace_schema(?)', [JSON.stringify(this.schema.toJSON())]);
    const version = await this.options.database.execute('SELECT powersync_rs_version()');
    this.sdkVersion = version.rows?.item(0)['powersync_rs_version()'] ?? '';
  }

  /**
   * Connects to stream of events from PowerSync instance
   */
  async connect(connector: PowerSyncBackendConnector) {
    // close connection if one is open
    await this.disconnect();

    await this.initialized;
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
  }

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
   */
  async disconnectAndClear() {
    await this.disconnect();

    // TODO DB name, verify this is necessary with extension
    await this.database.writeTransaction(async (tx) => {
      await tx.execute('DELETE FROM ps_oplog WHERE 1');
      await tx.execute('DELETE FROM ps_crud WHERE 1');
      await tx.execute('DELETE FROM ps_buckets WHERE 1');

      const existingTableRows = await tx.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name GLOB 'ps_data_*'"
      );

      if (!existingTableRows.rows.length) {
        return;
      }
      for (const row of existingTableRows.rows._array) {
        await tx.execute(`DELETE FROM ${row.name} WHERE 1`);
      }
    });
  }

  /*
   * Close the database, releasing resources.
   *
   * Also [disconnect]s any active connection.
   *
   * Once close is called, this connection cannot be used again - a new one
   * must be constructed.
   */
  async close() {
    await this.initialized;

    await this.disconnect();
    this.database.close();
  }

  /**
   * Get upload queue size estimate and count.
   */
  async getUploadQueueStats(includeSize?: boolean): Promise<UploadQueueStats> {
    return this.readTransaction(async (tx) => {
      if (includeSize) {
        const result = await tx.execute('SELECT SUM(cast(data as blob) + 20) as size, count(*) as count FROM ps_crud');

        const row = result.rows.item(0);
        return new UploadQueueStats(row?.count ?? 0, row?.size ?? 0);
      } else {
        const result = await tx.execute('SELECT count(*) as count FROM ps_crud');
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
   * Use this from the [PowerSyncBackendConnector.uploadData]` callback.
   *
   * Once the data have been successfully uploaded, call [CrudBatch.complete] before
   * requesting the next batch.
   *
   * Use [limit] to specify the maximum number of updates to return in a single
   * batch.
   *
   * This method does include transaction ids in the result, but does not group
   * data by transaction. One batch may contain data from multiple transactions,
   * and a single transaction may be split over multiple batches.
   */
  async getCrudBatch(limit: number): Promise<CrudBatch | null> {
    const result = await this.database.execute('SELECT id, tx_id, data FROM ps_crud ORDER BY id ASC LIMIT ?', [
      limit + 1
    ]);

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
    return new CrudBatch(all, haveMore, async (writeCheckpoint?: string) => {
      await this.writeTransaction(async (tx) => {
        await tx.execute('DELETE FROM ps_crud WHERE id <= ?', [last.clientId]);
        if (writeCheckpoint != null && (await tx.execute('SELECT 1 FROM ps_crud LIMIT 1')) == null) {
          await tx.execute("UPDATE ps_buckets SET target_op = ? WHERE name='$local'", [writeCheckpoint]);
        } else {
          await tx.execute("UPDATE ps_buckets SET target_op = ? WHERE name='$local'", [
            this.bucketStorageAdapter.getMaxOpId()
          ]);
        }
      });
    });
  }

  /**
   * Get the next recorded transaction to upload.
   *
   * Returns null if there is no data to upload.
   *
   * Use this from the [PowerSyncBackendConnector.uploadData]` callback.
   *
   * Once the data have been successfully uploaded, call [CrudTransaction.complete] before
   * requesting the next transaction.
   *
   * Unlike [getCrudBatch], this only returns data from a single transaction at a time.
   * All data for the transaction is loaded into memory.
   */
  async getNextCrudTransaction(): Promise<CrudTransaction> {
    return await this.readTransaction(async (tx) => {
      const first = await tx.execute('SELECT id, tx_id, data FROM ps_crud ORDER BY id ASC LIMIT 1');

      if (!first.rows.length) {
        return null;
      }
      const txId: number | undefined = first['tx_id'];

      let all: CrudEntry[] = [];
      if (!txId) {
        all = [CrudEntry.fromRow(first.rows.item(0))];
      } else {
        const result = await tx.execute('SELECT id, tx_id, data FROM ps_crud WHERE tx_id = ? ORDER BY id ASC', [txId]);
        all = result.rows._array.map((row) => CrudEntry.fromRow(row));
      }

      const last = all[all.length - 1];

      return new CrudTransaction(
        all,
        async (writeCheckpoint?: string) => {
          await this.writeTransaction(async (tx) => {
            await tx.execute('DELETE FROM ps_crud WHERE id <= ?', [last.clientId]);
            if (writeCheckpoint) {
              const check = await tx.execute('SELECT 1 FROM ps_crud LIMIT 1');
              if (!check.rows?.length) {
                await tx.execute("UPDATE ps_buckets SET target_op = ? WHERE name='$local'", [writeCheckpoint]);
              }
            } else {
              await tx.execute("UPDATE ps_buckets SET target_op = ? WHERE name='$local'", [
                this.bucketStorageAdapter.getMaxOpId()
              ]);
            }
          });
        },
        txId
      );
    });
  }

  /**
   * Execute a statement and optionally return results
   */
  async execute(sql: string, parameters?: any[]) {
    await this.initialized;
    return this.database.execute(sql, parameters);
  }

  /**
   *  Execute a read-only query and return results
   */
  async getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
    await this.initialized;
    return this.database.getAll(sql, parameters);
  }

  /**
   * Execute a read-only query and return the first result, or null if the ResultSet is empty.
   */
  async getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
    await this.initialized;
    return this.database.getOptional(sql, parameters);
  }

  /**
   * Execute a read-only query and return the first result, error if the ResultSet is empty.
   */
  async get<T>(sql: string, parameters?: any[]): Promise<T> {
    await this.initialized;
    return this.database.get(sql, parameters);
  }

  /**
   * Takes a read lock, without starting a transaction.
   *
   * In most cases, [readTransaction] should be used instead.
   */
  async readLock<T>(callback: (db: DBAdapter) => Promise<T>) {
    await this.initialized;
    return mutexRunExclusive(AbstractPowerSyncDatabase.transactionMutex, () => callback(this.database));
  }

  /**
   * Takes a global lock, without starting a transaction.
   * In most cases, [writeTransaction] should be used instead.
   */
  async writeLock<T>(callback: (db: DBAdapter) => Promise<T>) {
    await this.initialized;
    return mutexRunExclusive(AbstractPowerSyncDatabase.transactionMutex, async () => {
      const res = await callback(this.database);
      _.defer(() => this.syncStreamImplementation?.triggerCrudUpload());
      return res;
    });
  }

  async readTransaction<T>(
    callback: (tx: Transaction) => Promise<T>,
    lockTimeout: number = DEFAULT_LOCK_TIMEOUT_MS
  ): Promise<T> {
    await this.initialized;
    return this.database.readTransaction(
      async (tx) => {
        const res = await callback({ ...tx });
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
    await this.initialized;
    return this.database.writeTransaction(
      async (tx) => {
        const res = await callback(tx);
        await tx.commit();
        _.defer(() => this.syncStreamImplementation?.triggerCrudUpload());
        return res;
      },
      { timeoutMs: lockTimeout }
    );
  }

  async *watch(sql: string, parameters?: any[], options?: SQLWatchOptions): AsyncIterable<QueryResult> {
    //Fetch initial data
    yield await this.execute(sql, parameters);

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
      tables: resolvedTables
    })) {
      yield await this.execute(sql, parameters);
    }
  }

  /**
   * Create a Stream of changes to any of the specified tables.
   *
   * This is preferred over [watch] when multiple queries need to be performed
   * together when data is changed.
   *
   * Note, do not declare this as `async *onChange` as it will not work in React Native
   */
  onChange(options?: SQLWatchOptions): AsyncIterable<WatchOnChangeEvent> {
    const watchedTables = options.tables ?? [];

    let throttledTableUpdates: string[] = [];
    const throttleMs = options.throttleMs ?? DEFAULT_WATCH_THROTTLE_MS;

    return new EventIterator<WatchOnChangeEvent>((eventOptions) => {
      const flushTableUpdates = _.throttle(async () => {
        const intersection = _.intersection(watchedTables, throttledTableUpdates);
        if (intersection.length) {
          eventOptions.push({
            changedTables: intersection
          });
        }
        throttledTableUpdates = [];
      }, throttleMs);

      const dispose = this.database.registerListener({
        tablesUpdated: async (update) => {
          const { table } = update;
          if (!table.match(POWERSYNC_TABLE_MATCH)) {
            return;
          }
          const tableName = table.replace(POWERSYNC_TABLE_MATCH, '');
          throttledTableUpdates.push(tableName);

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
}
