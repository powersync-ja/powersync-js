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
  #clientTableListeners = new Set<MessagePort>();

  constructor(options: DatabaseServerOptions) {
    this.#options = options;
    const inner = options.inner;
    this.#updateBroadcastChannel = new BroadcastChannel(`${inner.options.dbFilename}-table-updates`);

    this.#updateBroadcastChannel.onmessage = ({ data }) => {
      this.#pushTableUpdateToClients(data as string[]);
    };
  }

  #pushTableUpdateToClients(changedTables: string[]) {
    for (const listener of this.#clientTableListeners) {
      listener.postMessage(changedTables);
    }
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
    this.#activeClients.add(clientId);

    let connectionLeases = new Map<string, { lease: ConnectionLeaseToken; write: boolean }>();
    let currentTableListener: MessagePort | undefined;

    function requireOpen() {
      if (!isOpen) {
        throw new Error('Client has already been closed');
      }
    }

    function requireOpenAndLease(lease: string) {
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

        if (currentTableListener) {
          this.#clientTableListeners.delete(currentTableListener);
        }

        // If the client holds a connection lease it hasn't returned, return that now.
        for (const { lease } of connectionLeases.values()) {
          this.#logger.debug(`Closing connection lease that hasn't been returned.`);
          await lease.returnLease();
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
      debugIsAutoCommit: async () => {
        return this.#inner.unsafeUseInner().isAutoCommit();
      },
      requestAccess: async (write, timeoutMs) => {
        requireOpen();

        const lease = await this.#inner.acquireConnection(
          timeoutMs != null ? AbortSignal.timeout(timeoutMs) : undefined
        );
        if (!isOpen) {
          // Race between requestAccess and close(), the connection was closed while we tried to acquire a lease.
          await lease.returnLease();
          return requireOpen() as never;
        }

        const token = crypto.randomUUID();
        connectionLeases.set(token, { lease, write });
        return token;
      },
      completeAccess: async (token) => {
        const lease = requireOpenAndLease(token);
        connectionLeases.delete(token);

        try {
          if (lease.write) {
            // Collect update hooks invoked while the client had the write connection.
            const { resultSet } = await lease.lease.use((conn) => conn.execute(`SELECT powersync_update_hooks('get')`));
            if (resultSet) {
              const updatedTables: string[] = JSON.parse(resultSet.rows[0][0] as string);
              if (updatedTables.length) {
                this.#updateBroadcastChannel.postMessage(updatedTables);
                this.#pushTableUpdateToClients(updatedTables);
              }
            }
          }
        } finally {
          await lease.lease.returnLease();
        }
      },
      execute: async (token, sql, params) => {
        const { lease } = requireOpenAndLease(token);
        return await lease.use((db) => db.execute(sql, params));
      },
      executeBatch: async (token, sql, params) => {
        const { lease } = requireOpenAndLease(token);
        return await lease.use((db) => db.executeBatch(sql, params));
      },
      setUpdateListener: async (listener) => {
        requireOpen();
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
   * Only used for testing purposes.
   */
  debugIsAutoCommit(): Promise<boolean>;
  /**
   * Requests exclusive access to this database connection.
   *
   * Returns a token that can be used with the query methods. It must be returned with {@link completeAccess} to
   * give other clients access to the database afterwards.
   */
  requestAccess(write: boolean, timeoutMs?: number): Promise<string>;
  execute(token: string, sql: string, params: any[] | undefined): Promise<RawQueryResult>;
  executeBatch(token: string, sql: string, params: any[][]): Promise<RawQueryResult[]>;
  completeAccess(token: string): Promise<void>;

  /**
   * Sends update notifications to the given message port.
   *
   * Update notifications are posted as a `string[]` message.
   */
  setUpdateListener(listener: MessagePort): Promise<void>;
}
