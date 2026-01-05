import {
  PowerSyncConnectionOptions,
  PowerSyncCredentials,
  SubscribedStream,
  SyncStatusOptions
} from '@powersync/common';
import * as Comlink from 'comlink';
import { getNavigatorLocks } from '../../shared/navigator';
import { AbstractSharedSyncClientProvider } from '../../worker/sync/AbstractSharedSyncClientProvider';
import { ManualSharedSyncPayload, SharedSyncClientEvent } from '../../worker/sync/SharedSyncImplementation';
import { WorkerClient } from '../../worker/sync/WorkerClient';
import { WebDBAdapter } from '../adapters/WebDBAdapter';
import { DEFAULT_CACHE_SIZE_KB, TemporaryStorageOption, resolveWebSQLFlags } from '../adapters/web-sql-flags';
import {
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from './WebStreamingSyncImplementation';

/**
 * The shared worker will trigger methods on this side of the message port
 * via this client provider.
 */
class SharedSyncClientProvider extends AbstractSharedSyncClientProvider {
  constructor(
    protected options: WebStreamingSyncImplementationOptions,
    public statusChanged: (status: SyncStatusOptions) => void,
    protected webDB: WebDBAdapter
  ) {
    super();
  }

  async getDBWorkerPort(): Promise<MessagePort> {
    const { port } = await this.webDB.shareConnection();
    return Comlink.transfer(port, [port]);
  }

  invalidateCredentials() {
    this.options.remote.invalidateCredentials();
  }

  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const credentials = await this.options.remote.getCredentials();
    if (credentials == null) {
      return null;
    }
    /**
     * The credentials need to be serializable.
     * Users might extend [PowerSyncCredentials] to contain
     * items which are not serializable.
     * This returns only the essential fields.
     */
    return {
      endpoint: credentials.endpoint,
      token: credentials.token
    };
  }

  async uploadCrud(): Promise<void> {
    /**
     * Don't return anything here, just incase something which is not
     * serializable is returned from the `uploadCrud` function.
     */
    await this.options.uploadCrud();
  }

  get logger() {
    return this.options.logger;
  }

  trace(...x: any[]): void {
    this.logger?.trace(...x);
  }
  debug(...x: any[]): void {
    this.logger?.debug(...x);
  }
  info(...x: any[]): void {
    this.logger?.info(...x);
  }
  log(...x: any[]): void {
    this.logger?.log(...x);
  }
  warn(...x: any[]): void {
    this.logger?.warn(...x);
  }
  error(...x: any[]): void {
    this.logger?.error(...x);
  }
  time(label: string): void {
    this.logger?.time(label);
  }
  timeEnd(label: string): void {
    this.logger?.timeEnd(label);
  }
}

export interface SharedWebStreamingSyncImplementationOptions extends WebStreamingSyncImplementationOptions {
  db: WebDBAdapter;
}

/**
 * The local part of the sync implementation on the web, which talks to a sync implementation hosted in a shared worker.
 */
export class SharedWebStreamingSyncImplementation extends WebStreamingSyncImplementation {
  protected syncManager: Comlink.Remote<WorkerClient>;
  protected clientProvider: SharedSyncClientProvider;
  protected messagePort: MessagePort;

  protected isInitialized: Promise<void>;
  protected dbAdapter: WebDBAdapter;
  private abortOnClose = new AbortController();

  constructor(options: SharedWebStreamingSyncImplementationOptions) {
    super(options);
    this.dbAdapter = options.db;
    /**
     * Configure or connect to the shared sync worker.
     * This worker will manage all syncing operations remotely.
     */
    const resolvedWorkerOptions = {
      dbFilename: this.options.identifier!,
      temporaryStorage: TemporaryStorageOption.MEMORY,
      cacheSizeKb: DEFAULT_CACHE_SIZE_KB,
      ...options,
      flags: resolveWebSQLFlags(options.flags)
    };

    const syncWorker = options.sync?.worker;
    if (syncWorker) {
      if (typeof syncWorker === 'function') {
        this.messagePort = syncWorker(resolvedWorkerOptions).port;
      } else {
        this.messagePort = new SharedWorker(`${syncWorker}`, {
          /* @vite-ignore */
          name: `shared-sync-${this.webOptions.identifier}`
        }).port;
      }
    } else {
      this.messagePort = new SharedWorker(
        new URL('../../worker/sync/SharedSyncImplementation.worker.js', import.meta.url),
        {
          /* @vite-ignore */
          name: `shared-sync-${this.webOptions.identifier}`,
          type: 'module'
        }
      ).port;
    }

    /**
     * Pass along any sync status updates to this listener
     */
    this.clientProvider = new SharedSyncClientProvider(
      this.webOptions,
      (status) => {
        this.updateSyncStatus(status);
      },
      options.db
    );

    this.syncManager = Comlink.wrap<WorkerClient>(this.messagePort);
    /**
     * The sync worker will call this client provider when it needs
     * to fetch credentials or upload data.
     * This performs bi-directional method calling.
     */
    Comlink.expose(this.clientProvider, this.messagePort);

    this.syncManager.setLogLevel(this.logger.getLevel());

    this.triggerCrudUpload = this.syncManager.triggerCrudUpload;

    /**
     * Opens MessagePort to the existing shared DB worker.
     * The sync worker cannot initiate connections directly to the
     * DB worker, but a port to the DB worker can be transferred to the
     * sync worker.
     */

    this.isInitialized = this._init();
  }

