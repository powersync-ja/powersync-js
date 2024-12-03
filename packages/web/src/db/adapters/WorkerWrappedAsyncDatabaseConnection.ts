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
};

/**
 * Wraps a provided instance of {@link AsyncDatabaseConnection}, providing necessary proxy
 * functions for worker listeners.
 */
export class WorkerWrappedAsyncDatabaseConnection<Config extends ResolvedWebSQLOpenOptions = ResolvedWebSQLOpenOptions>
  implements AsyncDatabaseConnection
{
  constructor(protected options: WrappedWorkerConnectionOptions<Config>) {}

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
    await this.baseConnection.close();
    this.options.remote[Comlink.releaseProxy]();
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
