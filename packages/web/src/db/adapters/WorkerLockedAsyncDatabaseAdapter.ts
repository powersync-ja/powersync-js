import * as Comlink from 'comlink';
import { LockedAsyncDatabaseAdapter, LockedAsyncDatabaseAdapterOptions } from './LockedAsyncDatabaseAdapter';
import { ProxiedAsyncDatabaseConnection } from './ProxiedAsyncDatabaseConnection';
import { WorkerDBAdapter } from './WorkerDBAdapter';
/**
 * @internal
 */
export interface WorkerLockedAsyncDatabaseAdapterOptions extends LockedAsyncDatabaseAdapterOptions {
  messagePort: Worker | MessagePort;
}

export class WorkerLockedAsyncDatabaseAdapter extends LockedAsyncDatabaseAdapter implements WorkerDBAdapter {
  /**
   * Keep a reference to the worker port so that it can be shared
   */
  private _messagePort: Worker | MessagePort;

  constructor(options: WorkerLockedAsyncDatabaseAdapterOptions) {
    super({
      ...options,
      openConnection: async () => {
        // Proxy any worker functions
        return ProxiedAsyncDatabaseConnection(await options.openConnection());
      }
    });
    this._messagePort = options.messagePort;
  }

  async getMessagePort(): Promise<MessagePort> {
    if (this._messagePort instanceof Worker) {
      // We can't transfer a Worker instance, need a MessagePort
      // Comlink provides a nice utility for exposing a MessagePort
      // from a Worker
      const temp = Comlink.wrap(this._messagePort);
      const newPort = await temp[Comlink.createEndpoint]();
      return newPort;
    }

    return this._messagePort;
  }
}
