import Logger, { ILogger } from 'js-logger';

import { SyncStatus, SyncStatusOptions } from '../../../db/crud/SyncStatus.js';
import { AbortOperation } from '../../../utils/AbortOperation.js';
import { BaseListener, BaseObserver, BaseObserverInterface, Disposable } from '../../../utils/BaseObserver.js';
import { BucketStorageAdapter, PowerSyncControlCommand } from '../bucket/BucketStorageAdapter.js';
import { CrudEntry } from '../bucket/CrudEntry.js';
import { AbstractRemote, FetchStrategy, SyncStreamOptions } from './AbstractRemote.js';
import {
  Instruction,
  NonInterruptingInstruction,
  coreStatusToJs,
  isInterruptingInstruction
} from './core-instruction.js';
import {
  doneResult,
  injectable,
  InjectableIterator,
  notifyIterator,
  SimpleAsyncIterator,
  valueResult
} from '../../../utils/stream_transform.js';
import { StreamingSyncRequestParameterType } from './JsonValue.js';

export enum LockType {
  CRUD = 'crud',
  SYNC = 'sync'
}

export enum SyncStreamConnectionMethod {
  HTTP = 'http',
  WEB_SOCKET = 'web-socket'
}

export enum SyncClientImplementation {
  /**
   * This implementation offloads the sync line decoding and handling into the PowerSync
   * core extension.
   *
   * This is the only option, as an older JavaScript client implementation has been removed from the SDK.
   *
   * ## Compatibility warning
   *
   * The Rust sync client stores sync data in a format that is slightly different than the one used
   * by the old JavaScript client. When adopting the {@link RUST} client on existing databases, the PowerSync SDK will
   * migrate the format automatically.
   *
   * SDK versions supporting both the JavaScript and the Rust client support both formats with the JavaScript client
   * implementaiton. However, downgrading to an SDK version that only supports the JavaScript client would not be
   * possible anymore. Problematic SDK versions have been released before 2025-06-09.
   */
  RUST = 'rust'
}

/**
 * The default {@link SyncClientImplementation} to use, {@link SyncClientImplementation.RUST}.
 */
export const DEFAULT_SYNC_CLIENT_IMPLEMENTATION = SyncClientImplementation.RUST;

/**
 * Abstract Lock to be implemented by various JS environments
 */
export interface LockOptions<T> {
  callback: () => Promise<T>;
  type: LockType;
  signal?: AbortSignal;
}

export interface AbstractStreamingSyncImplementationOptions extends RequiredAdditionalConnectionOptions {
  adapter: BucketStorageAdapter;
  subscriptions: SubscribedStream[];
  uploadCrud: () => Promise<void>;
  /**
   * An identifier for which PowerSync DB this sync implementation is
   * linked to. Most commonly DB name, but not restricted to DB name.
   */
  identifier?: string;
  logger?: ILogger;
  remote: AbstractRemote;
}

export interface StreamingSyncImplementationListener extends BaseListener {
  /**
   * Triggered whenever a status update has been attempted to be made or
   * refreshed.
   */
  statusUpdated?: ((statusUpdate: SyncStatusOptions) => void) | undefined;
  /**
   * Triggers whenever the status' members have changed in value
   */
  statusChanged?: ((status: SyncStatus) => void) | undefined;
}

/**
 * Configurable options to be used when connecting to the PowerSync
 * backend instance.
 */
export type PowerSyncConnectionOptions = Omit<InternalConnectionOptions, 'serializedSchema'>;

export interface InternalConnectionOptions extends BaseConnectionOptions, AdditionalConnectionOptions {}

/** @internal */
export interface BaseConnectionOptions {
  /**
   * A set of metadata to be included in service logs.
   */
  appMetadata?: Record<string, string>;

  /**
   * @deprecated The Rust sync client is used unconditionally, so this option can't be configured.
   */
  clientImplementation?: SyncClientImplementation;

  /**
   * The connection method to use when streaming updates from
   * the PowerSync backend instance.
   * Defaults to a HTTP streaming connection.
   */
  connectionMethod?: SyncStreamConnectionMethod;

  /**
   * The fetch strategy to use when streaming updates from the PowerSync backend instance.
   */
  fetchStrategy?: FetchStrategy;

