import { ILogger } from 'js-logger';
import { BaseListener, BaseObserver } from '../utils/BaseObserver.js';
import { PowerSyncBackendConnector } from './connection/PowerSyncBackendConnector.js';
import {
  AdditionalConnectionOptions,
  InternalConnectionOptions,
  StreamingSyncImplementation,
  SubscribedStream
} from './sync/stream/AbstractStreamingSyncImplementation.js';
import {
  SyncStream,
  SyncStreamDescription,
  SyncStreamSubscribeOptions,
  SyncStreamSubscription
} from './sync/sync-streams.js';
import { SyncStatus } from '../db/crud/SyncStatus.js';

/**
 * @internal
 */
export interface ConnectionManagerSyncImplementationResult {
  sync: StreamingSyncImplementation;
  /**
   * Additional cleanup function which is called after the sync stream implementation
   * is disposed.
   */
  onDispose: () => Promise<void> | void;
}

/**
 * The subset of {@link AbstractStreamingSyncImplementationOptions} managed by the connection manager.
 *
 * @internal
 */
export interface CreateSyncImplementationOptions extends AdditionalConnectionOptions {
  subscriptions: SubscribedStream[];
}

export interface InternalSubscriptionAdapter {
  firstStatusMatching(predicate: (status: SyncStatus) => any, abort?: AbortSignal): Promise<void>;
  resolveOfflineSyncStatus(): Promise<void>;
  rustSubscriptionsCommand(payload: any): Promise<void>;
}

/**
 * @internal
 */
export interface ConnectionManagerOptions {
  createSyncImplementation(
    connector: PowerSyncBackendConnector,
    options: CreateSyncImplementationOptions
  ): Promise<ConnectionManagerSyncImplementationResult>;

  logger: ILogger;
}

type StoredConnectionOptions = {
  connector: PowerSyncBackendConnector;
  options: InternalConnectionOptions;
};

/**
 * @internal
 */
export interface ConnectionManagerListener extends BaseListener {
  syncStreamCreated: (sync: StreamingSyncImplementation) => void;
}

/**
 * @internal
 */
export class ConnectionManager extends BaseObserver<ConnectionManagerListener> {
  /**
   * Tracks active connection attempts
   */
  protected connectingPromise: Promise<void> | null;
  /**
   * Tracks actively instantiating a streaming sync implementation.
   */
  protected syncStreamInitPromise: Promise<void> | null;
  /**
   * Active disconnect operation. Calling disconnect multiple times
   * will resolve to the same operation.
   */
  protected disconnectingPromise: Promise<void> | null;
  /**
   * Tracks the last parameters supplied to `connect` calls.
   * Calling `connect` multiple times in succession will result in:
   * - 1 pending connection operation which will be aborted.
   * - updating the last set of parameters while waiting for the pending
   *   attempt to be aborted
   * - internally connecting with the last set of parameters
   */
  protected pendingConnectionOptions: StoredConnectionOptions | null;

  syncStreamImplementation: StreamingSyncImplementation | null;

  /**
   * Additional cleanup function which is called after the sync stream implementation
   * is disposed.
   */
  protected syncDisposer: (() => Promise<void> | void) | null;

  /**
   * Subscriptions managed in this connection manager.
   *
   * On the web, these local subscriptions are merged across tabs by a shared worker.
   */
  private locallyActiveSubscriptions = new Map<string, ActiveSubscription>();

  constructor(protected options: ConnectionManagerOptions) {
    super();
    this.connectingPromise = null;
    this.syncStreamInitPromise = null;
    this.disconnectingPromise = null;
    this.pendingConnectionOptions = null;
    this.syncStreamImplementation = null;
    this.syncDisposer = null;
  }

  get logger() {
    return this.options.logger;
  }

  async close() {
    await this.syncStreamImplementation?.dispose();
    await this.syncDisposer?.();
  }

