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
import {
  applyWalChanges,
  DatabaseServer,
  emptyWalState,
  WalIndexChange,
  WalOverlayEntry,
  WriteAheadBuffers
} from './shared.js';
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
 * meaning that future appends won't disrupt existing readers.
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

  // There is nothing that tells the read and write workers apart, and we will use a write worker for reads too. But we
  // must have a single designated write worker, because sync state is stored on the connection and the sync client
  // relies on this.
  readonly #readers?: Semaphore<PoolWorker>;
  readonly #underlyingReaders: PoolWorker[] = [];
  readonly #writer: PoolWorker;
  readonly #writeLock = new Mutex();

  readonly #walState = emptyWalState();
  readonly #checkpointThreshold: number;

  constructor(options: InMemoryWriteAheadLogPoolOptions) {
    super();
    if (options.numWorkers < 1) {
      throw new Error('Need at least one worker');
    }

    this.#buffers = createWriteAheadLogBuffers(options);
    this.#checkpointThreshold = this.#buffers.writeAheadLog.maxByteLength / 10;

    this.#writer = new PoolWorker(this.#buffers, options.database ?? {});
    for (let i = 0; i < options.numWorkers - 1; i++) {
      this.#underlyingReaders.push(new PoolWorker(this.#buffers, options.database ?? {}));
    }

    if (this.#underlyingReaders.length) {
      this.#readers = new Semaphore(this.#underlyingReaders);
    }
  }

  async #withWorker<T>(
    allowReadOnly: boolean,
    fn: (worker: PoolWorker) => Promise<T>,
    lockOptions?: DBLockOptions
  ): Promise<T> {
    return acquireFromPool(
      this.#writeLock,
      this.#writer,
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
   * Moves data from the write-ahead log overlay into the main database file.
   *
   * This may only be called with the writers and all readers locked.
   */
  #checkpoint(changes: WalIndexChange) {
    const walBuffer = this.#buffers.writeAheadLog;
    const databaseBuffer = this.#buffers.database;
    const newFileSize = changes.fileSize;

    // Note: Checkpointing can fail (e.g. due to us exceeding the max db size), in which case we must tell the
    // writer to drop the WAL changes it has made to consistently roll back the failure after throwing.
    try {
      if (databaseBuffer.byteLength < newFileSize) {
        databaseBuffer.grow(newFileSize);
      }

      function copyFromWal(dbOffset: number, overlayEntry: WalOverlayEntry) {
        const source = new Uint8Array(walBuffer, overlayEntry.logOffset, overlayEntry.size);
        new Uint8Array(databaseBuffer, dbOffset).set(source);
      }

      // Checkpoint existing entries from previous writes.
      for (const [pageOffset, overlayEntry] of this.#walState.overlay.entries()) {
        copyFromWal(pageOffset, overlayEntry);
      }

      // Checkpoint changes from the last writeLock call that haven't been applied yet.
      for (let i = 0; i < changes.added.length; i += 2) {
        const dbOffset = changes.added[i] as number;
        const walEntry = changes.added[i + 1] as WalOverlayEntry;
        copyFromWal(dbOffset, walEntry);
      }
    } catch (e) {
      // Checkpointing failed, reset the state in the write worker to the local state here.
      const allEntries: (number | WalOverlayEntry)[] = [];
      this.#walState.overlay.forEach((entry, offset) => allEntries.push(offset, entry));

      this.#writer.addChanges({
        cleared: true,
        fileSize: this.#walState.fileSize,
        walEnd: this.#walState.walEnd,
        added: allEntries
      });

      throw e;
    }

    // Checkpoint complete, inform all workers to reset their WAL view when they're used again.
    const cleared: WalIndexChange = { cleared: true, fileSize: newFileSize, walEnd: 0, added: [] };
    applyWalChanges(this.#walState, cleared);
    this.#writer.addChanges(cleared);
    for (const worker of this.#underlyingReaders) {
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

    if (changes.walEnd > this.#checkpointThreshold) {
      // Instead of applying these changes to the local overlay and other workers, checkpoint! This can't run
      // concurrently with anything else, so acquire read workers workers (we already have the  write lock when this
      // gets called).
      const acquiredReaders = await this.#readers?.requestAll();

      try {
        this.#checkpoint(changes);
      } finally {
        acquiredReaders?.release();
      }
    } else {
      // No checkpoint necessary, just forward WAL changes to other workers.
      applyWalChanges(this.#walState, changes);

      for (const otherWorker of this.#underlyingReaders) {
        otherWorker.addChanges(changes);
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
    // We only have to refresh readers, as the schema change itself was made on the write connection.
    if (this.#readers) {
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
    const readers = await this.#readers?.requestAll();

    await Promise.race([this.#writer.close(), ...(readers?.items ?? []).map((e) => e.close())]);

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

    const pending = this.#outstandingChanges;
    if (pending) {
      this.#outstandingChanges = null;
      await this.#server.updateWalState(pending);
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
