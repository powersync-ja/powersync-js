import { Mutex, type MutexInterface } from 'async-mutex';
import { RawSqliteConnection } from './RawSqliteConnection.js';
import { ResolvedWASQLiteOpenFactoryOptions } from './WASQLiteOpenFactory.js';

/**
 * A wrapper around a {@link RawSqliteConnection} allowing multiple tabs to access it.
 *
 * To allow potentially concurrent accesses from different clients, this requires a local mutex implementation here.
 *
 * Note that instances of this class are not safe to proxy across context boundaries with comlink! We need to be able to
 * rely on mutexes being returned properly, so additional checks to detect say a client tab closing are required to
 * avoid deadlocks.
 */
export class ConcurrentSqliteConnection {
  /** An outer mutex ensuring at most one {@link ConnectionLeaseToken} can exist for this connection at a time.  */
  private leaseMutex = new Mutex();

  constructor(private readonly inner: RawSqliteConnection) {
    // The inner connection should already be initialized, fail early if it's not.
    inner.requireSqlite();
  }

  get options(): ResolvedWASQLiteOpenFactoryOptions {
    return this.inner.options;
  }

  /**
   * @returns A {@link ConnectionLeaseToken}. Until that token is returned, no other client can use the database.
   */
  async acquireConnection(): Promise<ConnectionLeaseToken> {
    const returnMutex = await this.leaseMutex.acquire();
    const token = new ConnectionLeaseToken(returnMutex);

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
    const returnMutex = await this.leaseMutex.acquire();
    await this.inner.close();
    returnMutex();
  }
}

class ConnectionLeaseToken {
  /** Ensures that the client with access to this token can't run statements concurrently. */
  private useMutex: Mutex = new Mutex();
  private closed = false;

  constructor(private returnMutex: MutexInterface.Releaser) {}

  /**
   * Returns this lease, allowing another client to use the database connection.
   */
  async returnLease() {
    await this.useMutex.runExclusive(async () => {
      if (!closed) {
        closed = true;
        this.returnMutex();
      }
    });
  }
}