  async connect(connector: PowerSyncBackendConnector, options: InternalConnectionOptions) {
    // Keep track if there were pending operations before this call
    const hadPendingOptions = !!this.pendingConnectionOptions;

    // Update pending options to the latest values
    this.pendingConnectionOptions = {
      connector,
      options
    };

    // Disconnecting here provides aborting in progress connection attempts.
    // The connectInternal method will clear pending options once it starts connecting (with the options).
    // We only need to trigger a disconnect here if we have already reached the point of connecting.
    // If we do already have pending options, a disconnect has already been performed.
    // The connectInternal method also does a sanity disconnect to prevent straggler connections.
    // We should also disconnect if we have already completed a connection attempt.
    if (!hadPendingOptions || this.syncStreamImplementation) {
      await this.disconnectInternal();
    }

    // Triggers a connect which checks if pending options are available after the connect completes.
    // The completion can be for a successful, unsuccessful or aborted connection attempt.
    // If pending options are available another connection will be triggered.
    const checkConnection = async (): Promise<void> => {
      if (this.pendingConnectionOptions) {
        // Pending options have been placed while connecting.
        // Need to reconnect.
        this.connectingPromise = this.connectInternal()
          .catch(() => {})
          .finally(checkConnection);
        return this.connectingPromise;
      } else {
        // Clear the connecting promise, done.
        this.connectingPromise = null;
        return;
      }
    };

    this.connectingPromise ??= this.connectInternal()
      .catch(() => {})
      .finally(checkConnection);
    return this.connectingPromise;
  }

  protected async connectInternal() {
    let appliedOptions: InternalConnectionOptions | null = null;

    // This method ensures a disconnect before any connection attempt
    await this.disconnectInternal();

    /**
     * This portion creates a sync implementation which can be racy when disconnecting or
     * if multiple tabs on web are in use.
     * This is protected in an exclusive lock.
     * The promise tracks the creation which is used to synchronize disconnect attempts.
     */
    this.syncStreamInitPromise = new Promise(async (resolve, reject) => {
      try {
        if (!this.pendingConnectionOptions) {
          this.logger.debug('No pending connection options found, not creating sync stream implementation');
          // A disconnect could have cleared this.
          resolve();
          return;
        }

        if (this.disconnectingPromise) {
          resolve();
          return;
        }

        const { connector, options } = this.pendingConnectionOptions;
        appliedOptions = options;

        this.pendingConnectionOptions = null;

        const { sync, onDispose } = await this.options.createSyncImplementation(connector, {
          subscriptions: this.activeStreams,
          ...options
        });
        this.iterateListeners((l) => l.syncStreamCreated?.(sync));
        this.syncStreamImplementation = sync;
        this.syncDisposer = onDispose;
        await this.syncStreamImplementation.waitForReady();
        resolve();
      } catch (error) {
        reject(error);
      }
    });

    await this.syncStreamInitPromise;
    this.syncStreamInitPromise = null;

    if (!appliedOptions) {
      // A disconnect could have cleared the options which did not create a syncStreamImplementation
      return;
    }

    // It might be possible that a disconnect triggered between the last check
    // and this point. Awaiting here allows the sync stream to be cleared if disconnected.
    await this.disconnectingPromise;

    this.logger.debug('Attempting to connect to PowerSync instance');
    await this.syncStreamImplementation?.connect(appliedOptions!);
  }

  /**
   * Close the sync connection.
   *
   * Use {@link connect} to connect again.
   */
  async disconnect() {
    // This will help abort pending connects
    this.pendingConnectionOptions = null;
    await this.disconnectInternal();
  }

  protected async disconnectInternal(): Promise<void> {
    if (this.disconnectingPromise) {
      // A disconnect is already in progress
      return this.disconnectingPromise;
    }

    this.disconnectingPromise = this.performDisconnect();

    await this.disconnectingPromise;
    this.disconnectingPromise = null;
  }

