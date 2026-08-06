import * as Comlink from 'comlink';
import {
  BaseQueryResult,
  BatchedUpdateNotification,
  DBAdapter,
  DBLockOptions,
  LockContext,
  QueryResult,
  queryResultWithoutRows,
  RawQueryResult
} from '@powersync/common';
import { applyWalChanges, DatabaseServer, emptyWalState, WalIndexChange, WriteAheadBuffers } from './shared.js';
import { Mutex, Semaphore } from '@powersync/shared-internals';
import type { RawWaSqliteDatabaseOptions } from '../wa-sqlite/RawSqliteConnection.js';
import { acquireFromPool } from '../acquireFromPool.js';

/**
 * Options for a {@link InMemoryWriteAheadLogPool}.
 */
export interface InMemoryWriteAheadLogPoolOptions {
  /**
   * The amount of workers to use, must at least be `1`.
   */
  numWorkers: number;
  /**
   * Optional additional options used to configure how the database is opened in workers.
   */
  database?: Partial<RawWaSqliteDatabaseOptions>;
  /**
   * The maximum size of the database buffer, in bytes.
   *
   * This VFS uses a growable buffer, so not all of this is allocated immediately. By default, the VFS attempts to use
   * 16 GB and falls back to 1 GB if that fails (e.g. on 32-bit platforms).
   */
  maxDatabaseSize?: number;
  /**
   * The maximum size of the write-ahead log, in bytes.
   *
   * The size of the write-ahead log constraints the amount of data that can be written in a single transaction.
   *
   * This VFS uses a growable buffer, so not all of this is allocated immediately. By default, the VFS attempts to use
   * 1 GB.
   */
  maxWriteAheadLogSize?: number;
}

function createWriteAheadLogBuffers(options: InMemoryWriteAheadLogPoolOptions): WriteAheadBuffers {
  const gigabyte = 1024 * 1024 * 1024;
  let database: SharedArrayBuffer;

  if (options.maxDatabaseSize) {
    database = new SharedArrayBuffer(0, { maxByteLength: options.maxDatabaseSize });
  } else {
    try {
      database = new SharedArrayBuffer(0, { maxByteLength: 16 * gigabyte });
    } catch {
      database = new SharedArrayBuffer(0, { maxByteLength: 1 * gigabyte });
    }
  }

  return {
    database,
    writeAheadLog: new SharedArrayBuffer(0, { maxByteLength: options.maxWriteAheadLogSize ?? 1 * gigabyte })
  };
}

/**
 * An in-memory database backed by a pool of workers.
 *
 * Multiple workers can execute readonly transactions in parallel, and a single writer is allowed to write to the
 * database in parallel to readers. To allow multiple workers to access the same database, this is based on shared array
 * buffers and requires the page to be [cross-origin isolated](https://web.dev/articles/cross-origin-isolation-guide).
 *
 * To use this VFS, pass it to the {@link PowerSyncDatabase} constructor:
 *
 * ```TypeScript
 * import { PowerSyncDatabase, Schema } from '@powersync/web';
 * import InMemoryWriteAheadLogPool from '@powersync/web/extra/shared-memory-pool';
 *
 * const db = new PowerSyncDatabase({
 *   opened: new InMemoryWriteAheadLogPool({numWorkers: 3}),
 *   schema: new Schema(...),
 * });
 * ```
 *
 * This database uses a concept known as a write-ahead log: Instead of writing changes directly to the database (which
 * would cause conflicts with readers), the writer appends modified database pages into an append-only overlay log. When
 * readers start a transaction, they consider the main database and items from the log until a specific position,
 * meaning that future appends won't discrupt existing readers.
 *
 * To avoid the write-ahead log from growing indefinitely, it is regularly copied back into the main database file. This
 * process is called a checkpoint, and in this implementation it blocks all other database access. However, it only
 * needs to copy between memory and is usually fairly fast. This implementation checkpoints after a transaction
 * completes and at least 10% of the WAL are used. We might fine-tune this later.
 */
export class InMemoryWriteAheadLogPool extends DBAdapter {
  // Note that this name is also used as an identifier for sync navigator locks, so we want it to be unique. As there is
  // no persistence, the name is not configurable and serves no other purpose.
  override readonly name: string = `in-memory-${crypto.randomUUID()}`;

  readonly #buffers: WriteAheadBuffers;
  readonly #rawWorkers: PoolWorker[] = [];

  // There is nothing that tells the read and write workers apart, and we will use a write worker for reads too. But we
  // must have a single designated write worker, because the sync connect is stored on the connection.
  readonly #readers: Semaphore<PoolWorker>;
  readonly #writeLock = new Mutex();

  readonly #walState = emptyWalState();
  readonly #checkpointThreshold: number;

  constructor(options: InMemoryWriteAheadLogPoolOptions) {
    super();
    this.#buffers = createWriteAheadLogBuffers(options);
    this.#checkpointThreshold = this.#buffers.writeAheadLog.maxByteLength / 10;
    for (let i = 0; i < options.numWorkers; i++) {
      this.#rawWorkers.push(new PoolWorker(this.#buffers, options.database ?? {}));
    }

    this.#readers = new Semaphore(this.#rawWorkers.slice(1));
  }

