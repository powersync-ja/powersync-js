import {
  type AbstractStreamingSyncImplementation,
  type LockOptions,
  type PowerSyncConnectionOptions,
  type StreamingSyncImplementation,
  type StreamingSyncImplementationListener,
  type SyncStatusOptions,
  AbortOperation,
  BaseObserver,
  DBAdapter,
  SqliteBucketStorage,
  SyncStatus
} from '@powersync/common';
import { Mutex } from 'async-mutex';
import * as Comlink from 'comlink';
import Logger, { type ILogger } from 'js-logger';
import { WebRemote } from '../../db/sync/WebRemote';
import {
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from '../../db/sync/WebStreamingSyncImplementation';

import { OpenAsyncDatabaseConnection } from '../../db/adapters/AsyncDatabaseConnection';
import { LockedAsyncDatabaseAdapter } from '../../db/adapters/LockedAsyncDatabaseAdapter';
import { ResolvedWebSQLOpenOptions } from '../../db/adapters/web-sql-flags';
import { WorkerWrappedAsyncDatabaseConnection } from '../../db/adapters/WorkerWrappedAsyncDatabaseConnection';
import { getNavigatorLocks } from '../../shared/navigator';
import { AbstractSharedSyncClientProvider } from './AbstractSharedSyncClientProvider';
import { BroadcastLogger } from './BroadcastLogger';

/**
 * Manual message events for shared sync clients
 */
export enum SharedSyncClientEvent {
  /**
   * This client requests the shared sync manager should
   * close it's connection to the client.
   */
  CLOSE_CLIENT = 'close-client'
}

export type ManualSharedSyncPayload = {
  event: SharedSyncClientEvent;
  data: any; // TODO update in future
};

/**
 * @internal
 */
export type SharedSyncInitOptions = {
  streamOptions: Omit<WebStreamingSyncImplementationOptions, 'adapter' | 'uploadCrud' | 'remote'>;
  dbParams: ResolvedWebSQLOpenOptions;
};

/**
 * @internal
 */
export interface SharedSyncImplementationListener extends StreamingSyncImplementationListener {
  initialized: () => void;
}

/**
 * @internal
 */
export type WrappedSyncPort = {
  port: MessagePort;
  clientProvider: Comlink.Remote<AbstractSharedSyncClientProvider>;
  db?: DBAdapter;
};

/**
 * @internal
 */
export type RemoteOperationAbortController = {
  controller: AbortController;
  activePort: WrappedSyncPort;
};

/**
 * @internal
 * Shared sync implementation which runs inside a shared webworker
 */
export class SharedSyncImplementation
  extends BaseObserver<SharedSyncImplementationListener>
  implements StreamingSyncImplementation
{
  protected ports: WrappedSyncPort[];
  protected syncStreamClient: AbstractStreamingSyncImplementation | null;

  protected isInitialized: Promise<void>;
  protected statusListener?: () => void;

  protected fetchCredentialsController?: RemoteOperationAbortController;
  protected uploadDataController?: RemoteOperationAbortController;

  protected dbAdapter: DBAdapter | null;
  protected syncParams: SharedSyncInitOptions | null;
  protected logger: ILogger;
  protected lastConnectOptions: PowerSyncConnectionOptions | undefined;

  syncStatus: SyncStatus;
  broadCastLogger: ILogger;

  constructor() {
    super();
    this.ports = [];
    this.dbAdapter = null;
    this.syncParams = null;
    this.syncStreamClient = null;
    this.logger = Logger.get('shared-sync');
    this.lastConnectOptions = undefined;

    this.isInitialized = new Promise((resolve) => {
      const callback = this.registerListener({
        initialized: () => {
          resolve();
          callback?.();
        }
      });
    });

    this.syncStatus = new SyncStatus({});
    this.broadCastLogger = new BroadcastLogger(this.ports);
  }

  async waitForStatus(status: SyncStatusOptions): Promise<void> {
    await this.waitForReady();
    return this.syncStreamClient!.waitForStatus(status);
  }

  get lastSyncedAt(): Date | undefined {
    return this.syncStreamClient?.lastSyncedAt;
  }

  get isConnected(): boolean {
    return this.syncStreamClient?.isConnected ?? false;
  }

  async waitForReady() {
    return this.isInitialized;
  }

  /**
   * Configures the DBAdapter connection and a streaming sync client.
   */
  async setParams(params: SharedSyncInitOptions) {
    if (this.syncParams) {
      // Cannot modify already existing sync implementation
      return;
    }

    this.syncParams = params;

    if (params.streamOptions?.flags?.broadcastLogs) {
      this.logger = this.broadCastLogger;
    }

    self.onerror = (event) => {
      // Share any uncaught events on the broadcast logger
      this.logger.error('Uncaught exception in PowerSync shared sync worker', event);
    };

    await this.openInternalDB();
    this.iterateListeners((l) => l.initialized?.());
  }

  async dispose() {
    await this.waitForReady();
    this.statusListener?.();
    return this.syncStreamClient?.dispose();
  }

  /**
   * Connects to the PowerSync backend instance.
   * Multiple tabs can safely call this in their initialization.
   * The connection will simply be reconnected whenever a new tab
   * connects.
   */
  async connect(options?: PowerSyncConnectionOptions) {
    await this.waitForReady();
    // This effectively queues connect and disconnect calls. Ensuring multiple tabs' requests are synchronized
    return getNavigatorLocks().request('shared-sync-connect', async () => {
      this.syncStreamClient = this.generateStreamingImplementation();
      this.lastConnectOptions = options;
      this.syncStreamClient.registerListener({
        statusChanged: (status) => {
          this.updateAllStatuses(status.toJSON());
        }
      });

      await this.syncStreamClient.connect(options);
    });
  }

  async disconnect() {
    await this.waitForReady();
    // This effectively queues connect and disconnect calls. Ensuring multiple tabs' requests are synchronized
    return getNavigatorLocks().request('shared-sync-connect', async () => {
      await this.syncStreamClient?.disconnect();
      await this.syncStreamClient?.dispose();
      this.syncStreamClient = null;
    });
  }

  /**
   * Adds a new client tab's message port to the list of connected ports
   */
  addPort(port: MessagePort) {
    const portProvider = {
      port,
      clientProvider: Comlink.wrap<AbstractSharedSyncClientProvider>(port)
    };
    this.ports.push(portProvider);

    // Give the newly connected client the latest status
    const status = this.syncStreamClient?.syncStatus;
    if (status) {
      portProvider.clientProvider.statusChanged(status.toJSON());
    }
  }

  /**
   * Removes a message port client from this manager's managed
   * clients.
   */
  async removePort(port: MessagePort) {
    const index = this.ports.findIndex((p) => p.port == port);
    if (index < 0) {
      console.warn(`Could not remove port ${port} since it is not present in active ports.`);
      return;
    }

    const trackedPort = this.ports[index];
    if (trackedPort.db) {
      trackedPort.db.close();
    }

    // Release proxy
    trackedPort.clientProvider[Comlink.releaseProxy]();
    this.ports.splice(index, 1);

    /**
     * The port might currently be in use. Any active functions might
     * not resolve. Abort them here.
     */
    [this.fetchCredentialsController, this.uploadDataController].forEach((abortController) => {
      if (abortController?.activePort.port == port) {
        abortController!.controller.abort(new AbortOperation('Closing pending requests after client port is removed'));
      }
    });

    if (this.dbAdapter == trackedPort.db && this.syncStreamClient) {
      await this.disconnect();
      // Ask for a new DB worker port handler
      await this.openInternalDB();
      await this.connect(this.lastConnectOptions);
    }
  }

  triggerCrudUpload() {
    this.waitForReady().then(() => this.syncStreamClient?.triggerCrudUpload());
  }

  async obtainLock<T>(lockOptions: LockOptions<T>): Promise<T> {
    await this.waitForReady();
    return this.syncStreamClient!.obtainLock(lockOptions);
  }

  async hasCompletedSync(): Promise<boolean> {
    await this.waitForReady();
    return this.syncStreamClient!.hasCompletedSync();
  }

  async getWriteCheckpoint(): Promise<string> {
    await this.waitForReady();
    return this.syncStreamClient!.getWriteCheckpoint();
  }

  protected generateStreamingImplementation() {
    // This should only be called after initialization has completed
    const syncParams = this.syncParams!;

    // Create a new StreamingSyncImplementation for each connect call. This is usually done is all SDKs.
    return new WebStreamingSyncImplementation({
      adapter: new SqliteBucketStorage(this.dbAdapter!, new Mutex(), this.logger),
      remote: new WebRemote({
        fetchCredentials: async () => {
          const lastPort = this.ports[this.ports.length - 1];
          return new Promise(async (resolve, reject) => {
            const abortController = new AbortController();
            this.fetchCredentialsController = {
              controller: abortController,
              activePort: lastPort
            };

            abortController.signal.onabort = reject;
            try {
              console.log('calling the last port client provider for credentials');
              resolve(await lastPort.clientProvider.fetchCredentials());
            } catch (ex) {
              reject(ex);
            } finally {
              this.fetchCredentialsController = undefined;
            }
          });
        }
      }),
      uploadCrud: async () => {
        const lastPort = this.ports[this.ports.length - 1];

        return new Promise(async (resolve, reject) => {
          const abortController = new AbortController();
          this.uploadDataController = {
            controller: abortController,
            activePort: lastPort
          };

          // Resolving will make it retry
          abortController.signal.onabort = () => resolve();
          try {
            resolve(await lastPort.clientProvider.uploadCrud());
          } catch (ex) {
            reject(ex);
          } finally {
            this.uploadDataController = undefined;
          }
        });
      },
      ...syncParams.streamOptions,
      // Logger cannot be transferred just yet
      logger: this.logger
    });
  }

  protected async openInternalDB() {
    const lastClient = this.ports[this.ports.length - 1];
    const workerPort = await lastClient.clientProvider.getDBWorkerPort();
    const remote = Comlink.wrap<OpenAsyncDatabaseConnection>(workerPort);
    const identifier = this.syncParams!.dbParams.dbFilename;
    const db = await remote(this.syncParams!.dbParams);
    const locked = new LockedAsyncDatabaseAdapter({
      name: identifier,
      openConnection: async () => {
        return new WorkerWrappedAsyncDatabaseConnection({
          remote,
          baseConnection: db,
          identifier
        });
      },
      logger: this.logger
    });
    await locked.init();
    this.dbAdapter = lastClient.db = locked;
  }

  /**
   * A method to update the all shared statuses for each
   * client.
   */
  private updateAllStatuses(status: SyncStatusOptions) {
    this.syncStatus = new SyncStatus(status);
    this.ports.forEach((p) => p.clientProvider.statusChanged(status));
  }

  /**
   * A function only used for unit tests which updates the internal
   * sync stream client and all tab client's sync status
   */
  private _testUpdateAllStatuses(status: SyncStatusOptions) {
    if (!this.syncStreamClient) {
      // This is just for testing purposes
      this.syncStreamClient = this.generateStreamingImplementation();
    }

    // Only assigning, don't call listeners for this test
    this.syncStreamClient!.syncStatus = new SyncStatus(status);

    this.updateAllStatuses(status);
  }
}