  /**
   * These parameters are passed to the sync rules, and will be available under the`user_parameters` object.
   */
  params?: Record<string, StreamingSyncRequestParameterType>;

  /**
   * Whether to include streams that have `auto_subscribe: true` in their definition.
   *
   * This defaults to `true`.
   */
  includeDefaultStreams?: boolean;

  /**
   * The serialized schema - mainly used to forward information about raw tables to the sync client.
   */
  serializedSchema?: any;
}

/** @internal */
export interface AdditionalConnectionOptions {
  /**
   * Delay for retrying sync streaming operations
   * from the PowerSync backend after an error occurs.
   */
  retryDelayMs?: number;
  /**
   * Backend Connector CRUD operations are throttled
   * to occur at most every `crudUploadThrottleMs`
   * milliseconds.
   */
  crudUploadThrottleMs?: number;
}

/** @internal */
export interface RequiredAdditionalConnectionOptions extends Required<AdditionalConnectionOptions> {
  subscriptions: SubscribedStream[];
}

export interface StreamingSyncImplementation
  extends BaseObserverInterface<StreamingSyncImplementationListener>, Disposable {
  /**
   * Connects to the sync service
   */
  connect(options?: InternalConnectionOptions): Promise<void>;
  /**
   * Disconnects from the sync services.
   * @throws if not connected or if abort is not controlled internally
   */
  disconnect(): Promise<void>;
  getWriteCheckpoint: () => Promise<string>;
  isConnected: boolean;
  syncStatus: SyncStatus;
  triggerCrudUpload: () => void;
  waitForReady(): Promise<void>;
  waitForStatus(status: SyncStatusOptions): Promise<void>;
  waitUntilStatusMatches(predicate: (status: SyncStatus) => boolean): Promise<void>;
  updateSubscriptions(subscriptions: SubscribedStream[]): void;
  markConnectionMayHaveChanged(): void;
}

export const DEFAULT_CRUD_UPLOAD_THROTTLE_MS = 1000;
export const DEFAULT_RETRY_DELAY_MS = 5000;

export const DEFAULT_STREAMING_SYNC_OPTIONS = {
  retryDelayMs: DEFAULT_RETRY_DELAY_MS,
  crudUploadThrottleMs: DEFAULT_CRUD_UPLOAD_THROTTLE_MS
};

export type RequiredPowerSyncConnectionOptions = Required<BaseConnectionOptions>;

export const DEFAULT_STREAM_CONNECTION_OPTIONS: RequiredPowerSyncConnectionOptions = {
  appMetadata: {},
  connectionMethod: SyncStreamConnectionMethod.WEB_SOCKET,
  clientImplementation: DEFAULT_SYNC_CLIENT_IMPLEMENTATION,
  fetchStrategy: FetchStrategy.Buffered,
  params: {},
  serializedSchema: undefined,
  includeDefaultStreams: true
};

export type SubscribedStream = {
  name: string;
  params: Record<string, any> | null;
};

// The priority we assume when we receive checkpoint lines where no priority is set.
// This is the default priority used by the sync service, but can be set to an arbitrary
// value since sync services without priorities also won't send partial sync completion
// messages.
const FALLBACK_PRIORITY = 3;