  get #writeWorker() {
    return this.#rawWorkers[0];
  }

  async #withWorker<T>(
    allowReadOnly: boolean,
    fn: (worker: PoolWorker) => Promise<T>,
    lockOptions?: DBLockOptions
  ): Promise<T> {
    return acquireFromPool(
      this.#writeLock,
      this.#writeWorker,
      this.#readers,
      async (worker) => {
        await worker.pushWalState();
        return await fn(worker);
      },
      lockOptions,
      allowReadOnly
    );
  }

  override readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.#withWorker(true, fn, options);
  }

  /**
   * Runs a checkpoint operation, moving pages from the write-ahead log to the main database file.
   */
  #checkpoint() {
    const walBuffer = this.#buffers.writeAheadLog;
    const databaseBuffer = this.#buffers.database;
    const newFileSize = this.#walState.fileSize;
    if (databaseBuffer.byteLength < newFileSize) {
      databaseBuffer.grow(newFileSize);
    }

    for (const [pageOffset, overlayEntry] of this.#walState.overlay.entries()) {
      const source = new Uint8Array(walBuffer, overlayEntry.logOffset, overlayEntry.size);
      new Uint8Array(databaseBuffer, pageOffset).set(source);
    }

    const cleared: WalIndexChange = { cleared: true, fileSize: newFileSize, walEnd: 0, added: [] };
    applyWalChanges(this.#walState, cleared);
    for (const worker of this.#rawWorkers) {
      worker.addChanges(cleared);
    }
  }

  /**
   * Propagates WAL additions from the writer to other workers, checkpointing if necessary.
   *
   * The caller must hold the write lock for the duration of the call.
   */
  async #propagateChangesFromWriter(writer: PoolWorker) {
    const changes = await writer.takeWalChanges();
    applyWalChanges(this.#walState, changes);

    if (changes.walEnd > this.#checkpointThreshold) {
      // Checkpoint. This can't run concurrently to anything else, so acquire remaining workers.
      const remainingWorkers = this.#readers.size - 1;
      if (remainingWorkers > 0) {
        const { release } = await this.#readers.requestAll();
        try {
          this.#checkpoint();
        } finally {
          release();
        }
      } else {
        this.#checkpoint();
      }
    } else {
      for (const otherWorker of this.#rawWorkers) {
        if (otherWorker !== writer) {
          otherWorker.addChanges(changes);
        }
      }
    }
  }

  override writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.#withWorker(
      false, // Don't allow read-only connection
      async (worker) => {
        try {
          const res = await fn(worker);

          const {
            rawRows: [[updates]]
          } = await worker.executeRaw(`SELECT powersync_update_hooks('get')`);
          const updatedTables: string[] = JSON.parse(updates as string);
          if (updatedTables.length) {
            const notification: BatchedUpdateNotification = { tables: updatedTables };
            this.iterateListeners((l) => l.tablesUpdated?.(notification));
          }
          return res;
        } finally {
          await this.#propagateChangesFromWriter(worker);
        }
      },
      options
    );
  }

  override async refreshSchema(): Promise<void> {
    if (this.#readers.size) {
      const { items, release } = await this.#readers.requestAll();
      try {
        await Promise.all(
          items.map(async (worker) => {
            await worker.pushWalState();
            await worker.executeRaw("pragma table_info('sqlite_master')");
          })
        );
      } finally {
        release();
      }
    }
  }

  override async close(): Promise<void> {
    const releaseWriter = await this.#writeLock.acquire();
    const readers = this.#readers.size ? await this.#readers.requestAll() : null;
    for (const worker of this.#rawWorkers) {
      worker.close();
    }

    releaseWriter();
    readers?.release();
  }
}

export default InMemoryWriteAheadLogPool;

class PoolWorker extends LockContext {
  #buffers: WriteAheadBuffers;
  #options: Partial<RawWaSqliteDatabaseOptions>;
  #worker: Worker;
  #server: Comlink.Remote<DatabaseServer>;
  #isInitialized = false;
  #outstandingChanges: WalIndexChange | null = null;

  constructor(buffers: WriteAheadBuffers, options: Partial<RawWaSqliteDatabaseOptions>) {
    super();
    this.#buffers = buffers;
    this.#options = options;
    this.#worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    this.#worker.onerror = (e) => {
      console.error('Worker error', e);
    };
    this.#server = Comlink.wrap(this.#worker);
  }

  addChanges(changes: WalIndexChange) {
    if (changes.cleared) {
      this.#outstandingChanges = { fileSize: changes.fileSize, walEnd: 0, cleared: true, added: [] };
    } else {
      const outstandingChanges = (this.#outstandingChanges ??= { fileSize: 0, walEnd: 0, added: [], cleared: false });
      outstandingChanges.fileSize = changes.fileSize;
      outstandingChanges.walEnd = changes.walEnd;
      outstandingChanges.added.push(...changes.added);
    }
  }

  async pushWalState() {
    if (!this.#isInitialized) {
      await this.#server.open(this.#buffers, this.#options);
      this.#isInitialized = true;
    }

    if (this.#outstandingChanges) {
      await this.#server.updateWalState(this.#outstandingChanges);
      this.#outstandingChanges = null;
    }
  }

  takeWalChanges() {
    return this.#server.takeWalChanges();
  }

  executeRaw<T>(query: string, params?: any[] | undefined): Promise<RawQueryResult> {
    return this.#server.executeRaw(query, params);
  }

  async executeBatch(query: string, params?: any[][]): Promise<QueryResult<never>> {
    const results = await this.#server.executeBatch(query, params ?? []);
    const result: BaseQueryResult = { insertId: undefined, rowsAffected: 0 };
    for (const source of results) {
      result.insertId = source.insertId;
      result.rowsAffected = (result.rowsAffected ?? 0) + source.rowsAffected;
    }

    return queryResultWithoutRows(result);
  }

  close() {
    this.#worker.terminate();
  }
}
