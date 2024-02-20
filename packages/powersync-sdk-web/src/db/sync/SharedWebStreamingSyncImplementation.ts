import _ from 'lodash';
import * as Comlink from 'comlink';
import {
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from './WebStreamingSyncImplementation';
import { AbstractSharedSyncClientProvider, SharedSyncImplementation } from '../../worker/sync/SharedSyncImplementation';
import { PowerSyncCredentials, SyncStatusOptions } from '@journeyapps/powersync-sdk-common';
import { openWorkerDatabasePort } from '../../worker/db/open-worker-database';

class SharedSyncClientProvider extends AbstractSharedSyncClientProvider {
  constructor(
    protected options: WebStreamingSyncImplementationOptions,
    public statusChanged: (status: SyncStatusOptions) => void
  ) {
    super();
  }

  async fetchCredentials(): Promise<PowerSyncCredentials> {
    const credentials = await this.options.remote.getCredentials();
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

  uploadCrud(): Promise<void> {
    return this.options.uploadCrud();
  }
}

export class SharedWebStreamingSyncImplementation extends WebStreamingSyncImplementation {
  protected syncManager: Comlink.Remote<SharedSyncImplementation>;
  protected clientProvider: SharedSyncClientProvider;

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
    const { port } = syncWorker;
    this.syncManager = Comlink.wrap<SharedSyncImplementation>(port);

    /**
     * Opens MessagePort to the existing shared DB worker.
     * The sync worker cannot initiate connections directly to the
     * DB worker, but a port to the DB worker can be transferred to the
     * sync worker.
     */
    const { crudUploadThrottleMs, identifier, retryDelayMs } = options;
    const dbOpenerPort = openWorkerDatabasePort(options.identifier!, true) as MessagePort;
    this.syncManager.init(Comlink.transfer(dbOpenerPort, [dbOpenerPort]), {
      dbName: options.identifier!,
      streamOptions: {
        crudUploadThrottleMs,
        identifier,
        retryDelayMs
      }
    });

    /**
     * Pass along any sync status updates to this listener
     */
    this.clientProvider = new SharedSyncClientProvider(options, (status) => {
      console.log(status);
      this.iterateListeners((l) => this.updateSyncStatus(status));
    });

    /**
     * The sync worker will call this client provider when it needs
     * to fetch credentials or upload data.
     * This performs bi-directional method calling.
     */
    Comlink.expose(this.clientProvider, port);
  }

  /**
   * Starts the sync process, this effectively acts as a call to
   * `connect` if not yet connected.
   */
  async streamingSync(signal?: AbortSignal | undefined): Promise<void> {
    this.syncManager.connect();
    if (signal) {
      signal.onabort = () => this.syncManager.disconnect();
    }
  }
}
