import * as Comlink from 'comlink';
import Logger from 'js-logger';
import {
  AbstractStreamingSyncImplementation,
  StreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  BaseObserver,
  LockOptions,
  PowerSyncCredentials,
  SqliteBucketStorage,
  StreamingSyncImplementationListener,
  SyncStatus,
  SyncStatusOptions
} from '@journeyapps/powersync-sdk-common';
import { WebStreamingSyncImplementation } from '../../db/sync/WebStreamingSyncImplementation';
import { Mutex } from 'async-mutex';
import { WebRemote } from '../../db/sync/WebRemote';

import { WASQLiteDBAdapter } from '../../db/adapters/wa-sqlite/WASQLiteDBAdapter';

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

/**
 * The client side port should provide these methods.
 */
export abstract class AbstractSharedSyncClientProvider {
  abstract fetchCredentials(): Promise<PowerSyncCredentials>;
  abstract uploadCrud(): Promise<void>;
  abstract statusChanged(status: SyncStatusOptions): void;
}

export type WrappedSyncPort = {
  port: MessagePort;
  clientProvider: Comlink.Remote<AbstractSharedSyncClientProvider>;
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

  syncStatus: SyncStatus;

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
  }

  get lastSyncedAt(): Date | null {
    return this.syncStreamClient?.lastSyncedAt ?? null;
  }

  get isConnected(): boolean {
    return this.syncStreamClient?.isConnected ?? false;
  }

  async isReady() {
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
          flags: { enableMultiTabs: true }
        }),
        new Mutex()
      ),
      remote: new WebRemote({
        fetchCredentials: async () => {
          const lastPort = this.ports[this.ports.length - 1];
          return lastPort.clientProvider.fetchCredentials();
        }
      }),
      uploadCrud: async () => {
        const lastPort = this.ports[this.ports.length - 1];
        return lastPort.clientProvider.uploadCrud();
      },
      ...params.streamOptions,
      // Logger cannot be transferred just yet
      logger: Logger.get(`Shared Sync ${params.dbName}`)
    });

    this.syncStreamClient.registerListener({
      statusChanged: (status) => {
        this.syncStatus = status;
        this.ports.forEach((p) => p.clientProvider.statusChanged(status.toJSON()));
      }
    });

    this.iterateListeners((l) => l.initialized?.());
  }

  async dispose() {
    await this.isReady();
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
    await this.isReady();
    this.disconnect();
    this.abortController = new AbortController();
    this.syncStreamClient?.streamingSync(this.abortController.signal);
  }

  async disconnect() {
    this.abortController?.abort();
    this.iterateListeners((l) => l.statusChanged?.(new SyncStatus({ connected: false })));
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

    this.ports.splice(index, 1);
  }

  triggerCrudUpload() {
    this.isReady().then(() => this.syncStreamClient?.triggerCrudUpload());
  }

  async obtainLock<T>(lockOptions: LockOptions<T>): Promise<T> {
    await this.isReady();
    return this.syncStreamClient!.obtainLock(lockOptions);
  }

  async hasCompletedSync(): Promise<boolean> {
    await this.isReady();
    return this.syncStreamClient!.hasCompletedSync();
  }

  async getWriteCheckpoint(): Promise<string> {
    await this.isReady();
    return this.syncStreamClient!.getWriteCheckpoint();
  }
}
