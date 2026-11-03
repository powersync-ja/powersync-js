import { Mutex, UnlockFn } from '@powersync/shared-internals';
import { RawSqliteConnection, RawWaSqliteDatabaseOptions } from './RawSqliteConnection.js';
import type { SimpleOpfsFileSystem } from './SimpleOpfsFileSystem.js';
import { requestNavigatorLock } from '../../../shared/locks.js';

/**
 * A wrapper around a {@link RawSqliteConnection} allowing multiple tabs to access it.
 *
 * To allow potentially concurrent accesses from different clients, this requires a local mutex implementation here.
 *
 * Note that instances of this class are not safe to proxy across context boundaries with comlink! We need to be able to
 * rely on mutexes being returned reliably, so additional checks to detect say a client tab closing are required to
 * avoid deadlocks.
 */
export class ConcurrentSqliteConnection {
  /**
   * The {@link SimpleOpfsFileSystem} used by the inner connection, if any. SQLite closing its files doesn't close the
   * sync access handles of that file system, so we do that after closing the connection.
   */
  simpleOpfsVfs: SimpleOpfsFileSystem | null = null;

  constructor(
    private readonly inner: RawSqliteConnection,
    /**
     * A mutex ensuring at most one {@link ConnectionLeaseToken} can exist for this connection at a time.
     *
     * While {@link ConcurrentSqliteConnection} prevents concurrent access to a database _connection_, it's possible we
     * might have multiple connections to the same physical database (e.g. if multiple tabs use dedicated workers).
     * In those setups, we use navigator locks instead of an internal mutex to guard access.
     */
    private readonly mutex: ConnectionMutex
  ) {}

  get options(): RawWaSqliteDatabaseOptions {
    return this.inner.options;
  }

  acquireMutex(abort?: AbortSignal): Promise<UnlockFn> {
    return this.mutex.acquire(abort);
  }

  // Unsafe, unguarded access to the SQLite connection.
  unsafeUseInner(): RawSqliteConnection {
    return this.inner;
  }

  /**
   * @returns A {@link ConnectionLeaseToken}. Until that token is returned, no other client can use the database.
   */
  async acquireConnection(abort?: AbortSignal): Promise<ConnectionLeaseToken> {
    const returnMutex = await this.acquireMutex(abort);
    const token = new ConnectionLeaseToken(returnMutex, this.inner);

    try {
      // Assert that the inner connection is initialized at this point, fail early if it's not.
      this.inner.requireSqlite();

      // If a previous client was interrupted in the middle of a transaction AND this is a shared worker, it's possible
      // for the connection to still be in a transaction. To avoid inconsistent state, we roll back connection leases
      // that haven't been comitted.
      if (!this.inner.isAutoCommit()) {
        await this.inner.executeRaw('ROLLBACK');
      }
    } catch (e) {
      returnMutex();
      throw e;
    }

    return token;
  }

  /**
   * @param returnMutex If the caller already holds the mutex (from {@link acquireMutex}), the function returning it.
   */
  async close(returnMutex?: UnlockFn): Promise<void> {
    returnMutex ??= await this.acquireMutex();
    try {
      await this.inner.close();
    } finally {
      this.simpleOpfsVfs?.close();
      returnMutex();
    }

    if (this.mutex instanceof LazyNavigatorMutex) {
      // We won't use this connection again, so don't wait for another tab to steal the navigator locks.
      await this.mutex.releaseNavigatorLocks();
    }
  }
}

/**
 * An instance representing temporary exclusive access to a {@link ConcurrentSqliteConnection}.
 */
export class ConnectionLeaseToken {
  /** Ensures that the client with access to this token can't run statements concurrently. */
  private useMutex: Mutex = new Mutex();
  private closed = false;

  constructor(
    private returnMutex: UnlockFn,
    private connection: RawSqliteConnection
  ) {}

  /**
   * Returns this lease, allowing another client to use the database connection.
   */
  async returnLease() {
    await this.useMutex.runExclusive(async () => {
      if (!this.closed) {
        this.closed = true;
        this.returnMutex();
      }
    });
  }

  /**
   * This should only be used internally, since the callback must not use the raw connection after resolving.
   */
  async use<T>(callback: (conn: RawSqliteConnection) => Promise<T>): Promise<T> {
    return await this.useMutex.runExclusive(async () => {
      if (this.closed) {
        throw new Error('lease token has already been closed');
      }

      return await callback(this.connection);
    });
  }
}