  protected async performDisconnect() {
    // Wait if a sync stream implementation is being created before closing it
    // (syncStreamImplementation must be assigned before we can properly dispose it)
    await this.syncStreamInitPromise;

    // Keep reference to the sync stream implementation and disposer
    // The class members will be cleared before we trigger the disconnect
    // to prevent any further calls to the sync stream implementation.
    const sync = this.syncStreamImplementation;
    this.syncStreamImplementation = null;
    const disposer = this.syncDisposer;
    this.syncDisposer = null;

    await sync?.disconnect();
    await sync?.dispose();
    await disposer?.();
  }

  stream(adapter: InternalSubscriptionAdapter, name: string, parameters: Record<string, any> | null): SyncStream {
    const desc = { name, parameters } satisfies SyncStreamDescription;

    const waitForFirstSync = (abort?: AbortSignal) => {
      return adapter.firstStatusMatching((s) => s.forStream(desc)?.subscription.hasSynced, abort);
    };

    return {
      ...desc,
      subscribe: async (options?: SyncStreamSubscribeOptions) => {
        // NOTE: We also run this command if a subscription already exists, because this increases the expiry date
        // (relevant if the app is closed before connecting again, where the last subscribe call determines the ttl).
        await adapter.rustSubscriptionsCommand({
          subscribe: {
            stream: {
              name,
              params: parameters
            },
            ttl: options?.ttl,
            priority: options?.priority
          }
        });

        if (!this.syncStreamImplementation) {
          // We're not connected. So, update the offline sync status to reflect the new subscription.
          // (With an active iteration, the sync client would include it in its state).
          await adapter.resolveOfflineSyncStatus();
        }

        const key = `${name}|${JSON.stringify(parameters)}`;
        let subscription = this.locallyActiveSubscriptions.get(key);
        if (subscription == null) {
          const clearSubscription = () => {
            this.locallyActiveSubscriptions.delete(key);
            this.subscriptionsMayHaveChanged();
          };

          subscription = new ActiveSubscription(name, parameters, this.logger, waitForFirstSync, clearSubscription);
          this.locallyActiveSubscriptions.set(key, subscription);
          this.subscriptionsMayHaveChanged();
        }

        return new SyncStreamSubscriptionHandle(subscription);
      },
      unsubscribeAll: async () => {
        await adapter.rustSubscriptionsCommand({ unsubscribe: { name, params: parameters } });
        this.subscriptionsMayHaveChanged();
      }
    };
  }

  private get activeStreams() {
    return [...this.locallyActiveSubscriptions.values()].map((a) => ({ name: a.name, params: a.parameters }));
  }

  private subscriptionsMayHaveChanged() {
    if (this.syncStreamImplementation) {
      this.syncStreamImplementation.updateSubscriptions(this.activeStreams);
    }
  }
}

class ActiveSubscription {
  refcount: number = 0;

  constructor(
    readonly name: string,
    readonly parameters: Record<string, any> | null,
    readonly logger: ILogger,
    readonly waitForFirstSync: (abort?: AbortSignal) => Promise<void>,
    private clearSubscription: () => void
  ) {}

  decrementRefCount() {
    this.refcount--;
    if (this.refcount == 0) {
      this.clearSubscription();
    }
  }
}

class SyncStreamSubscriptionHandle implements SyncStreamSubscription {
  private active: boolean = false;

  constructor(readonly subscription: ActiveSubscription) {
    subscription.refcount++;
    _finalizer?.register(this, subscription);
  }

  get name() {
    return this.subscription.name;
  }

  get parameters() {
    return this.subscription.parameters;
  }

  waitForFirstSync(abort?: AbortSignal): Promise<void> {
    return this.subscription.waitForFirstSync(abort);
  }

  unsubscribe(): void {
    if (this.active) {
      this.active = false;
      _finalizer?.unregister(this);
      this.subscription.decrementRefCount();
    }
  }
}

const _finalizer =
  'FinalizationRegistry' in globalThis
    ? new FinalizationRegistry<ActiveSubscription>((sub) => {
        sub.logger.warn(
          `A subscription to ${sub.name} with params ${JSON.stringify(sub.parameters)} leaked! Please ensure calling unsubscribe() when you don't need a subscription anymore. For global subscriptions, consider storing them in global fields to avoid this warning.`
        );
      })
    : null;