  protected async _init() {
    /**
     * The general flow of initialization is:
     *  - The client requests a unique navigator lock.
     *    - Once the lock is acquired, we register the lock with the shared worker.
     *    - The shared worker can then request the same lock. The client has been closed if the shared worker can acquire the lock.
     *    - Once the shared worker knows the client's lock, we can guarentee that the shared worker will detect if the client has been closed.
     *    - This makes the client safe for the shared worker to use.
     *    - The client is only added to the SharedSyncImplementation once the lock has been registered.
     *      This ensures we don't ever keep track of dead clients (tabs that closed before the lock was registered).
     *    - The client side lock is held until the client is disposed.
     *    - We resolve the top-level promise after the lock has been registered with the shared worker.
     * - The client sends the params to the shared worker after locks have been registered.
     */
    await new Promise<void>((resolve) => {
      // Request a random lock until this client is disposed. The name of the lock is sent to the shared worker, which
      // will also attempt to acquire it. Since the lock is returned when the tab is closed, this allows the share worker
      // to free resources associated with this tab.
      // We take hold of this lock as soon-as-possible in order to cater for potentially closed tabs.
      getNavigatorLocks().request(`tab-close-signal-${crypto.randomUUID()}`, async (lock) => {
        if (this.abortOnClose.signal.aborted) {
          return;
        }
        // Awaiting here ensures the worker is waiting for the lock
        await this.syncManager.addLockBasedCloseSignal(lock!.name);

        // The lock has been registered, we can continue with the initialization
        resolve();

        await new Promise<void>((r) => {
          this.abortOnClose.signal.onabort = () => r();
        });
      });
    });

    const { crudUploadThrottleMs, identifier, retryDelayMs } = this.options;
    const flags = { ...this.webOptions.flags, workers: undefined };

    await this.syncManager.setParams(
      {
        dbParams: this.dbAdapter.getConfiguration(),
        streamOptions: {
          crudUploadThrottleMs,
          identifier,
          retryDelayMs,
          flags: flags
        }
      },
      this.options.subscriptions
    );
  }

  /**
   * Starts the sync process, this effectively acts as a call to
   * `connect` if not yet connected.
   */
  async connect(options?: PowerSyncConnectionOptions): Promise<void> {
    await this.waitForReady();
    return this.syncManager.connect(options);
  }

  async disconnect(): Promise<void> {
    await this.waitForReady();
    return this.syncManager.disconnect();
  }

  async getWriteCheckpoint(): Promise<string> {
    await this.waitForReady();
    return this.syncManager.getWriteCheckpoint();
  }

  async hasCompletedSync(): Promise<boolean> {
    return this.syncManager.hasCompletedSync();
  }

  async dispose(): Promise<void> {
    await this.waitForReady();

    await new Promise<void>((resolve) => {
      // Listen for the close acknowledgment from the worker
      this.messagePort.addEventListener('message', (event) => {
        const payload = event.data as ManualSharedSyncPayload;
        if (payload?.event === SharedSyncClientEvent.CLOSE_ACK) {
          resolve();
        }
      });

      // Signal the shared worker that this client is closing its connection to the worker
      const closeMessagePayload: ManualSharedSyncPayload = {
        event: SharedSyncClientEvent.CLOSE_CLIENT,
        data: {}
      };
      this.messagePort.postMessage(closeMessagePayload);
    });

    await super.dispose();

    this.abortOnClose.abort();

    // Release the proxy
    this.syncManager[Comlink.releaseProxy]();
    this.messagePort.close();
  }

  async waitForReady() {
    return this.isInitialized;
  }

  updateSubscriptions(subscriptions: SubscribedStream[]): void {
    this.syncManager.updateSubscriptions(subscriptions);
  }
}