export interface ConnectionMutex {
  acquire(signal?: AbortSignal): Promise<UnlockFn>;
}

export class NavigatorMutex implements ConnectionMutex {
  constructor(private readonly name: string) {}

  acquire(signal?: AbortSignal): Promise<UnlockFn> {
    return requestNavigatorLock(this.name, { signal });
  }
}

/**
 * A protocol that only gives up navigator locks when another tab requests them.
 *
 * This is mainly relevant for a {@link SimpleOpfsFileSystem} used without shared workers and without
 * `readwrite-unsafe`, as we have to close sync access handles when another tab wants to use the database. The protocol
 * here works like this:
 *
 * 1. Acquire a temporary lock (to avoid contention, not needed for correctness).
 * 2. Obtain an outer lock, stealing it if necessary.
 * 3. Obtain the inner lock.
 * 4. Release the temporary lock.
 * 5. Run the exclusive operation.
 * 6. Wait for another tab to steal the outer lock from us (as its second step).
 * 7. Close the VFS once we're done with it, and return the inner lock.
 */
export class LazyNavigatorMutex implements ConnectionMutex {
  /**
   * A file system to open after acquiring navigator locks and to close before returning them.
   */
  linkedVfs: SimpleOpfsFileSystem | null = null;

  #outerLockName: string;
  #temporaryLockName: string;

  /**
   * A local mutex guarding access within this context. Requesting it first is cheap, and allows the navigator lock
   * logic to assume exclusive access to {@link LazyNavigatorMutex.#heldNavigatorLocks}.
   */
  #localMutex = new Mutex();
  #heldNavigatorLocks: { outer: UnlockFn; inner: UnlockFn } | null = null;

  constructor(private readonly name: string) {
    this.#outerLockName = `${name}-outer`;
    this.#temporaryLockName = `${name}-tmp`;
  }

  async #acquireNavigatorLocks(signal?: AbortSignal) {
    console.assert(this.#heldNavigatorLocks == null);
    let temporary: UnlockFn | undefined;
    let outer: UnlockFn | undefined;
    let inner: UnlockFn | undefined;

    try {
      // 1. Acquire the temporary lock, so that we don't have multiple tabs stealing the outer lock from each other.
      temporary = await requestNavigatorLock(this.#temporaryLockName, { signal });

      // 2. Request the outer lock, stealing it from another tab if necessary. Abort signals can't be combined with
      // steal, so we don't pass one here.
      outer = await requestNavigatorLock(this.#outerLockName, {
        steal: true,
        onStolen: () => this.#handleOuterLockStolen()
      });

      // 3. Obtain the inner lock. The tab we've stolen the outer lock from will return it once it's done.
      inner = await requestNavigatorLock(this.name, { signal });

      await this.linkedVfs?.open();
      this.#heldNavigatorLocks = { outer, inner };
    } catch (e) {
      // Failed to acquire some locks, ensure they're all released.
      outer?.();
      inner?.();
      throw e;
    } finally {
      // 4. Release the temporary lock.
      temporary?.();
    }
  }

  #handleOuterLockStolen() {
    // Steps 6 and 7.
    this.releaseNavigatorLocks();
  }

  async acquire(signal?: AbortSignal): Promise<UnlockFn> {
    const returnLocalMutex = await this.#localMutex.acquire(signal);
    if (this.#heldNavigatorLocks != null) {
      // We already hold the navigator locks, so we can use the database directly.
      return returnLocalMutex;
    }

    try {
      await this.#acquireNavigatorLocks(signal);
    } catch (e) {
      returnLocalMutex();
      throw e;
    }

    // Step 5: Run the exclusive operation. Steps 6 and 7 run when the outer lock gets stolen from us, a callback
    // reacting to that has been installed at this point.
    return returnLocalMutex;
  }

  /**
   * Closes the linked VFS (if any) and returns navigator locks, if they're currently held.
   */
  async releaseNavigatorLocks(): Promise<void> {
    await this.#localMutex.runExclusive(() => {
      const held = this.#heldNavigatorLocks;
      if (held != null) {
        this.linkedVfs?.close();

        held.outer();
        held.inner();
        this.#heldNavigatorLocks = null;
      }
    });
  }
}
