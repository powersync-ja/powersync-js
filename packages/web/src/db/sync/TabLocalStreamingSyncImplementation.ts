import {
  LockOptions,
  LockType,
  SubscribedStream,
  SyncStatusJson,
  SyncStatusSnapshot
} from '@powersync/shared-internals';
import {
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from './WebStreamingSyncImplementation.js';

/**
 * When multi-tab support is disabled and we don't use a shared worker for sync, only a single tab will be able to
 * acquire the sync navigator lock and start a sync iteration.
 *
 * To be able to provide _some_ multi-tab support in that configuration, this utility:
 *
 * 1. Sends sync status updates from the syncing tab to others.
 * 2. Allows other tabs to send notifications when their active sync stream subscriptions update, allowing the active
 *    tab to take those subscriptions into account.
 */
export class TabLocalStreamingSyncImplementation extends WebStreamingSyncImplementation {
  #statusUpdated: BroadcastChannel;
  #subscriptionsChanged: BroadcastChannel;
  #hasSyncLock = false;

  constructor(options: WebStreamingSyncImplementationOptions) {
    super(options);

    const identifier = options.identifier;
    this.#statusUpdated = new BroadcastChannel(`sync-status-${identifier}`);
    this.#subscriptionsChanged = new BroadcastChannel(`subscription-change-${identifier}`);

    this.#statusUpdated.onmessage = (event) => {
      if (event.data == 'ping') {
        this.#sendStatus(this.syncStatus);
        return;
      }

      const { core, dataFlow } = event.data as SyncStatusJson;
      this.updateSyncStatus(core, dataFlow);
    };

    // Request other tabs to share their sync status.
    this.#statusUpdated.postMessage('ping');
    this.#subscriptionsChanged.onmessage = () => {
      // We can't update activeStreams since we don't know when another tab referencing them is closed. However,
      // clients will update an internal table listing streams after subscribing, and updateSubscriptions() will
      // scan that table.
      super.updateSubscriptions(this.activeStreams);
    };

    this.registerListener({
      statusChanged: (status) => this.#sendStatus(status)
    });
  }

  #sendStatus(status: SyncStatusSnapshot) {
    // Don't share sync status if this is not the tab currently syncing.
    if (this.#hasSyncLock) {
      this.#statusUpdated.postMessage(status.toJSON());
    }
  }

  override updateSubscriptions(subscriptions: SubscribedStream[]): void {
    super.updateSubscriptions(subscriptions);
    this.#subscriptionsChanged.postMessage('');
  }

  override obtainLock<T>({ callback, type, signal }: LockOptions<T>): Promise<T> {
    const wrappedCallback = async (): Promise<T> => {
      this.#hasSyncLock = true;

      try {
        return await callback();
      } finally {
        this.#hasSyncLock = false;
      }
    };

    return super.obtainLock({ callback: type == LockType.SYNC ? wrappedCallback : callback, type, signal });
  }

  override async dispose(): Promise<void> {
    this.#statusUpdated.close();
    this.#subscriptionsChanged.close();
    await super.dispose();
  }
}
