import { Mutex, type MutexInterface } from 'async-mutex';
import { RawSqliteConnection } from './RawSqliteConnection.js';
import { ResolvedWASQLiteOpenFactoryOptions } from './WASQLiteOpenFactory.js';

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
   * An outer mutex ensuring at most one {@link ConnectionLeaseToken} can exist for this connection at a time.
   *
   * If null, we'll use navigator locks instead.
   */
  private leaseMutex: Mutex | null;

  /**
   * @param needsNavigatorLocks Whether access to the database needs an additional navigator lock guard.
   *
   * While {@link ConcurrentSqliteConnection} prevents concurrent access to a database _connection_, it's possible we
   * might have multiple connections to the same physical database (e.g. if multiple tabs use dedicated workers).
   * In those setups, we use navigator locks instead of an internal mutex to guard access..
   */
  constructor(
    private readonly inner: RawSqliteConnection,
    needsNavigatorLocks: boolean
  ) {
    // The inner connection should already be initialized, fail early if it's not.
    inner.requireSqlite();
    this.leaseMutex = needsNavigatorLocks ? null : new Mutex();
  }

  get options(): ResolvedWASQLiteOpenFactoryOptions {
    return this.inner.options;
  }

  private acquireMutex(abort?: AbortSignal): Promise<MutexInterface.Releaser> {
    if (this.leaseMutex) {
      return this.leaseMutex.acquire();
    }

    return new Promise((resolve, reject) => {
      const options: LockOptions = { signal: abort };

      navigator.locks
        .request(`db-access-lock-${this.options.dbFilename}`, options, (_) => {
          return new Promise<void>((returnLock) => resolve(returnLock));
        })
        .catch(reject);
    });
  }

  // Unsafe, unguarded access to the SQLite connection.
  unsafeUseInner(): RawSqliteConnection {
    return this.inner;
  }

  /**
   * @returns A {@link ConnectionLeaseToken}. Until that token is returned, no other client can use the database.
   */
  async acquireConnection(): Promise<ConnectionLeaseToken> {
    const returnMutex = await this.acquireMutex();
    const token = new ConnectionLeaseToken(returnMutex, this.inner);

    try {
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

  async close(): Promise<void> {
    const returnMutex = await this.acquireMutex();
    try {
      await this.inner.close();
    } finally {
      returnMutex();
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
    private returnMutex: MutexInterface.Releaser,
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
