import * as Comlink from 'comlink';
import {
  AsyncDatabaseConnection,
  OnTableChangeCallback,
  OpenAsyncDatabaseConnection,
  ProxiedQueryResult
} from './AsyncDatabaseConnection';
import { ResolvedWebSQLOpenOptions } from './web-sql-flags';

export type SharedConnectionWorker = {
  identifier: string;
  port: MessagePort;
};

export type WrappedWorkerConnectionOptions<Config extends ResolvedWebSQLOpenOptions = ResolvedWebSQLOpenOptions> = {
  baseConnection: AsyncDatabaseConnection;
  identifier: string;
  /**
   * Need a remote in order to keep a reference to the Proxied worker
   */
  remote: Comlink.Remote<OpenAsyncDatabaseConnection<Config>>;
  onClose?: () => void;
};

/**
 * Wraps a provided instance of {@link AsyncDatabaseConnection}, providing necessary proxy
 * functions for worker listeners.
 */
export class WorkerWrappedAsyncDatabaseConnection<Config extends ResolvedWebSQLOpenOptions = ResolvedWebSQLOpenOptions>
  implements AsyncDatabaseConnection
{
  protected lockAbortController: AbortController;

  constructor(protected options: WrappedWorkerConnectionOptions<Config>) {
    this.lockAbortController = new AbortController();
  }

  protected get baseConnection() {
    return this.options.baseConnection;
  }

  init(): Promise<void> {
    return this.baseConnection.init();
  }

  /**
   * Get a MessagePort which can be used to share the internals of this connection.
   */
  async shareConnection(): Promise<SharedConnectionWorker> {
    const { identifier, remote } = this.options;
    /**
     * Hold a navigator lock in order to avoid features such as Chrome's frozen tabs,
     * or Edge's sleeping tabs from pausing the thread for this connection.
     * This promise resolves once a lock is obtained.
     * This lock will be held as long as this connection is open.
     * The `shareConnection` method should not be called on multiple tabs concurrently.
     */
    await new Promise<void>((resolve, reject) =>
      navigator.locks
        .request(
          `shared-connection-${this.options.identifier}`,
          {
            signal: this.lockAbortController.signal
          },
          async () => {
            resolve();

            // Free the lock when the connection is already closed.
            if (this.lockAbortController.signal.aborted) {
              return;
            }

            // Hold the lock while the shared connection is in use.
            await new Promise<void>((releaseLock) => {
              this.lockAbortController.signal.addEventListener('abort', () => {
                releaseLock();
              });
            });
          }
        )
        // We aren't concerned with abort errors here
        .catch((ex) => {
          if (ex.name == 'AbortError') {
            resolve();
          } else {
            reject(ex);
          }
        })
    );

    const newPort = await remote[Comlink.createEndpoint]();
    return { port: newPort, identifier };
  }

  /**
   * Registers a table change notification callback with the base database.
   * This can be extended by custom implementations in order to handle proxy events.
   */
  async registerOnTableChange(callback: OnTableChangeCallback) {
    return this.baseConnection.registerOnTableChange(Comlink.proxy(callback));
  }

  async close(): Promise<void> {
    // Abort any pending lock requests.
    this.lockAbortController.abort();
    await this.baseConnection.close();
    this.options.remote[Comlink.releaseProxy]();
    this.options.onClose?.();
  }

  execute(sql: string, params?: any[]): Promise<ProxiedQueryResult> {
    return this.baseConnection.execute(sql, params);
  }

  executeBatch(sql: string, params?: any[]): Promise<ProxiedQueryResult> {
    return this.baseConnection.executeBatch(sql, params);
  }

  getConfig(): Promise<ResolvedWebSQLOpenOptions> {
    return this.baseConnection.getConfig();
  }
}
