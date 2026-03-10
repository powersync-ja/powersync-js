import { ILogger } from '@powersync/common';
import { ConcurrentSqliteConnection } from './ConcurrentConnection.js';

/**
 * Access to a WA-sqlite connection that can be shared with multiple clients sending queries over an RPC protocol built
 * with the Comlink package.
 */
export class DatabaseServer {
  // Using private properties to ensure they're not serialized through Comlink when sharing this class.
  #inner: ConcurrentSqliteConnection;
  #nextClientId = 0;
  #activeClients = new Set<number>();
  #logger: ILogger;
  #onClose: () => void;

  constructor(inner: ConcurrentSqliteConnection, logger: ILogger, onClose: () => void) {
    this.#inner = inner;
    this.#logger = logger;
    this.#onClose = onClose;
  }

  /**
   * Called by clients when they wish to connect to this database.
   *
   * @param lockName A lock that is currently held by the client. When the lock is returned, we know the client is gone
   * and that we need to clean up resources.
   */
  async connect(lockName: string): Promise<ClientConnectionView> {
    let isOpen = true;
    const clientId = this.#nextClientId++;
    const server = this;

    async function close() {
      if (isOpen) {
        isOpen = false;
        server.#logger.debug(`Close requested from client ${clientId} of ${[...server.#activeClients]}`);
        server.#activeClients.delete(clientId);

        if (server.#activeClients.size == 0) {
          await server.forceClose();
        } else {
          server.#logger.debug('Keeping underlying connection active since its used by other clients.');
        }
      }
    }

    navigator.locks!.request(lockName, {}, () => {
      close();
    });

    return {
      close
    };
  }

  async forceClose() {
    this.#logger.debug(`Closing connection to ${this.#inner.options}.`);
    const connection = this.#inner;
    this.#onClose();
    await connection.close();
  }
}

export interface ClientConnectionView {
  close(): Promise<void>;
}
