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
  remoteCanCloseUnexpectedly: boolean;
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
  protected lockAbortController = new AbortController();
  protected notifyRemoteClosed: AbortController | undefined;

  constructor(protected options: WrappedWorkerConnectionOptions<Config>) {
    if (options.remoteCanCloseUnexpectedly) {
      this.notifyRemoteClosed = new AbortController();
    }
  }

  protected get baseConnection() {
    return this.options.baseConnection;
  }

  init(): Promise<void> {
    return this.baseConnection.init();
  }

  /**
   * Marks the remote as closed.
   *
   * This can sometimes happen outside of our control, e.g. when a shared worker requests a connection from a tab. When
   * it happens, all methods on the {@link baseConnection} would never resolve. To avoid livelocks in this scenario, we
   * throw on all outstanding promises and forbid new calls.
   */
  markRemoteClosed() {
    // Can non-null assert here because this function is only supposed to be called when remoteCanCloseUnexpectedly was
    // set.
    this.notifyRemoteClosed!.abort();
  }

  private withRemote<T>(inner: () => Promise<T>): Promise<T> {
    const controller = this.notifyRemoteClosed;
    if (controller) {
      return new Promise((resolve, reject) => {
        if (controller.signal.aborted) {
          reject(new Error('Called operation on closed remote'));
        }

        function handleAbort() {
          reject(new Error('Remote peer closed with request in flight'));
        }

        function markResolved(inner: () => void) {
          controller!.signal.removeEventListener('abort', handleAbort);
          inner();
        }

        controller.signal.addEventListener('abort', handleAbort);

        inner()
          .then((data) => markResolved(() => resolve(data)))
          .catch((e) => markResolved(() => reject(e)));
      });
    } else {
      // Can't close, so just return the inner promise unguarded.
      return inner();
    }
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
          `shared-connection-${this.options.identifier}-${Date.now()}-${Math.round(Math.random() * 10000)}`,
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
    this.options.remote[Comlink.releaseProxy]();
    this.options.onClose?.();
    await this.baseConnection.close();
  }

  execute(sql: string, params?: any[]): Promise<ProxiedQueryResult> {
    return this.withRemote(() => this.baseConnection.execute(sql, params));
  }

  executeRaw(sql: string, params?: any[]): Promise<any[][]> {
    return this.withRemote(() => this.baseConnection.executeRaw(sql, params));
  }

  executeBatch(sql: string, params?: any[]): Promise<ProxiedQueryResult> {
    return this.withRemote(() => this.baseConnection.executeBatch(sql, params));
  }

  getConfig(): Promise<ResolvedWebSQLOpenOptions> {
    return this.withRemote(() => this.baseConnection.getConfig());
  }
}
