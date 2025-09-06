import * as Comlink from 'comlink';
import {
  ManualSharedSyncPayload,
  SharedSyncClientEvent,
  SharedSyncImplementation,
  SharedSyncInitOptions,
  WrappedSyncPort
} from './SharedSyncImplementation';
import { ILogLevel, PowerSyncConnectionOptions, SubscribedStream, SyncStatusOptions } from '@powersync/common';

/**
 * A client to the shared sync worker.
 *
 * The shared sync implementation needs a per-client view of subscriptions so that subscriptions of closed tabs can
 * automatically be evicted later.
 */
export class WorkerClient {
  private resolvedPort: WrappedSyncPort | null = null;

  constructor(
    private readonly sync: SharedSyncImplementation,
    private readonly port: MessagePort
  ) {}

  async initialize() {
    /**
     * Adds an extra listener which can remove this port
     * from the list of monitored ports.
     */
    this.port.addEventListener('message', async (event) => {
      const payload = event.data as ManualSharedSyncPayload;
      if (payload?.event == SharedSyncClientEvent.CLOSE_CLIENT) {
        const release = await this.sync.removePort(this.port);
        this.port.postMessage({
          event: SharedSyncClientEvent.CLOSE_ACK,
          data: {}
        } satisfies ManualSharedSyncPayload);
        release?.();
      }
    });

    this.resolvedPort = await this.sync.addPort(this.port);
    Comlink.expose(this, this.port);
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
      this.sync.updateSubscriptions;
    }
  }

  disconnect() {
    return this.sync.disconnect();
  }

  async _testUpdateAllStatuses(status: SyncStatusOptions) {
    return this.sync._testUpdateAllStatuses(status);
  }
}
