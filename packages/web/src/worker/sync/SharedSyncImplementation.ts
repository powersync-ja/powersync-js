import {
  AbortOperation,
  BaseObserver,
  ConnectionManager,
  ConnectionPool,
  DBAdapter,
  DBAdapterDefaultMixin,
  DBAdapterListener,
  DBLockOptions,
  LockContext,
  PowerSyncBackendConnector,
  SqliteBucketStorage,
  SubscribedStream,
  SyncStatus,
  createLogger,
  Mutex,
  type ILogLevel,
  type ILogger,
  type PowerSyncConnectionOptions,
  type StreamingSyncImplementation,
  type StreamingSyncImplementationListener,
  type SyncStatusOptions
} from '@powersync/common';
import * as Comlink from 'comlink';
import { WebRemote } from '../../db/sync/WebRemote.js';
import {
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from '../../db/sync/WebStreamingSyncImplementation.js';

import { ResolvedWebSQLOpenOptions } from '../../db/adapters/web-sql-flags.js';
import { AbstractSharedSyncClientProvider } from './AbstractSharedSyncClientProvider.js';
import { BroadcastLogger } from './BroadcastLogger.js';
import { DatabaseClient, OpenWorkerConnection } from '../../db/adapters/wa-sqlite/DatabaseClient.js';
import { generateTabCloseSignal } from '../../shared/tab_close_signal.js';

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
  streamOptions: Omit<WebStreamingSyncImplementationOptions, 'adapter' | 'uploadCrud' | 'remote' | 'subscriptions'>;
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
  currentSubscriptions: SubscribedStream[];
  closeListeners: (() => void | Promise<void>)[];
  isClosing: boolean;
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
export class SharedSyncImplementation extends BaseObserver<SharedSyncImplementationListener> {
  protected ports: WrappedSyncPort[];

  protected isInitialized: Promise<void>;
  protected statusListener?: () => void;

  protected fetchCredentialsController?: RemoteOperationAbortController;
  protected uploadDataController?: RemoteOperationAbortController;

  protected syncParams: SharedSyncInitOptions | null;
  protected logger: ILogger;
  protected lastConnectOptions: PowerSyncConnectionOptions | undefined;
  protected portMutex: Mutex;
  private subscriptions: SubscribedStream[] = [];

  protected connectionManager: ConnectionManager;
  syncStatus: SyncStatus;
  broadCastLogger: ILogger;
  protected readonly database = this.generateReconnectableDatabase();

  constructor() {
    super();
    this.ports = [];
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
        await this.waitForReady();

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

  /**
   * Gets the last client port which we know is safe from unexpected closes.
   */
  protected async getLastWrappedPort(): Promise<WrappedSyncPort | undefined> {
    // Find the last port which is not closing
    return await this.portMutex.runExclusive(() => {
      for (let i = this.ports.length - 1; i >= 0; i--) {
        if (!this.ports[i].isClosing) {
          return this.ports[i];
        }
      }
      return;
    });
  }

  /**
   * In some very rare cases a specific tab might not respond to requests.
   * This returns a random port which is not closing.
   */
  protected async getRandomWrappedPort(): Promise<WrappedSyncPort | undefined> {
    return await this.portMutex.runExclusive(() => {
      const nonClosingPorts = this.ports.filter((p) => !p.isClosing);
      return nonClosingPorts[Math.floor(Math.random() * nonClosingPorts.length)];
    });
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

  private collectActiveSubscriptions() {
    this.logger.debug('Collecting active stream subscriptions across tabs');
    const active = new Map<string, SubscribedStream>();
    for (const port of this.ports) {
      for (const stream of port.currentSubscriptions) {
        const serializedKey = JSON.stringify(stream);
        active.set(serializedKey, stream);
      }
    }
    this.subscriptions = [...active.values()];
    this.logger.debug('Collected stream subscriptions', this.subscriptions);
    this.connectionManager.syncStreamImplementation?.updateSubscriptions(this.subscriptions);
  }

  updateSubscriptions(port: WrappedSyncPort, subscriptions: SubscribedStream[]) {
    port.currentSubscriptions = subscriptions;
    this.collectActiveSubscriptions();
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
      this.collectActiveSubscriptions();
    });

    if (this.syncParams) {
      // Cannot modify already existing sync implementation params
      return;
    }

    // First time setting params
    this.syncParams = params;
    if (params.streamOptions?.flags?.broadcastLogs) {
      this.logger = this.broadCastLogger;
    }

    // Ensure we have a usable database connection, the reconnectable database will connect lazily on first use.
    await this.database.readLock(async () => {});

    self.onerror = (event) => {
      // Share any uncaught events on the broadcast logger
      this.logger.error('Uncaught exception in PowerSync shared sync worker', event);
    };

    this.iterateListeners((l) => l.initialized?.());
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
    return await this.portMutex.runExclusive(() => {
      const portProvider = {
        port,
        clientProvider: Comlink.wrap<AbstractSharedSyncClientProvider>(port),
        currentSubscriptions: [],
        closeListeners: [],
        isClosing: false
      } satisfies WrappedSyncPort;
      this.ports.push(portProvider);

      // Give the newly connected client the latest status
      const status = this.connectionManager.syncStreamImplementation?.syncStatus;
      if (status) {
        portProvider.clientProvider.statusChanged(status.toJSON());
      }

      return portProvider;
    });
  }

  /**
   * Removes a message port client from this manager's managed
   * clients.
   */
  async removePort(port: WrappedSyncPort) {
    // Ports might be removed faster than we can process them.
    port.isClosing = true;

    // Remove the port within a mutex context.
    // Warns if the port is not found. This should not happen in practice.
    // We return early if the port is not found.
    return await this.portMutex.runExclusive(async () => {
      const index = this.ports.findIndex((p) => p == port);
      if (index < 0) {
        this.logger.warn(`Could not remove port ${port} since it is not present in active ports.`);
        return () => {};
      }

      const trackedPort = this.ports[index];
      // Remove from the list of active ports
      this.ports.splice(index, 1);

      /**
       * The port might currently be in use. Any active functions might
       * not resolve. Abort them here.
       */
      [this.fetchCredentialsController, this.uploadDataController].forEach((abortController) => {
        if (abortController?.activePort == port) {
          abortController!.controller.abort(
            new AbortOperation('Closing pending requests after client port is removed')
          );
        }
      });

      // Close the worker wrapped database connection, we can't accurately rely on this connection
      for (const closeListener of trackedPort.closeListeners) {
        await closeListener();
      }

      this.collectActiveSubscriptions();

      return () => trackedPort.clientProvider[Comlink.releaseProxy]();
    });
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
      adapter: new SqliteBucketStorage(this.database, this.logger),
      remote: new WebRemote(
        {
          invalidateCredentials: async () => {
            const lastPort = await this.getLastWrappedPort();
            if (!lastPort) {
              throw new Error('No client port found to invalidate credentials');
            }
            try {
              this.logger.log('calling the last port client provider to invalidate credentials');
              lastPort.clientProvider.invalidateCredentials();
            } catch (ex) {
              this.logger.error('error invalidating credentials', ex);
            }
          },
          fetchCredentials: async () => {
            const lastPort = await this.getLastWrappedPort();
            if (!lastPort) {
              throw new Error('No client port found to fetch credentials');
            }
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
        const lastPort = await this.getLastWrappedPort();
        if (!lastPort) {
          throw new Error('No client port found to upload crud');
        }

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
      subscriptions: this.subscriptions,
      // Logger cannot be transferred just yet
      logger: this.logger
    });
  }

  /**
   * Requests a random client to share its database connection with us.
   */
  private async openInternalDB(
    handleClosed: (db: DatabaseClient<ResolvedWebSQLOpenOptions>) => void
  ): Promise<DatabaseClient<ResolvedWebSQLOpenOptions>> {
    const client = await this.getRandomWrappedPort();
    if (!client) {
      // Should not really happen in practice
      throw new Error(`Could not open DB connection since no client is connected.`);
    }

    // Fail-safe timeout for opening a database connection.
    const timeout = setTimeout(() => {
      abortController.abort();
    }, 10_000);

    /**
     * Handle cases where the client might close while opening a connection.
     */
    const abortController = new AbortController();
    const closeListener = () => {
      abortController.abort();
    };

    const removeCloseListener = () => {
      const index = client.closeListeners.indexOf(closeListener);
      if (index >= 0) {
        client.closeListeners.splice(index, 1);
      }
    };

    client.closeListeners.push(closeListener);

    const workerPort = await withAbort({
      action: () => client.clientProvider.getDBWorkerPort(),
      signal: abortController.signal,
      cleanupOnAbort: (port) => {
        port.close();
      }
    }).catch((ex) => {
      removeCloseListener();
      throw ex;
    });

    const remote = Comlink.wrap<OpenWorkerConnection>(workerPort);
    const identifier = this.syncParams!.dbParams.dbFilename;

    const clientLockName = await generateTabCloseSignal();

    /**
     * The open could fail if the tab is closed while we're busy opening the database.
     * This operation is typically executed inside an exclusive portMutex lock.
     * We typically execute the closeListeners using the portMutex in a different context.
     * We can't rely on the closeListeners to abort the operation if the tab is closed.
     */
    const db = await withAbort({
      action: async () => {
        const clientView = await remote.connectToExisting({ identifier, lockName: clientLockName });
        return new DatabaseClient<ResolvedWebSQLOpenOptions>(
          {
            connection: clientView,
            source: remote,
            // It's possible for this worker to outlive the client hosting the database for us. We need to be prepared for
            // that and ensure pending requests are aborted when the tab is closed.
            remoteCanCloseUnexpectedly: true
          },
          this.syncParams!.dbParams
        );
      },
      signal: abortController.signal,
      cleanupOnAbort: (db) => {
        db.close();
      }
    }).finally(() => {
      // We can remove the close listener here since we no longer need it past this point.
      removeCloseListener();
    });

    clearTimeout(timeout);

    client.closeListeners.push(async () => {
      this.logger.info('Aborting open connection because associated tab closed.');
      handleClosed(db);
      /**
       * Don't await this close operation. It might never resolve if the tab is closed.
       * We mark the remote as closed first, this will reject any pending requests.
       * We then call close. The close operation is configured to fire-and-forget, the main promise will reject immediately.
       */
      db.markRemoteClosed();
      db.close().catch((ex) => this.logger.warn('error closing database connection', ex));
    });
    return db;
  }

  private generateReconnectableDatabase(): DBAdapter {
    const syncParams = this.syncParams;
    const sharedSync = this;

    class ReconnectPool extends BaseObserver<DBAdapterListener> implements ConnectionPool {
      private connectionState:
        | null
        | DatabaseClient<ResolvedWebSQLOpenOptions>
        | Promise<DatabaseClient<ResolvedWebSQLOpenOptions>> = null;

      get name(): string {
        return syncParams?.dbParams.dbFilename!;
      }

      private async connect(): Promise<DatabaseClient<ResolvedWebSQLOpenOptions>> {
        if (this.connectionState == null) {
          const handleClosed = this.handleClientClosed.bind(this);
          this.connectionState = (async () => {
            try {
              const db = await sharedSync.openInternalDB(handleClosed);
              db.registerListener({
                tablesUpdated: (notification) => {
                  this.iterateListeners((l) => l.tablesUpdated?.(notification));
                }
              });
              this.connectionState = db;
              return db;
            } catch (e) {
              // Allow reconnecting when the database is used again.
              this.connectionState = null;
              throw e;
            }
          })();
        }

        return await this.connectionState;
      }

      async close() {
        if (this.connectionState != null) {
          await (await this.connectionState).close();
        }
      }

      handleClientClosed(client: DatabaseClient<ResolvedWebSQLOpenOptions>) {
        if (client === this.connectionState) {
          this.connectionState = null;

          // We may have missed some table updates while the database was closed.
          // We can poke the crud in case we missed any updates.
          const impl = sharedSync.connectionManager.syncStreamImplementation! as WebStreamingSyncImplementation;
          impl?.triggerCrudUpload();

          /**
           * FIXME or IMPROVE ME
           * The Rust client implementation stores sync state on the connection level.
           * Reopening the database causes a state machine error which should cause the
           * StreamingSyncImplementation to reconnect. It would be nicer if we could trigger
           * this reconnect earlier.
           * This reconnect is not required for IndexedDB.
           */
        }
      }

      async readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
        const db = await this.connect();
        return db.readLock(fn, options);
      }

      async writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
        const db = await this.connect();
        return db.writeLock(fn, options);
      }

      async refreshSchema(): Promise<void> {
        // Not used by sync client.
      }
    }

    const Adapter = DBAdapterDefaultMixin(ReconnectPool);
    return new Adapter();
  }

  /**
   * A method to update the all shared statuses for each
   * client.
   */
  private updateAllStatuses(status: SyncStatusOptions) {
    this.syncStatus = new SyncStatus(status);
    this.ports.forEach((p) => p.clientProvider.statusChanged(status));
  }
}

/**
 * Runs the action with an abort controller.
 */
function withAbort<T>(options: {
  action: () => Promise<T>;
  signal: AbortSignal;
  cleanupOnAbort?: (result: T) => void;
}): Promise<T> {
  const { action, signal, cleanupOnAbort } = options;
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new AbortOperation('Operation aborted by abort controller'));
      return;
    }

    function handleAbort() {
      signal.removeEventListener('abort', handleAbort);
      reject(new AbortOperation('Operation aborted by abort controller'));
    }

    signal.addEventListener('abort', handleAbort, { once: true });

    function completePromise(action: () => void) {
      signal.removeEventListener('abort', handleAbort);
      action();
    }

    action()
      .then((data) => {
        // We already rejected due to the abort, allow for cleanup
        if (signal.aborted) {
          return completePromise(() => cleanupOnAbort?.(data));
        }
        completePromise(() => resolve(data));
      })
      .catch((e) => completePromise(() => reject(e)));
  });
}
