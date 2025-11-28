import { ILogLevel, PowerSyncConnectionOptions, SubscribedStream, SyncStatusOptions } from '@powersync/common';
import * as Comlink from 'comlink';
import { getNavigatorLocks } from '../../shared/navigator';
import {
  ManualSharedSyncPayload,
  SharedSyncClientEvent,
  SharedSyncImplementation,
  SharedSyncInitOptions,
  WrappedSyncPort
} from './SharedSyncImplementation';

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
  }

  async initialize() {
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

    /**
     * Keep a reference to the resolved port promise.
     * The init timing is difficult to predict due to the async message passing.
     * We only want to use a port if we are know it's been protected from being closed.
     * The lock based close signal will be added asynchronously. We need to use the
     * added port once the lock is configured.
     */
    this.resolvedPortPromise = this.sync.addPort(this.port);
    this.resolvedPort = await this.resolvedPortPromise;
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
  addLockBasedCloseSignal(name: string) {
    if (!this.resolvedPortPromise) {
      // The init logic above is actually synchronous, so this should not happen.
      this.sync.broadCastLogger.warn('addLockBasedCloseSignal called before port promise registered');
    } else {
      this.resolvedPortPromise.then((wrappedPort) => {
        /**
         * The client registered a navigator lock. We now can guarantee detecting if the client has closed.
         * E.g. before this point: It's possible some ports might have been created and closed before the
         * lock based close signal is added. We should not trust those ports.
         */
        wrappedPort.isProtectedFromClose = true;
      });
    }
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

  async _testUpdateAllStatuses(status: SyncStatusOptions) {
    return this.sync._testUpdateAllStatuses(status);
  }
}