export abstract class AbstractStreamingSyncImplementation
  extends BaseObserver<StreamingSyncImplementationListener>
  implements StreamingSyncImplementation
{
  protected options: AbstractStreamingSyncImplementationOptions;
  protected abortController: AbortController | null;
  protected crudUpdateListener?: () => void;
  protected streamingSyncPromise?: Promise<void>;
  protected logger: ILogger;
  private activeStreams: SubscribedStream[];
  private connectionMayHaveChanged = false;
  private crudUploadNotifier = notifyIterator();

  private notifyCompletedUploads?: () => void;
  private handleActiveStreamsChange?: () => void;

  syncStatus: SyncStatus;
  triggerCrudUpload: () => void;

  constructor(options: AbstractStreamingSyncImplementationOptions) {
    super();
    this.options = options;
    this.activeStreams = options.subscriptions;
    this.logger = options.logger ?? Logger.get('PowerSyncStream');

    this.syncStatus = new SyncStatus({
      connected: false,
      connecting: false,
      lastSyncedAt: undefined,
      dataFlow: {
        uploading: false,
        downloading: false
      }
    });
    this.abortController = null;

    this.triggerCrudUpload = () => this.crudUploadNotifier.notify();
  }

  async waitForReady() {}

  waitForStatus(status: SyncStatusOptions): Promise<void> {
    return this.waitUntilStatusMatches((currentStatus) => {
      /**
       * Match only the partial status options provided in the
       * matching status
       */
      const matchPartialObject = (compA: object, compB: any): any => {
        return Object.entries(compA).every(([key, value]) => {
          const comparisonBValue = compB[key];
          if (typeof value == 'object' && typeof comparisonBValue == 'object') {
            return matchPartialObject(value, comparisonBValue);
          }
          return value == comparisonBValue;
        });
      };

      return matchPartialObject(status, currentStatus);
    });
  }

  waitUntilStatusMatches(predicate: (status: SyncStatus) => boolean): Promise<void> {
    return new Promise((resolve) => {
      if (predicate(this.syncStatus)) {
        resolve();
        return;
      }

      const l = this.registerListener({
        statusChanged: (updatedStatus) => {
          if (predicate(updatedStatus)) {
            resolve();
            l?.();
          }
        }
      });
    });
  }

  get lastSyncedAt() {
    const lastSynced = this.syncStatus.lastSyncedAt;
    return lastSynced && new Date(lastSynced);
  }

  get isConnected() {
    return this.syncStatus.connected;
  }

  async dispose() {
    super.dispose();
    this.crudUpdateListener?.();
    this.crudUpdateListener = undefined;
  }

  abstract obtainLock<T>(lockOptions: LockOptions<T>): Promise<T>;

  async getWriteCheckpoint(): Promise<string> {
    const clientId = await this.options.adapter.getClientId();
    let path = `/write-checkpoint2.json?client_id=${clientId}`;
    const response = await this.options.remote.get(path);
    const checkpoint = response['data']['write_checkpoint'] as string;
    this.logger.debug(`Created write checkpoint: ${checkpoint}`);
    return checkpoint;
  }

  private async crudUploadLoop(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      await Promise.all([
        // Start the initial CRUD upload on connect. Then, keep polling until we're done.
        this._uploadAllCrud(signal),
        this.delayRetry(signal, this.options.crudUploadThrottleMs!)
      ]);

      await this.crudUploadNotifier.next();
    }
  }

  private async _uploadAllCrud(signal: AbortSignal): Promise<void> {
    return this.obtainLock({
      type: LockType.CRUD,
      callback: async () => {
        /**
         * Keep track of the first item in the CRUD queue for the last `uploadCrud` iteration.
         */
        let checkedCrudItem: CrudEntry | undefined;

        while (!signal.aborted) {
          try {
            /**
             * This is the first item in the FIFO CRUD queue.
             */
            const nextCrudItem = await this.options.adapter.nextCrudItem();
            if (nextCrudItem) {
              this.updateSyncStatus({
                dataFlow: {
                  uploading: true
                }
              });

              if (nextCrudItem.clientId == checkedCrudItem?.clientId) {
                // This will force a higher log level than exceptions which are caught here.
                this.logger.warn(`Potentially previously uploaded CRUD entries are still present in the upload queue.
Make sure to handle uploads and complete CRUD transactions or batches by calling and awaiting their [.complete()] method.
The next upload iteration will be delayed.`);
                throw new Error('Delaying due to previously encountered CRUD item.');
              }

              checkedCrudItem = nextCrudItem;
              await this.options.uploadCrud();
              this.updateSyncStatus({
                dataFlow: {
                  uploadError: undefined
                }
              });
            } else {
              // Uploading is completed
              const neededUpdate = await this.options.adapter.updateLocalTarget(() => this.getWriteCheckpoint());
              if (neededUpdate == false && checkedCrudItem != null) {
                // Only log this if there was something to upload
                this.logger.debug('Upload complete, no write checkpoint needed.');
              }
              break;
            }
          } catch (ex) {
            checkedCrudItem = undefined;
            this.updateSyncStatus({
              dataFlow: {
                uploading: false,
                uploadError: ex as Error
              }
            });
            await this.delayRetry(signal);
            if (!this.isConnected) {
              // Exit the upload loop if the sync stream is no longer connected
              break;
            }
            this.logger.debug(
              `Caught exception when uploading. Upload will retry after a delay. Exception: ${(ex as Error).message}`
            );
          } finally {
            this.notifyCompletedUploads?.();

            this.updateSyncStatus({
              dataFlow: {
                uploading: false
              }
            });
          }
        }
      }
    });
  }

  async connect(options?: PowerSyncConnectionOptions) {
    if (this.abortController) {
      await this.disconnect();
    }

    const controller = new AbortController();
    this.abortController = controller;
    this.streamingSyncPromise = this.streamingSync(this.abortController.signal, options);

    // Return a promise that resolves when the connection status is updated to indicate that we're connected.
    return new Promise<void>((resolve) => {
      const disposer = this.registerListener({
        statusChanged: (status) => {
          if (status.dataFlowStatus.downloadError != null) {
            this.logger.warn('Initial connect attempt did not successfully connect to server');
          } else if (status.connecting) {
            // Still connecting.
            return;
          }

          disposer();
          resolve();
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    if (!this.abortController) {
      return;
    }

    // This might be called multiple times
    if (!this.abortController.signal.aborted) {
      this.abortController.abort(new AbortOperation('Disconnect has been requested'));
    }

    // Await any pending operations before completing the disconnect operation
    try {
      await this.streamingSyncPromise;
    } catch (ex) {
      // The operation might have failed, all we care about is if it has completed
      this.logger.warn(ex);
    }
    this.streamingSyncPromise = undefined;

    this.abortController = null;
    this.updateSyncStatus({ connected: false, connecting: false });
  }

  private async streamingSync(signal: AbortSignal, options?: PowerSyncConnectionOptions): Promise<void> {
    /**
     * Listen for CRUD updates and trigger upstream uploads
     */
    this.crudUpdateListener = this.options.adapter.registerListener({
      crudUpdate: () => this.triggerCrudUpload()
    });

    /**
     * Create a new abort controller which aborts items downstream.
     * This is needed to close any previous connections on exception.
     */
    let nestedAbortController = new AbortController();

    signal.addEventListener('abort', () => {
      /**
       * A request for disconnect was received upstream. Relay the request
       * to the nested abort controller.
       */
      nestedAbortController.abort(signal?.reason ?? new AbortOperation('Received command to disconnect from upstream'));
      this.crudUpdateListener?.();
      this.crudUpdateListener = undefined;
      this.updateSyncStatus({
        connected: false,
        connecting: false,
        dataFlow: {
          downloading: false,
          downloadProgress: null
        }
      });
    });

    this.crudUploadLoop(signal);

    /**
     * This loops runs until [retry] is false or the abort signal is set to aborted.
     * Aborting the nestedAbortController will:
     *  - Abort any pending fetch requests
     *  - Close any sync stream ReadableStreams (which will also close any established network requests)
     */
    while (true) {
      this.updateSyncStatus({ connecting: true });
      let shouldDelayRetry = true;
      let result: RustIterationResult | null = null;

      try {
        if (signal?.aborted) {
          break;
        }
        result = await this.streamingSyncIteration(nestedAbortController.signal, options);
        // Continue immediately, streamingSyncIteration will wait before completing if necessary.
      } catch (ex) {
        /**
         * Either:
         *  - A network request failed with a failed connection or not OKAY response code.
         *  - There was a sync processing error.
         *  - The connection was aborted.
         * This loop will retry after a delay if the connection was not aborted.
         * The nested abort controller will cleanup any open network requests and streams.
         * The WebRemote should only abort pending fetch requests or close active Readable streams.
         */

        if (ex instanceof AbortOperation) {
          this.logger.warn(ex);
          shouldDelayRetry = false;
          // A disconnect was requested, we should not delay since there is no explicit retry
        } else if (this.connectionMayHaveChanged && (ex as Error).message?.indexOf('No iteration is active') >= 0) {
          this.connectionMayHaveChanged = false;
          this.logger.info('Sync error after changed connection, retrying immediately');
          shouldDelayRetry = false;
        } else {
          this.logger.error(ex);
        }

        this.updateSyncStatus({
          dataFlow: {
            downloadError: ex as Error
          }
        });
      } finally {
        this.notifyCompletedUploads = undefined;

        if (!signal.aborted) {
          nestedAbortController.abort(new AbortOperation('Closing sync stream network requests before retry.'));
          nestedAbortController = new AbortController();
        }

        if (result?.immediateRestart != true) {
          this.updateSyncStatus({
            connected: false,
            connecting: true // May be unnecessary
          });

          // On error, wait a little before retrying
          if (shouldDelayRetry) {
            await this.delayRetry(nestedAbortController.signal);
          }
        }
      }
    }

    // Mark as disconnected if here
    this.updateSyncStatus({ connected: false, connecting: false });
  }

  markConnectionMayHaveChanged() {
    // By setting this field, we'll immediately retry if the next sync event causes an error triggered by us not having
    // an active sync iteration on the connection in use.
    this.connectionMayHaveChanged = true;

    // This triggers a `powersync_control` invocation if a sync iteration is currently active. This is a cheap call to
    // make when no subscriptions have actually changed, we're mainly interested in this immediately throwing if no
    // iteration is active. That allows us to reconnect ASAP, instead of having to wait for the next sync line.
    this.handleActiveStreamsChange?.();
  }

  /**
   * Older versions of the JS SDK used to encode subkeys as JSON in {@link OplogEntry.toJSON}.
   * Because subkeys are always strings, this leads to quotes being added around them in `ps_oplog`.
   * While this is not a problem as long as it's done consistently, it causes issues when a database
   * created by the JS SDK is used with other SDKs, or (more likely) when the new Rust sync client
   * is enabled.
   *
   * So, we add a migration from the old key format (with quotes) to the new one (no quotes). The
   * migration is only triggered when necessary (for now). The function returns whether the new format
   * should be used, so that the JS SDK is able to write to updated databases.
   *
   * @param requireFixedKeyFormat Whether we require the new format or also support the old one.
   *        The Rust client requires the new subkey format.
   * @returns Whether the database is now using the new, fixed subkey format.
   */
  private async requireKeyFormat(requireFixedKeyFormat: boolean): Promise<boolean> {
    const hasMigrated = await this.options.adapter.hasMigratedSubkeys();
    if (requireFixedKeyFormat && !hasMigrated) {
      await this.options.adapter.migrateToFixedSubkeys();
      return true;
    } else {
      return hasMigrated;
    }
  }

  protected streamingSyncIteration(
    signal: AbortSignal,
    options?: PowerSyncConnectionOptions
  ): Promise<RustIterationResult | null> {
    return this.obtainLock({
      type: LockType.SYNC,
      signal,
      callback: async () => {
        const resolvedOptions: RequiredPowerSyncConnectionOptions = {
          ...DEFAULT_STREAM_CONNECTION_OPTIONS,
          ...(options ?? {})
        };

        // Validate app metadata
        const invalidMetadata = Object.entries(resolvedOptions.appMetadata).filter(
          ([_, value]) => typeof value != 'string'
        );
        if (invalidMetadata.length > 0) {
          throw new Error(
            `Invalid appMetadata provided. Only string values are allowed. Invalid values: ${invalidMetadata.map(([key, value]) => `${key}: ${value}`).join(', ')}`
          );
        }

        await this.requireKeyFormat(true);
        return await this.rustSyncIteration(signal, resolvedOptions);
      }
    });
  }

  private receiveSyncLines(data: {
    options: SyncStreamOptions;
    connection: RequiredPowerSyncConnectionOptions;
  }): SimpleAsyncIterator<EnqueuedCommand> {
    const { options, connection } = data;
    const remote = this.options.remote;

    const openInner = async () => {
      if (connection.connectionMethod == SyncStreamConnectionMethod.HTTP) {
        return await remote.fetchStream(options);
      } else {
        return await this.options.remote.socketStreamRaw({
          ...options,
          ...{ fetchStrategy: connection.fetchStrategy }
        });
      }
    };

    let inner: SimpleAsyncIterator<string | Uint8Array> | undefined;
    let done = false;

    return {
      async next(): Promise<IteratorResult<EnqueuedCommand>> {
        if (done) {
          return doneResult;
        } else if (inner == null) {
          inner = await openInner();
          // We're connected here, so we can tell the core extension about it.
          return valueResult<EnqueuedCommand>({
            command: PowerSyncControlCommand.CONNECTION_STATE,
            payload: 'established'
          });
        } else {
          const event = await inner.next();
          if (event.done) {
            done = true;
            return valueResult<EnqueuedCommand>({ command: PowerSyncControlCommand.CONNECTION_STATE, payload: 'end' });
          } else {
            return valueResult<EnqueuedCommand>({
              command:
                typeof event.value == 'string'
                  ? PowerSyncControlCommand.PROCESS_TEXT_LINE
                  : PowerSyncControlCommand.PROCESS_BSON_LINE,
              payload: event.value
            });
          }
        }
      }
    };
  }

  private async rustSyncIteration(
    signal: AbortSignal,
    resolvedOptions: RequiredPowerSyncConnectionOptions
  ): Promise<RustIterationResult> {
    const syncImplementation = this;
    const adapter = this.options.adapter;
    const remote = this.options.remote;
    let hideDisconnectOnRestart = false;
    let notifyTokenRefreshed: (() => void) | undefined;

    if (signal.aborted) {
      throw new AbortOperation('Connection request has been aborted');
    }

    function startCommand() {
      const options: any = {
        parameters: resolvedOptions.params,
        app_metadata: resolvedOptions.appMetadata,
        active_streams: syncImplementation.activeStreams,
        include_defaults: resolvedOptions.includeDefaultStreams
      };
      if (resolvedOptions.serializedSchema) {
        options.schema = resolvedOptions.serializedSchema;
      }

      return invokePowerSyncControl(PowerSyncControlCommand.START, JSON.stringify(options));
    }

    async function stop() {
      const instructions = await invokePowerSyncControl(PowerSyncControlCommand.STOP);
      for (const instruction of instructions) {
        // We don't need to handle interrupting instructions since we're unconditionally ending the sync iteration at
        // this point.
        if (isInterruptingInstruction(instruction)) continue;
        await handleInstruction(instruction);
      }
    }

    async function invokePowerSyncControl(
      op: PowerSyncControlCommand,
      payload?: Uint8Array | string
    ): Promise<Instruction[]> {
      const rawResponse = await adapter.control(op, payload ?? null);
      const logger = syncImplementation.logger;
      logger.trace(
        'powersync_control',
        op,
        payload == null || typeof payload == 'string' ? payload : '<bytes>',
        rawResponse
      );

      if (op != PowerSyncControlCommand.STOP) {
        // Evidently we have a working connection here, otherwise powersync_control would have failed.
        syncImplementation.connectionMayHaveChanged = false;
      }

      return JSON.parse(rawResponse);
    }

    async function handleInstruction(instruction: NonInterruptingInstruction) {
      if ('LogLine' in instruction) {
        switch (instruction.LogLine.severity) {
          case 'DEBUG':
            syncImplementation.logger.debug(instruction.LogLine.line);
            break;
          case 'INFO':
            syncImplementation.logger.info(instruction.LogLine.line);
            break;
          case 'WARNING':
            syncImplementation.logger.warn(instruction.LogLine.line);
            break;
        }
      } else if ('UpdateSyncStatus' in instruction) {
        syncImplementation.updateSyncStatus(coreStatusToJs(instruction.UpdateSyncStatus.status));
      } else if ('FetchCredentials' in instruction) {
        if (instruction.FetchCredentials.did_expire) {
          remote.invalidateCredentials();
        } else {
          remote.invalidateCredentials();

          // Restart iteration after the credentials have been refreshed.
          remote.fetchCredentials().then(
            (_) => {
              notifyTokenRefreshed?.();
            },
            (err) => {
              syncImplementation.logger.warn('Could not prefetch credentials', err);
            }
          );
        }
      } else if ('FlushFileSystem' in instruction) {
        // Not necessary on JS platforms.
      } else if ('DidCompleteSync' in instruction) {
        syncImplementation.updateSyncStatus({
          dataFlow: {
            downloadError: undefined
          }
        });
      }
    }

    try {
      const defaultResult = { immediateRestart: false };
      // Pending sync lines received from the service, as well as local events that trigger a powersync_control
      // invocation (local events include refreshed tokens and completed uploads).
      // This is a single data stream so that we can handle all control calls from a single place.
      let controlInvocations: InjectableIterator<EnqueuedCommand> | null = null;

      for (const startInstruction of await startCommand()) {
        if ('EstablishSyncStream' in startInstruction) {
          const syncOptions: SyncStreamOptions = {
            path: '/sync/stream',
            abortSignal: signal,
            data: startInstruction.EstablishSyncStream.request
          };

          controlInvocations = injectable(
            syncImplementation.receiveSyncLines({
              options: syncOptions,
              connection: resolvedOptions
            })
          );
        } else if ('CloseSyncStream' in startInstruction) {
          return defaultResult;
        } else {
          await handleInstruction(startInstruction);
        }
      }
      if (controlInvocations == null) return defaultResult;

      this.notifyCompletedUploads = () => {
        controlInvocations.inject({ command: PowerSyncControlCommand.NOTIFY_CRUD_UPLOAD_COMPLETED });
      };
      this.handleActiveStreamsChange = () => {
        controlInvocations.inject({
          command: PowerSyncControlCommand.UPDATE_SUBSCRIPTIONS,
          payload: JSON.stringify(this.activeStreams)
        });
      };
      notifyTokenRefreshed = () => {
        controlInvocations.inject({
          command: PowerSyncControlCommand.NOTIFY_TOKEN_REFRESHED
        });
      };

      let hadSyncLine = false;
      loop: while (true) {
        const { done, value } = await controlInvocations.next();
        if (done) break;

        if (!hadSyncLine) {
          // Trigger a local CRUD upload when the first sync line has been received, this allows uploading local changes
          // that have been made while offline or disconnected.
          if (
            value.command == PowerSyncControlCommand.PROCESS_TEXT_LINE ||
            value.command == PowerSyncControlCommand.PROCESS_BSON_LINE
          ) {
            hadSyncLine = true;
            this.triggerCrudUpload?.();
          }
        }

        const instructions = await invokePowerSyncControl(value.command, value.payload);
        for (const instruction of instructions) {
          if ('EstablishSyncStream' in instruction) {
            throw new Error('Received EstablishSyncStream while already connected.');
          } else if ('CloseSyncStream' in instruction) {
            hideDisconnectOnRestart = instruction.CloseSyncStream.hide_disconnect;
            break loop;
          } else {
            await handleInstruction(instruction);
          }
        }
      }
    } finally {
      this.notifyCompletedUploads = this.handleActiveStreamsChange = undefined;
      notifyTokenRefreshed = undefined;
      await stop();
    }

    return { immediateRestart: hideDisconnectOnRestart };
  }

  protected updateSyncStatus(options: SyncStatusOptions) {
    const updatedStatus = new SyncStatus({
      connected: options.connected ?? this.syncStatus.connected,
      connecting: !options.connected && (options.connecting ?? this.syncStatus.connecting),
      lastSyncedAt: options.lastSyncedAt ?? this.syncStatus.lastSyncedAt,
      dataFlow: {
        ...this.syncStatus.dataFlowStatus,
        ...options.dataFlow
      },
      priorityStatusEntries: options.priorityStatusEntries ?? this.syncStatus.priorityStatusEntries,
      clientImplementation: options.clientImplementation ?? this.syncStatus.clientImplementation
    });

    if (!this.syncStatus.isEqual(updatedStatus)) {
      this.syncStatus = updatedStatus;
      // Only trigger this is there was a change
      this.iterateListeners((cb) => cb.statusChanged?.(updatedStatus));
    }

    // trigger this for all updates
    this.iterateListeners((cb) => cb.statusUpdated?.(options));
  }

  private async delayRetry(signal?: AbortSignal, delay = this.options.retryDelayMs): Promise<void> {
    return new Promise((resolve) => {
      if (signal?.aborted) {
        // If the signal is already aborted, resolve immediately
        resolve();
        return;
      }

      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const endDelay = () => {
        resolve();
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
        signal?.removeEventListener('abort', endDelay);
      };

      signal?.addEventListener('abort', endDelay, { once: true });
      timeoutId = setTimeout(endDelay, delay);
    });
  }

  updateSubscriptions(subscriptions: SubscribedStream[]): void {
    this.activeStreams = subscriptions;
    this.handleActiveStreamsChange?.();
  }
}

interface EnqueuedCommand {
  command: PowerSyncControlCommand;
  payload?: Uint8Array | string;
}

interface RustIterationResult {
  immediateRestart: boolean;
}
