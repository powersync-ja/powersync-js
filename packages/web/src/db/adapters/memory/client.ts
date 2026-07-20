import * as Comlink from 'comlink';
import { DBAdapter, DBLockOptions, LockContext, RawQueryResult } from '@powersync/common';
import { applyWalChanges, DatabaseServer, emptyWalState, WalIndexChange, WriteAheadBuffers } from './shared.js';
import { Mutex, Semaphore } from '@powersync/shared-internals';

function createWriteAheadLogBuffers(): WriteAheadBuffers {
  const gigabyte = 1024 * 1024 * 1024;

  return {
    database: new SharedArrayBuffer(0, { maxByteLength: 4 * gigabyte }),
    writeAheadLog: new SharedArrayBuffer(0, { maxByteLength: 1 * gigabyte })
  };
}

interface InMemoryOptions {
  numWorkers: number;
}

export class InMemoryWriteAheadLogPool extends DBAdapter {
  readonly name: string = `in-memory-${crypto.randomUUID()}`;

  readonly #buffers: WriteAheadBuffers = createWriteAheadLogBuffers();
  readonly #rawWorkers: PoolWorker[] = [];
  readonly #workers: Semaphore<PoolWorker>;
  readonly #writeLock = new Mutex();
  readonly #walState = emptyWalState();

  constructor(options: InMemoryOptions) {
    super();
    for (let i = 0; i < options.numWorkers; i++) {
      this.#rawWorkers.push(new PoolWorker(this.#buffers));
    }

    this.#workers = new Semaphore(this.#rawWorkers);
  }

  async #withWorker<T>(fn: (worker: PoolWorker) => Promise<T>, options?: DBLockOptions): Promise<T> {
    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    let timeout: any = null;
    if (options?.timeoutMs) {
      timeout = setTimeout(() => abortController.abort, options.timeoutMs);
    }

    const { item: worker, release } = await this.#workers.requestOne(abortSignal);
    clearTimeout(timeout);
    try {
      await worker.pushWalState();
      return await fn(worker);
    } finally {
      release();
    }
  }

  readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.#withWorker(async (worker) => {
      return await fn(worker);
    }, options);
  }

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

  writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.#writeLock.runExclusive(() => {
      return this.#withWorker(async (worker) => {
        try {
          return await fn(worker);
        } finally {
          const changes = await worker.takeWalChanges();
          applyWalChanges(this.#walState, changes);

          if (changes.walEnd > 4096 * 128) {
            // Checkpoint. This can't run concurrently to anything else, so acquire remaining workers.
            const remainingWorkers = this.#workers.size - 1;
            if (remainingWorkers) {
              const { release } = await this.#workers.requestPermits(this.#workers.size - 1);
              this.#checkpoint();
              release();
            } else {
              this.#checkpoint();
            }
          } else {
            for (const otherWorker of this.#rawWorkers) {
              if (otherWorker !== worker) {
                otherWorker.addChanges(changes);
              }
            }
          }
        }
      }, options);
    });
  }

  async refreshSchema(): Promise<void> {
    const { items, release } = await this.#workers.requestAll();
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

  async close(): Promise<void> {
    const { release } = await this.#workers.requestAll();
    for (const worker of this.#rawWorkers) {
      worker.close();
    }

    release();
  }
}

class PoolWorker extends LockContext {
  #buffers: WriteAheadBuffers;
  #worker: Worker;
  #server: Comlink.Remote<DatabaseServer>;
  #isInitialized = false;
  #outstandingChanges: WalIndexChange | null = null;

  constructor(buffers: WriteAheadBuffers) {
    super();
    this.#buffers = buffers;
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
      await this.#server.open(this.#buffers);
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

  close() {
    this.#worker.terminate();
  }
}
