import {
  type ILogger,
  type ILogLevel,
  type PowerSyncConnectionOptions,
  type StreamingSyncImplementation,
  type StreamingSyncImplementationListener,
  type SyncStatusOptions,
  AbortOperation,
  BaseObserver,
  ConnectionManager,
  createLogger,
  DBAdapter,
  PowerSyncBackendConnector,
  SqliteBucketStorage,
  SyncStatus
} from '@powersync/common';
import { Mutex } from 'async-mutex';
import * as Comlink from 'comlink';
import { WebRemote } from '../../db/sync/WebRemote';
import {
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from '../../db/sync/WebStreamingSyncImplementation';

import { OpenAsyncDatabaseConnection } from '../../db/adapters/AsyncDatabaseConnection';
import { LockedAsyncDatabaseAdapter } from '../../db/adapters/LockedAsyncDatabaseAdapter';
import { ResolvedWebSQLOpenOptions } from '../../db/adapters/web-sql-flags';
import { WorkerWrappedAsyncDatabaseConnection } from '../../db/adapters/WorkerWrappedAsyncDatabaseConnection';
import { AbstractSharedSyncClientProvider } from './AbstractSharedSyncClientProvider';
import { BroadcastLogger } from './BroadcastLogger';

/**
 * @internal
 * Manual message events for shared sync clients
 */
export enum SharedSyncClientEvent {
  /**
   * This client requests the shared sync manager should
   * close it's connection to the client.
   */
  CLOSE_CLIENT = 'close-client',

  CLOSE_ACK = 'close-ack'
}

/**
 * @internal
 */
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
 * HACK: The shared implementation wraps and provides its own
 * PowerSyncBackendConnector when generating the streaming sync implementation.
 * We provide this unused placeholder when connecting with the ConnectionManager.
 */
const CONNECTOR_PLACEHOLDER = {} as PowerSyncBackendConnector;

/**
 * @internal
 * Shared sync implementation which runs inside a shared webworker
 */
export class SharedSyncImplementation
  extends BaseObserver<SharedSyncImplementationListener>
  implements StreamingSyncImplementation
{
  protected ports: WrappedSyncPort[];

  protected isInitialized: Promise<void>;
  protected statusListener?: () => void;

  protected fetchCredentialsController?: RemoteOperationAbortController;
  protected uploadDataController?: RemoteOperationAbortController;

  protected dbAdapter: DBAdapter | null;
  protected syncParams: SharedSyncInitOptions | null;
  protected logger: ILogger;
  protected lastConnectOptions: PowerSyncConnectionOptions | undefined;
  protected portMutex: Mutex;

  protected connectionManager: ConnectionManager;
  syncStatus: SyncStatus;
  broadCastLogger: ILogger;

  constructor() {
    super();
    this.ports = [];
    this.dbAdapter = null;
    this.syncParams = null;
    this.logger = createLogger('shared-sync');
    this.lastConnectOptions = undefined;
    this.portMutex = new Mutex();

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

    this.connectionManager = new ConnectionManager({
      createSyncImplementation: async () => {
        return this.portMutex.runExclusive(async () => {
          await this.waitForReady();
          if (!this.dbAdapter) {
            await this.openInternalDB();
          }

          const sync = this.generateStreamingImplementation();
          const onDispose = sync.registerListener({
            statusChanged: (status) => {
              this.updateAllStatuses(status.toJSON());
            }
          });

          return {
            sync,
            onDispose
          };
        });
      },
      logger: this.logger
    });
  }

  get lastSyncedAt(): Date | undefined {
    return this.connectionManager.syncStreamImplementation?.lastSyncedAt;
  }

  get isConnected(): boolean {
    return this.connectionManager.syncStreamImplementation?.isConnected ?? false;
  }

  async waitForStatus(status: SyncStatusOptions): Promise<void> {
    return this.withSyncImplementation(async (sync) => {
      return sync.waitForStatus(status);
    });
  }

  async waitUntilStatusMatches(predicate: (status: SyncStatus) => boolean): Promise<void> {
    return this.withSyncImplementation(async (sync) => {
      return sync.waitUntilStatusMatches(predicate);
    });
  }

  async waitForReady() {
    return this.isInitialized;
  }

  setLogLevel(level: ILogLevel) {
    this.logger.setLevel(level);
    this.broadCastLogger.setLevel(level);
  }

  /**
   * Configures the DBAdapter connection and a streaming sync client.
   */
  async setParams(params: SharedSyncInitOptions) {
    await this.portMutex.runExclusive(async () => {
      if (this.syncParams) {
        // Cannot modify already existing sync implementation params
        // But we can ask for a DB adapter, if required, at this point.

        if (!this.dbAdapter) {
          await this.openInternalDB();
        }
        return;
      }

      // First time setting params
      this.syncParams = params;
      if (params.streamOptions?.flags?.broadcastLogs) {
        this.logger = this.broadCastLogger;
      }

      self.onerror = (event) => {
        // Share any uncaught events on the broadcast logger
        this.logger.error('Uncaught exception in PowerSync shared sync worker', event);
      };

      if (!this.dbAdapter) {
        await this.openInternalDB();
      }

      this.iterateListeners((l) => l.initialized?.());
    });
  }

  async dispose() {
    await this.waitForReady();
    this.statusListener?.();
    return this.connectionManager.close();
  }

  /**
   * Connects to the PowerSync backend instance.
   * Multiple tabs can safely call this in their initialization.
   * The connection will simply be reconnected whenever a new tab
   * connects.
   */
  async connect(options?: PowerSyncConnectionOptions) {
    this.lastConnectOptions = options;
    return this.connectionManager.connect(CONNECTOR_PLACEHOLDER, options ?? {});
  }

  async disconnect() {
    return this.connectionManager.disconnect();
  }

  /**
   * Adds a new client tab's message port to the list of connected ports
   */
  async addPort(port: MessagePort) {
    await this.portMutex.runExclusive(() => {
      const portProvider = {
        port,
        clientProvider: Comlink.wrap<AbstractSharedSyncClientProvider>(port)
      };
      this.ports.push(portProvider);

      // Give the newly connected client the latest status
      const status = this.connectionManager.syncStreamImplementation?.syncStatus;
      if (status) {
        portProvider.clientProvider.statusChanged(status.toJSON());
      }
    });
  }

  /**
   * Removes a message port client from this manager's managed
   * clients.
   */
  async removePort(port: MessagePort) {
    // Remove the port within a mutex context.
    // Warns if the port is not found. This should not happen in practice.
    // We return early if the port is not found.
    const { trackedPort, shouldReconnect } = await this.portMutex.runExclusive(async () => {
      const index = this.ports.findIndex((p) => p.port == port);
      if (index < 0) {
        this.logger.warn(`Could not remove port ${port} since it is not present in active ports.`);
        return {};
      }

      const trackedPort = this.ports[index];
      // Remove from the list of active ports
      this.ports.splice(index, 1);

      /**
       * The port might currently be in use. Any active functions might
       * not resolve. Abort them here.
       */
      [this.fetchCredentialsController, this.uploadDataController].forEach((abortController) => {
        if (abortController?.activePort.port == port) {
          abortController!.controller.abort(
            new AbortOperation('Closing pending requests after client port is removed')
          );
        }
      });

      const shouldReconnect = !!this.connectionManager.syncStreamImplementation && this.ports.length > 0;

      return {
        shouldReconnect,
        trackedPort
      };
    });

    if (!trackedPort) {
      // We could not find the port to remove
      return () => {};
    }

    if (this.dbAdapter && this.dbAdapter == trackedPort.db) {
      if (shouldReconnect) {
        await this.connectionManager.disconnect();
      }

      // Clearing the adapter will result in a new one being opened in connect
      this.dbAdapter = null;

      if (shouldReconnect) {
        await this.connectionManager.connect(CONNECTOR_PLACEHOLDER, this.lastConnectOptions ?? {});
      }
    }

    if (trackedPort.db) {
      await trackedPort.db.close();
    }
    // Release proxy
    return () => trackedPort.clientProvider[Comlink.releaseProxy]();
  }

  triggerCrudUpload() {
    this.withSyncImplementation(async (sync) => {
      sync.triggerCrudUpload();
    });
  }

  async hasCompletedSync(): Promise<boolean> {
    return this.withSyncImplementation(async (sync) => {
      return sync.hasCompletedSync();
    });
  }

  async getWriteCheckpoint(): Promise<string> {
    return this.withSyncImplementation(async (sync) => {
      return sync.getWriteCheckpoint();
    });
  }

  protected async withSyncImplementation<T>(callback: (sync: StreamingSyncImplementation) => Promise<T>): Promise<T> {
    await this.waitForReady();

    if (this.connectionManager.syncStreamImplementation) {
      return callback(this.connectionManager.syncStreamImplementation);
    }

    const sync = await new Promise<StreamingSyncImplementation>((resolve) => {
      const dispose = this.connectionManager.registerListener({
        syncStreamCreated: (sync) => {
          resolve(sync);
          dispose?.();
        }
      });
    });

    return callback(sync);
  }

  protected generateStreamingImplementation() {
    // This should only be called after initialization has completed
    const syncParams = this.syncParams!;
    // Create a new StreamingSyncImplementation for each connect call. This is usually done is all SDKs.
    return new WebStreamingSyncImplementation({
      adapter: new SqliteBucketStorage(this.dbAdapter!, this.logger),
      remote: new WebRemote(
        {
          invalidateCredentials: async () => {
            const lastPort = this.ports[this.ports.length - 1];
            try {
              this.logger.log('calling the last port client provider to invalidate credentials');
              lastPort.clientProvider.invalidateCredentials();
            } catch (ex) {
              this.logger.error('error invalidating credentials', ex);
            }
          },
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
                this.logger.log('calling the last port client provider for credentials');
                resolve(await lastPort.clientProvider.fetchCredentials());
              } catch (ex) {
                reject(ex);
              } finally {
                this.fetchCredentialsController = undefined;
              }
            });
          }
        },
        this.logger
      ),
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
    if (!lastClient) {
      // Should not really happen in practice
      throw new Error(`Could not open DB connection since no client is connected.`);
    }
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
  private async _testUpdateAllStatuses(status: SyncStatusOptions) {
    if (!this.connectionManager.syncStreamImplementation) {
      // This is just for testing purposes
      this.connectionManager.syncStreamImplementation = this.generateStreamingImplementation();
    }

    // Only assigning, don't call listeners for this test
    this.connectionManager.syncStreamImplementation!.syncStatus = new SyncStatus(status);
    this.updateAllStatuses(status);
  }
}
