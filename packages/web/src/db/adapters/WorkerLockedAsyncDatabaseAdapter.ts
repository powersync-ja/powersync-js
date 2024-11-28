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

  getMessagePort(): MessagePort | Worker {
    return this._messagePort;
  }
}
