import { LogRecord, PowerSyncCredentials } from '@powersync/common';
import * as Comlink from 'comlink';
import { AbstractSharedSyncClientProvider } from '../../worker/sync/AbstractSharedSyncClientProvider.js';
import { ManualSharedSyncPayload, SharedSyncClientEvent } from '../../worker/sync/SharedSyncImplementation.js';
import { WorkerClient } from '../../worker/sync/WorkerClient.js';
import { WebDBAdapter } from '../adapters/WebDBAdapter.js';
import {
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from './WebStreamingSyncImplementation.js';
import { generateTabCloseSignal } from '../../shared/tab_close_signal.js';
import { SubscribedStream, SyncStatusJson, ResolvedSyncOptions } from '@powersync/shared-internals';
import { connectToExistingWorker, connectToWorker, WorkerConnection } from '../../worker/client.js';

/**
 * The shared worker will trigger methods on this side of the message port
 * via this client provider.
 */
class SharedSyncClientProvider extends AbstractSharedSyncClientProvider {
  constructor(
    protected options: WebStreamingSyncImplementationOptions,
    public statusChanged: (status: SyncStatusJson) => void,
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

  log(record: LogRecord): void {
    this.logger.log(record);
  }
}

export interface SharedWebStreamingSyncImplementationOptions extends WebStreamingSyncImplementationOptions {
  logLevel: number;
  db: WebDBAdapter;
  enableBroadcastLogs: boolean;
}

/**
 * The local part of the sync implementation on the web, which talks to a sync implementation hosted in a shared worker.
 */
export class SharedWebStreamingSyncImplementation extends WebStreamingSyncImplementation {
  protected syncManager: Comlink.Remote<WorkerClient>;
  protected clientProvider: SharedSyncClientProvider;
  protected worker: WorkerConnection;

  protected isInitialized: Promise<void>;
  protected dbAdapter: WebDBAdapter;
  private abortOnClose = new AbortController();
  private logLevel: number;
  private enableBroadcastLogs: boolean;

  constructor(options: SharedWebStreamingSyncImplementationOptions) {
    super(options);
    this.dbAdapter = options.db;
    this.logLevel = options.logLevel;
    this.enableBroadcastLogs = options.enableBroadcastLogs;

    const syncWorker = options.sync?.worker;
    if (typeof syncWorker === 'function') {
      this.worker = connectToExistingWorker(syncWorker(), 'sync');
    } else {
      this.worker = connectToWorker({
        service: 'sync',
        databaseIdentifier: this.webOptions.identifier!,
        shared: true,
        customWorker: syncWorker
      });
    }

    /**
     * Pass along any sync status updates to this listener
     */
    this.clientProvider = new SharedSyncClientProvider(
      this.webOptions,
      ({ core, dataFlow }) => {
        this.updateSyncStatus(core, dataFlow);
      },
      options.db
    );

    this.syncManager = Comlink.wrap<WorkerClient>(this.worker.endpoint);
    /**
     * The sync worker will call this client provider when it needs
     * to fetch credentials or upload data.
     * This performs bi-directional method calling.
     */
    Comlink.expose(this.clientProvider, this.worker.endpoint);

    this.syncManager.setLogLevel(this.logLevel);

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
    const closeSignal = await generateTabCloseSignal(this.abortOnClose.signal);
    // Awaiting here ensures the worker is waiting for the lock
    await this.syncManager.addLockBasedCloseSignal(closeSignal);

    const { identifier } = this.options;

    await this.syncManager.setParams(
      {
        dbParams: this.dbAdapter.getConfiguration(),
        streamOptions: {
          identifier,
          serializedSchema: this.options.serializedSchema
        },
        enableBroadcastLogs: this.enableBroadcastLogs
      },
      this.options.subscriptions
    );
  }

  /**
   * Starts the sync process, this effectively acts as a call to
   * `connect` if not yet connected.
   */
  async connect(options: ResolvedSyncOptions): Promise<void> {
    await this.waitForReady();
    return this.syncManager.connect(options, this.options.serializedSchema);
  }

  async disconnect(): Promise<void> {
    await this.waitForReady();
    return this.syncManager.disconnect();
  }

  async getWriteCheckpoint(): Promise<string> {
    await this.waitForReady();
    return this.syncManager.getWriteCheckpoint();
  }

  async dispose(): Promise<void> {
    await this.waitForReady();

    await new Promise<void>((resolve) => {
      // This will always be a message port since we use shared workers.
      const messagePort = this.worker.endpoint as MessagePort;

      // Listen for the close acknowledgment from the worker
      messagePort.addEventListener('message', (event) => {
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
      messagePort.postMessage(closeMessagePayload);
    });

    await super.dispose();

    this.abortOnClose.abort();

    // Release the proxy
    this.syncManager[Comlink.releaseProxy]();
    this.worker.close();
  }

  async waitForReady() {
    return this.isInitialized;
  }

  updateSubscriptions(subscriptions: SubscribedStream[]): void {
    this.syncManager.updateSubscriptions(subscriptions);
  }
}
