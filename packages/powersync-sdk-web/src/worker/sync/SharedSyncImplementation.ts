import * as Comlink from 'comlink';
import { ILogger } from 'js-logger';
import {
  AbstractStreamingSyncImplementation,
  StreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  BaseObserver,
  LockOptions,
  SqliteBucketStorage,
  StreamingSyncImplementationListener,
  SyncStatus,
  SyncStatusOptions
} from '@journeyapps/powersync-sdk-common';
import { WebStreamingSyncImplementation } from '../../db/sync/WebStreamingSyncImplementation';
import { Mutex } from 'async-mutex';
import { WebRemote } from '../../db/sync/WebRemote';

import { WASQLiteDBAdapter } from '../../db/adapters/wa-sqlite/WASQLiteDBAdapter';
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

export type SharedSyncInitOptions = {
  dbName: string;
  streamOptions: Omit<AbstractStreamingSyncImplementationOptions, 'adapter' | 'uploadCrud' | 'remote'>;
};

export interface SharedSyncImplementationListener extends StreamingSyncImplementationListener {
  initialized: () => void;
}

export type WrappedSyncPort = {
  port: MessagePort;
  clientProvider: Comlink.Remote<AbstractSharedSyncClientProvider>;
};

export type RemoteOperationAbortController = {
  controller: AbortController;
  activePort: WrappedSyncPort;
};

/**
 * Shared sync implementation which runs inside a shared webworker
 */
export class SharedSyncImplementation
  extends BaseObserver<SharedSyncImplementationListener>
  implements StreamingSyncImplementation
{
  protected ports: WrappedSyncPort[];
  protected syncStreamClient?: AbstractStreamingSyncImplementation;

  protected abortController?: AbortController;
  protected isInitialized: Promise<void>;
  protected statusListener?: () => void;

  protected fetchCredentialsController?: RemoteOperationAbortController;
  protected uploadDataController?: RemoteOperationAbortController;

  syncStatus: SyncStatus;
  broadCastLogger: ILogger;

  constructor() {
    super();
    this.ports = [];

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
  async init(dbWorkerPort: MessagePort, params: SharedSyncInitOptions) {
    if (this.syncStreamClient) {
      // Cannot modify already existing sync implementation
      return;
    }

    this.syncStreamClient = new WebStreamingSyncImplementation({
      adapter: new SqliteBucketStorage(
        new WASQLiteDBAdapter({
          dbFilename: params.dbName,
          workerPort: dbWorkerPort,
          flags: { enableMultiTabs: true },
          logger: this.broadCastLogger
        }),
        new Mutex(),
        this.broadCastLogger
      ),
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
      ...params.streamOptions,
      // Logger cannot be transferred just yet
      logger: this.broadCastLogger
    });

    this.syncStreamClient.registerListener({
      statusChanged: (status) => {
        this.updateAllStatuses(status.toJSON());
      }
    });

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
  async connect() {
    await this.waitForReady();
    this.disconnect();
    this.abortController = new AbortController();
    this.syncStreamClient?.streamingSync(this.abortController.signal);
  }

  async disconnect() {
    this.abortController?.abort('Disconnected');
    this.updateAllStatuses({ connected: false });
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
  removePort(port: MessagePort) {
    const index = this.ports.findIndex((p) => p.port == port);
    if (index < 0) {
      console.warn(`Could not remove port ${port} since it is not present in active ports.`);
      return;
    }

    const trackedPort = this.ports[index];
    // Release proxy
    trackedPort.clientProvider[Comlink.releaseProxy]();
    this.ports.splice(index, 1);

    /**
     * The port might currently be in use. Any active functions might
     * not resolve. Abort them here.
     */
    [this.fetchCredentialsController, this.uploadDataController].forEach((abortController) => {
      if (abortController?.activePort.port == port) {
        abortController!.controller.abort();
      }
    });
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
      console.warn('no stream client has been initialized yet');
    }

    // Only assigning, don't call listeners for this test
    this.syncStreamClient!.syncStatus = new SyncStatus(status);

    this.updateAllStatuses(status);
  }
}
