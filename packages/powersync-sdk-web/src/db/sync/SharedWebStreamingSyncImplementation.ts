import * as Comlink from 'comlink';
import {
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from './WebStreamingSyncImplementation';
import {
  ManualSharedSyncPayload,
  SharedSyncClientEvent,
  SharedSyncImplementation
} from '../../worker/sync/SharedSyncImplementation';
import { AbstractSharedSyncClientProvider } from '../../worker/sync/AbstractSharedSyncClientProvider';
import { PowerSyncCredentials, SyncStatus, SyncStatusOptions } from '@journeyapps/powersync-sdk-common';
import { openWorkerDatabasePort } from '../../worker/db/open-worker-database';

/**
 * The shared worker will trigger methods on this side of the message port
 * via this client provider.
 */
class SharedSyncClientProvider extends AbstractSharedSyncClientProvider {
  constructor(
    protected options: WebStreamingSyncImplementationOptions,
    public statusChanged: (status: SyncStatusOptions) => void
  ) {
    super();
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
      token: credentials.token,
      expiresAt: credentials.expiresAt
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

export class SharedWebStreamingSyncImplementation extends WebStreamingSyncImplementation {
  protected syncManager: Comlink.Remote<SharedSyncImplementation>;
  protected clientProvider: SharedSyncClientProvider;
  protected messagePort: MessagePort;

  protected isInitialized: Promise<void>;

  constructor(options: WebStreamingSyncImplementationOptions) {
    super(options);

    /**
     * Configure or connect to the shared sync worker.
     * This worker will manage all syncing operations remotely.
     */
    const syncWorker = new SharedWorker(
      new URL('../../worker/sync/SharedSyncImplementation.worker.js', import.meta.url),
      {
        /* @vite-ignore */
        name: `shared-sync-${this.webOptions.identifier}`,
        type: 'module'
      }
    );
    this.messagePort = syncWorker.port;
    this.syncManager = Comlink.wrap<SharedSyncImplementation>(this.messagePort);
    this.triggerCrudUpload = this.syncManager.triggerCrudUpload;

    /**
     * Opens MessagePort to the existing shared DB worker.
     * The sync worker cannot initiate connections directly to the
     * DB worker, but a port to the DB worker can be transferred to the
     * sync worker.
     */
    const { crudUploadThrottleMs, identifier, retryDelayMs } = this.options;
    const dbOpenerPort = openWorkerDatabasePort(this.options.identifier!, true) as MessagePort;
    this.isInitialized = this.syncManager.init(Comlink.transfer(dbOpenerPort, [dbOpenerPort]), {
      dbName: this.options.identifier!,
      streamOptions: {
        crudUploadThrottleMs,
        identifier,
        retryDelayMs
      }
    });

    /**
     * Pass along any sync status updates to this listener
     */
    this.clientProvider = new SharedSyncClientProvider(this.options, (status) => {
      this.iterateListeners((l) => this.updateSyncStatus(status));
    });

    /**
     * The sync worker will call this client provider when it needs
     * to fetch credentials or upload data.
     * This performs bi-directional method calling.
     */
    Comlink.expose(this.clientProvider, this.messagePort);
  }

  /**
   * Starts the sync process, this effectively acts as a call to
   * `connect` if not yet connected.
   */
  async connect(): Promise<void> {
    await this.waitForReady();
    return this.syncManager.connect();
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
    // Signal the shared worker that this client is closing its connection to the worker
    const closeMessagePayload: ManualSharedSyncPayload = {
      event: SharedSyncClientEvent.CLOSE_CLIENT,
      data: {}
    };

    this.messagePort.postMessage(closeMessagePayload);

    // Release the proxy
    this.syncManager[Comlink.releaseProxy]();
  }

  async waitForReady() {
    return this.isInitialized;
  }

  /**
   * Used in tests to force a connection states
   */
  private async _testUpdateStatus(status: SyncStatus) {
    return (this.syncManager as any)['_testUpdateAllStatuses'](status.toJSON());
  }
}
