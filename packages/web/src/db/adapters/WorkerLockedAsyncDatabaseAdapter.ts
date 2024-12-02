import * as Comlink from 'comlink';
import { AsyncDatabaseConnection } from './AsyncDatabaseConnection';
import { LockedAsyncDatabaseAdapter, LockedAsyncDatabaseAdapterOptions } from './LockedAsyncDatabaseAdapter';
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
    super(options);
    this._messagePort = options.messagePort;
  }

  /**
   * Registers a table change notification callback with the base database.
   * This can be extended by custom implementations in order to handle proxy events.
   */
  protected async registerOnChangeListener(db: AsyncDatabaseConnection) {
    this._disposeTableChangeListener = await db.registerOnTableChange(
      Comlink.proxy((event) => {
        this.iterateListeners((cb) => cb.tablesUpdated?.(event));
      })
    );
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
