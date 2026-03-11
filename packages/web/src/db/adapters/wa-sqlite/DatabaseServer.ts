import { ILogger } from '@powersync/common';
import { ConcurrentSqliteConnection, ConnectionLeaseToken } from './ConcurrentConnection.js';
import { RawQueryResult } from './RawSqliteConnection.js';

export interface DatabaseServerOptions {
  inner: ConcurrentSqliteConnection;
  onClose: () => void;
  logger: ILogger;
}

/**
 * Access to a WA-sqlite connection that can be shared with multiple clients sending queries over an RPC protocol built
 * with the Comlink package.
 */
export class DatabaseServer {
  #options: DatabaseServerOptions;
  #nextClientId = 0;
  #activeClients = new Set<number>();

  // TODO: Don't use a broadcast channel for connections managed by a shared worker.
  #updateBroadcastChannel: BroadcastChannel;
  #clientTableListeners = new Set<(tables: string[]) => void>();

  constructor(options: DatabaseServerOptions) {
    this.#options = options;
    const inner = options.inner;
    this.#updateBroadcastChannel = new BroadcastChannel(`${inner.options.dbFilename}-table-updates`);

    this.#updateBroadcastChannel.onmessage = ({ data }) => {
      const changedTables = data as string[];
      for (const listener of this.#clientTableListeners) {
        listener(changedTables);
      }
    };
  }

  get #inner() {
    return this.#options.inner;
  }

  get #logger() {
    return this.#options.logger;
  }

  /**
   * Called by clients when they wish to connect to this database.
   *
   * @param lockName A lock that is currently held by the client. When the lock is returned, we know the client is gone
   * and that we need to clean up resources.
   */
  async connect(lockName?: string): Promise<ClientConnectionView> {
    let isOpen = true;
    const clientId = this.#nextClientId++;

    let connectionLeases = new Map<string, ConnectionLeaseToken>();
    let currentTableListener: ((tables: string[]) => void) | undefined;

    function requireOpen() {
      if (!isOpen) {
        throw new Error('Client has already been closed');
      }
    }

    function requireOpenAndLease(lease: string): ConnectionLeaseToken {
      requireOpen();
      const token = connectionLeases.get(lease);
      if (!token) {
        throw new Error('Attempted to use a connection lease that has already been returned.');
      }

      return token;
    }

    const close = async () => {
      if (isOpen) {
        isOpen = false;

        this.#logger.debug(`Close requested from client ${clientId} of ${[...this.#activeClients]}`);

        // If the client holds a connection lease it hasn't returned, return that now.
        for (const value of connectionLeases.values()) {
          this.#logger.debug(`Closing connection lease that hasn't been returned.`);
          await value.returnLease();
        }

        this.#activeClients.delete(clientId);

        if (this.#activeClients.size == 0) {
          await this.forceClose();
        } else {
          this.#logger.debug('Keeping underlying connection active since its used by other clients.');
        }
      }
    };

    if (lockName) {
      navigator.locks!.request(lockName, {}, () => {
        close();
      });
    }

    return {
      close,
      requestAccess: async (timeoutMs) => {
        requireOpen();
        // TODO: Support timeouts, they don't seem to be supported by the async-mutex package.
        const lease = await this.#inner.acquireConnection();
        const token = crypto.randomUUID();
        connectionLeases.set(token, lease);
        return token;
      },
      completeAccess: async (token) => {
        const lease = connectionLeases.get(token);
        if (lease && isOpen) {
          connectionLeases.delete(token);

          const { resultSet } = await lease.use((conn) => conn.execute(`SELECT powersync_update_hooks('get')`));
          if (resultSet) {
            const updatedTables: string[] = JSON.parse(resultSet.rows[0][0] as string);
            if (updatedTables.length) {
              // We will receive this broadcast message as well, and update listeners in that handler.
              this.#updateBroadcastChannel.postMessage(updatedTables);
            }
          }
          await lease.returnLease();
        }
      },
      execute: async (token, sql, params) => {
        const lease = requireOpenAndLease(token);
        return await lease.use((db) => db.execute(sql, params));
      },
      executeBatch: async (token, sql, params) => {
        const lease = requireOpenAndLease(token);
        return await lease.use((db) => db.executeBatch(sql, params));
      },
      setUpdateListener: async (listener) => {
        if (currentTableListener) {
          this.#clientTableListeners.delete(currentTableListener);
        }

        currentTableListener = listener;
        if (listener) {
          this.#clientTableListeners.add(listener);
        }
      }
    };
  }

  async forceClose() {
    this.#logger.debug(`Closing connection to ${this.#inner.options}.`);
    const connection = this.#inner;
    this.#options.onClose();
    this.#updateBroadcastChannel.close();
    await connection.close();
  }
}

export interface ClientConnectionView {
  close(): Promise<void>;
  /**
   * Requests exclusive access to this database connection.
   *
   * Returns a token that can be used with the query methods. It must be returned with {@link completeAccess} to
   * give other clients access to the database afterwards.
   */
  requestAccess(timeoutMs?: number): Promise<string>;
  execute(token: string, sql: string, params: any[] | undefined): Promise<RawQueryResult>;
  executeBatch(token: string, sql: string, params: any[][]): Promise<RawQueryResult[]>;
  completeAccess(token: string): Promise<void>;

  /**
   * Invokes a callback for table changes.
   *
   * Only a single listener can be set per connection, clients should forward changes to multiple listeners on their
   * end.
   */
  setUpdateListener(listener: ((tables: string[]) => void) | undefined): Promise<void>;
}
