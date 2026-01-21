import { ILogLevel, PowerSyncConnectionOptions, SubscribedStream } from '@powersync/common';
import * as Comlink from 'comlink';
import { getNavigatorLocks } from '../../shared/navigator.js';
import {
  ManualSharedSyncPayload,
  SharedSyncClientEvent,
  SharedSyncImplementation,
  SharedSyncInitOptions,
  WrappedSyncPort
} from './SharedSyncImplementation.js';

/**
 * A client to the shared sync worker.
 *
 * The shared sync implementation needs a per-client view of subscriptions so that subscriptions of closed tabs can
 * automatically be evicted later.
 */
export class WorkerClient {
  private resolvedPort: WrappedSyncPort | null = null;
  protected resolvedPortPromise: Promise<WrappedSyncPort> | null = null;

  constructor(
    private readonly sync: SharedSyncImplementation,
    private readonly port: MessagePort
  ) {
    Comlink.expose(this, this.port);
    /**
     * Adds an extra listener which can remove this port
     * from the list of monitored ports.
     */
    this.port.addEventListener('message', async (event) => {
      const payload = event.data as ManualSharedSyncPayload;
      if (payload?.event == SharedSyncClientEvent.CLOSE_CLIENT) {
        await this.removePort();
      }
    });
  }

  private async removePort() {
    if (this.resolvedPort) {
      const resolved = this.resolvedPort;
      this.resolvedPort = null;
      const release = await this.sync.removePort(resolved);
      this.resolvedPort = null;
      this.port.postMessage({
        event: SharedSyncClientEvent.CLOSE_ACK,
        data: {}
      } satisfies ManualSharedSyncPayload);
      release?.();
    }
  }

  /**
   * Called by a client after obtaining a lock with a random name.
   *
   * When the client tab is closed, its lock will be returned. So when the shared worker attempts to acquire the lock,
   * it can consider the connection to be closed.
   */
  async addLockBasedCloseSignal(name: string) {
    // Only add the port once the lock has been obtained on the client.
    this.resolvedPort = await this.sync.addPort(this.port);
    // Don't await this lock request
    getNavigatorLocks().request(name, async () => {
      await this.removePort();
    });
  }

  setLogLevel(level: ILogLevel) {
    this.sync.setLogLevel(level);
  }

  triggerCrudUpload() {
    return this.sync.triggerCrudUpload();
  }

  setParams(params: SharedSyncInitOptions, subscriptions: SubscribedStream[]) {
    this.resolvedPort!.currentSubscriptions = subscriptions;
    return this.sync.setParams(params);
  }

  getWriteCheckpoint() {
    return this.sync.getWriteCheckpoint();
  }

  hasCompletedSync() {
    return this.sync.hasCompletedSync();
  }

  connect(options?: PowerSyncConnectionOptions) {
    return this.sync.connect(options);
  }

  updateSubscriptions(subscriptions: SubscribedStream[]) {
    if (this.resolvedPort) {
      this.sync.updateSubscriptions(this.resolvedPort, subscriptions);
    }
  }

  disconnect() {
    return this.sync.disconnect();
  }
}
