import * as Comlink from 'comlink';
import { AsyncDatabaseConnection, OnTableChangeCallback, ProxiedQueryResult } from './AsyncDatabaseConnection';

export type SharedConnectionWorker = {
  identifier: string;
  port: MessagePort;
};

export type WrappedWorkerConnectionOptions = {
  baseConnection: AsyncDatabaseConnection;
  identifier: string;
  worker: Worker | MessagePort;
};

/**
 * Wraps a provided instance of {@link AsyncDatabaseConnection}, providing necessary proxy
 * functions for worker listeners.
 */
export class WorkerWrappedAsyncDatabaseConnection implements AsyncDatabaseConnection {
  constructor(protected options: WrappedWorkerConnectionOptions) {}

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
    const { identifier, worker } = this.options;
    if (worker instanceof Worker) {
      // We can't transfer a Worker instance, need a MessagePort
      // Comlink provides a nice utility for exposing a MessagePort
      // from a Worker
      const temp = Comlink.wrap(worker);
      const newPort = await temp[Comlink.createEndpoint]();
      return { port: newPort, identifier };
    }

    return {
      identifier: identifier,
      port: worker
    };
  }

  /**
   * Registers a table change notification callback with the base database.
   * This can be extended by custom implementations in order to handle proxy events.
   */
  async registerOnTableChange(callback: OnTableChangeCallback) {
    return this.baseConnection.registerOnTableChange(Comlink.proxy(callback));
  }

  close(): Promise<void> {
    return this.baseConnection.close();
  }

  execute(sql: string, params?: any[]): Promise<ProxiedQueryResult> {
    return this.baseConnection.execute(sql, params);
  }

  executeBatch(sql: string, params?: any[]): Promise<ProxiedQueryResult> {
    return this.baseConnection.executeBatch(sql, params);
  }
}
