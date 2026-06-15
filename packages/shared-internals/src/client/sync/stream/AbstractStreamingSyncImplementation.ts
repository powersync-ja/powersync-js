import {
  BaseObserverInterface,
  BaseListener,
  CrudEntry,
  Disposable,
  LogLevels,
  PowerSyncLogger,
  SyncStreamConnectionMethod,
  ResolvedSyncOptions,
  SyncStatus,
  SyncDataFlowStatus
} from '@powersync/common';

import { AbortOperation } from '../../../utils/AbortOperation.js';
import { BaseObserver } from '../../../utils/BaseObserver.js';
import { BucketStorageAdapter, PowerSyncControlCommand } from '../bucket/BucketStorageAdapter.js';
import { AbstractRemote, SyncStreamOptions } from './AbstractRemote.js';
import {
  CoreSyncStatus,
  Instruction,
  NonInterruptingInstruction,
  isInterruptingInstruction
} from './core-instruction.js';
import {
  doneResult,
  injectable,
  InjectableIterator,
  SimpleAsyncIterator,
  valueResult
} from '../../../utils/stream_transform.js';
import { asyncNotifier } from '../../../utils/async.js';
import { SyncStatusSnapshot } from '../../../db/crud/SyncStatus.js';

/**
 * @internal
 */
export enum LockType {
  CRUD = 'crud',
  SYNC = 'sync'
}

/**
 * Abstract Lock to be implemented by various JS environments
 *
 * @internal
 */
export interface LockOptions<T> {
  callback: () => Promise<T>;
  type: LockType;
  signal?: AbortSignal;
}

/**
 * @internal
 */
export interface AbstractStreamingSyncImplementationOptions {
  adapter: BucketStorageAdapter;
  subscriptions: SubscribedStream[];
  uploadCrud: () => Promise<void>;
  /**
   * An identifier for which PowerSync DB this sync implementation is
   * linked to. Most commonly DB name, but not restricted to DB name.
   */
  identifier?: string;
  logger: PowerSyncLogger;
  remote: AbstractRemote;
  /**
   * The serialized schema - mainly used to forward information about raw tables to the sync client.
   */
  serializedSchema: any;
}

/**
 * @internal
 */
export interface StreamingSyncImplementationListener extends BaseListener {
  /**
   * Triggers whenever the status' members have changed in value
   */
  statusChanged?: ((core: CoreSyncStatus | null, dataFlow: SyncDataFlowStatus) => void) | undefined;
}

/**
 * @internal
 */
export interface StreamingSyncImplementation
  extends BaseObserverInterface<StreamingSyncImplementationListener>, Disposable {
  /**
   * Connects to the sync service
   */
  connect(options: ResolvedSyncOptions): Promise<void>;
  /**
   * Disconnects from the sync services.
   * @throws if not connected or if abort is not controlled internally
   */
  disconnect(): Promise<void>;
  getWriteCheckpoint: () => Promise<string>;
  isConnected: boolean;
  triggerCrudUpload: () => void;
  waitForReady(): Promise<void>;
  waitUntilStatusMatches(predicate: (status: SyncStatus) => boolean): Promise<void>;
  updateSubscriptions(subscriptions: SubscribedStream[]): void;
  markConnectionMayHaveChanged(): void;
}

/**
 * @internal
 */
export type SubscribedStream = {
  name: string;
  params: Record<string, any> | null;
};

/**
 * @internal
 */
export abstract class AbstractStreamingSyncImplementation
  extends BaseObserver<StreamingSyncImplementationListener>
  implements StreamingSyncImplementation
{
  protected options: AbstractStreamingSyncImplementationOptions;
  protected abortController: AbortController | null;
  protected crudUpdateListener?: () => void;
  protected streamingSyncPromise?: Promise<[void, void]>;
  protected logger: PowerSyncLogger;
  private activeStreams: SubscribedStream[];
  private connectionMayHaveChanged = false;
  private crudUploadNotifier = asyncNotifier();

  private notifyCompletedUploads?: () => void;
  private handleActiveStreamsChange?: () => void;

  syncStatus: SyncStatusSnapshot;

  constructor(options: AbstractStreamingSyncImplementationOptions) {
    super();
    this.options = options;
    this.activeStreams = options.subscriptions;
    this.logger = options.logger;

    this.syncStatus = new SyncStatusSnapshot(null, {});
    this.abortController = null;
  }

  triggerCrudUpload() {
    this.crudUploadNotifier.notify();
  }

  async waitForReady() {}

  waitUntilStatusMatches(predicate: (status: SyncStatus) => boolean): Promise<void> {
    return new Promise((resolve) => {
      if (predicate(this.syncStatus)) {
        resolve();
        return;
      }

      const l = this.registerListener({
        statusChanged: () => {
          if (predicate(this.syncStatus)) {
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
    this.logger.log({ level: LogLevels.debug, message: `Created write checkpoint: ${checkpoint}` });
    return checkpoint;
  }

  private async crudUploadLoop(signal: AbortSignal, options: ResolvedSyncOptions): Promise<void> {
    while (!signal.aborted) {
      await Promise.all([
        // Start the initial CRUD upload on connect. Then, keep polling until we're done.
        this._uploadAllCrud(signal, options),
        this.delayRetry(signal, options.crudUploadThrottleMs)
      ]);

      await this.crudUploadNotifier.waitForNotification(signal);
    }
  }

  private async _uploadAllCrud(signal: AbortSignal, options: ResolvedSyncOptions): Promise<void> {
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
              this.updateDataFlowStatus({ uploading: true });

              if (nextCrudItem.clientId == checkedCrudItem?.clientId) {
                // This will force a higher log level than exceptions which are caught here.
                this.logger.log({
                  level: LogLevels.warn,
                  message: `Potentially previously uploaded CRUD entries are still present in the upload queue.
Make sure to handle uploads and complete CRUD transactions or batches by calling and awaiting their [.complete()] method.
The next upload iteration will be delayed.`
                });

                throw new Error('Delaying due to previously encountered CRUD item.');
              }

              checkedCrudItem = nextCrudItem;
              await this.options.uploadCrud();
              this.updateDataFlowStatus({ uploadError: undefined });
            } else {
              // Uploading is completed
              const neededUpdate = await this.options.adapter.updateLocalTarget(() => this.getWriteCheckpoint());
              if (neededUpdate) {
                this.notifyCompletedUploads?.();
              } else if (checkedCrudItem != null) {
                // Only log this if there was something to upload
                this.logger.log({ level: LogLevels.debug, message: 'Upload complete, no write checkpoint needed.' });
              }
              break;
            }
          } catch (ex) {
            checkedCrudItem = undefined;
            this.updateDataFlowStatus({ uploading: false, uploadError: ex as Error });
            await this.delayRetry(signal, options.retryDelayMs);
            if (!this.isConnected) {
              // Exit the upload loop if the sync stream is no longer connected
              break;
            }
            this.logger.log({
              level: LogLevels.debug,
              message: `Caught exception when uploading. Upload will retry after a delay.`,
              error: ex
            });
          } finally {
            this.updateDataFlowStatus({ uploading: false });
          }
        }
      }
    });
  }

  async connect(options: ResolvedSyncOptions) {
    if (this.abortController) {
      await this.disconnect();
    }

    const controller = new AbortController();
    this.abortController = controller;
    this.streamingSyncPromise = Promise.all([
      this.crudUploadLoop(controller.signal, options).catch((error) =>
        this.logger.log({ level: LogLevels.error, message: 'Error in crud upload loop', error })
      ),
      this.streamingSync(controller.signal, options)
    ]);

    // Return a promise that resolves when the connection status is updated to indicate that we're connected.
    return new Promise<void>((resolve) => {
      const disposer = this.registerListener({
        statusChanged: (status, dataFlow) => {
          if (dataFlow.downloadError != null) {
            this.logger.log({
              level: LogLevels.warn,
              message: 'Initial connect attempt did not successfully connect to server'
            });
          } else if (status && status.connecting) {
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
      this.logger.log({ level: LogLevels.warn, message: 'Error in sync while disconnecting', error: ex });
    }
    this.streamingSyncPromise = undefined;

    this.abortController = null;
    this.markAsDisconnected();
  }

  private markAsDisconnected() {
    const current = this.syncStatus.core;
    this.updateSyncStatus({
      connected: false,
      connecting: false,
      priority_status: current?.priority_status ?? [],
      downloading: null,
      streams: current?.streams ?? []
    });
  }

  private async streamingSync(signal: AbortSignal, options: ResolvedSyncOptions): Promise<void> {
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
      this.markAsDisconnected();
    });

    /**
     * This loops runs until [retry] is false or the abort signal is set to aborted.
     * Aborting the nestedAbortController will:
     *  - Abort any pending fetch requests
     *  - Close any sync stream ReadableStreams (which will also close any established network requests)
     */
    while (true) {
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
          this.logger.log({ level: LogLevels.warn, message: 'Sync aborted', error: ex });
          shouldDelayRetry = false;
          // A disconnect was requested, we should not delay since there is no explicit retry
        } else if (this.connectionMayHaveChanged && (ex as Error).message?.indexOf('No iteration is active') >= 0) {
          this.connectionMayHaveChanged = false;
          this.logger.log({
            level: LogLevels.info,
            message: 'Sync error after changed connection, retrying immediately'
          });
          shouldDelayRetry = false;
        } else {
          this.logger.log({ level: LogLevels.error, message: 'Sync error', error: ex });
        }

        this.updateDataFlowStatus({ downloadError: ex as Error });
      } finally {
        this.notifyCompletedUploads = undefined;

        if (!signal.aborted) {
          nestedAbortController.abort(new AbortOperation('Closing sync stream network requests before retry.'));
          nestedAbortController = new AbortController();
        }

        if (result?.immediateRestart != true) {
          this.markAsDisconnected();

          // On error, wait a little before retrying
          if (shouldDelayRetry) {
            await this.delayRetry(nestedAbortController.signal, options.retryDelayMs);
          }
        }
      }
    }

    // Mark as disconnected if here
    this.markAsDisconnected();
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
   * Older versions of the JS SDK used to encode subkeys as JSON in `OplogEntry.toJSON`.
   * Because subkeys are always strings, this leads to quotes being added around them in `ps_oplog`.
   * While this is not a problem as long as it's done consistently, it causes issues when a database
   * created by the JS SDK is used with other SDKs, or (more likely) when the new Rust sync client
   * is enabled.
   *
   * So, we add a migration from the old key format (with quotes) to the new one (no quotes). The
   * migration is only triggered when necessary (for now). The function returns whether the new format
   * should be used, so that the JS SDK is able to write to updated databases.
   *
   * @param requireFixedKeyFormat - Whether we require the new format or also support the old one.
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
    options: ResolvedSyncOptions
  ): Promise<RustIterationResult | null> {
    return this.obtainLock({
      type: LockType.SYNC,
      signal,
      callback: async () => {
        // Validate app metadata
        const invalidMetadata = Object.entries(options.appMetadata).filter(([_, value]) => typeof value != 'string');
        if (invalidMetadata.length > 0) {
          throw new Error(
            `Invalid appMetadata provided. Only string values are allowed. Invalid values: ${invalidMetadata.map(([key, value]) => `${key}: ${value}`).join(', ')}`
          );
        }

        await this.requireKeyFormat(true);
        return await this.rustSyncIteration(signal, options);
      }
    });
  }

  private receiveSyncLines(data: {
    options: SyncStreamOptions;
    connection: ResolvedSyncOptions;
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
    resolvedOptions: ResolvedSyncOptions
  ): Promise<RustIterationResult> {
    const syncImplementation = this;
    const adapter = this.options.adapter;
    const remote = this.options.remote;
    let hideDisconnectOnRestart = false;
    let notifyTokenRefreshed: (() => void) | undefined;

    if (signal.aborted) {
      throw new AbortOperation('Connection request has been aborted');
    }

    const serializedSchema = this.options.serializedSchema;
    function startCommand() {
      const options: any = {
        parameters: resolvedOptions.params,
        app_metadata: resolvedOptions.appMetadata,
        active_streams: syncImplementation.activeStreams,
        include_defaults: resolvedOptions.includeDefaultStreams
      };
      if (serializedSchema) {
        options.schema = serializedSchema;
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
      const payloadDesc = payload == null || typeof payload == 'string' ? payload : '<bytes>';

      syncImplementation.logger.log({
        level: LogLevels.trace,
        message: `powersync_control(${op}, ${payloadDesc}) -> ${rawResponse}`
      });

      if (op != PowerSyncControlCommand.STOP) {
        // Evidently we have a working connection here, otherwise powersync_control would have failed.
        syncImplementation.connectionMayHaveChanged = false;
      }

      return JSON.parse(rawResponse);
    }

    async function handleInstruction(instruction: NonInterruptingInstruction) {
      if ('LogLine' in instruction) {
        const { severity, line } = instruction.LogLine;

        switch (severity) {
          case 'DEBUG':
            syncImplementation.logger.log({
              level: LogLevels.debug,
              message: line
            });
            break;
          case 'INFO':
            syncImplementation.logger.log({
              level: LogLevels.info,
              message: line
            });
            break;
          case 'WARNING':
            syncImplementation.logger.log({
              level: LogLevels.warn,
              message: line
            });
            break;
        }
      } else if ('UpdateSyncStatus' in instruction) {
        syncImplementation.updateSyncStatus(instruction.UpdateSyncStatus.status);
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
              syncImplementation.logger.log({
                level: LogLevels.warn,
                message: 'Could not prefetch credentials',
                error: err
              });
            }
          );
        }
      } else if ('FlushFileSystem' in instruction) {
        // Not necessary on JS platforms.
      } else if ('DidCompleteSync' in instruction) {
        syncImplementation.updateDataFlowStatus({ downloadError: undefined });
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

  protected updateSyncStatus(core: CoreSyncStatus | null, dataFlow?: SyncDataFlowStatus) {
    const updated = new SyncStatusSnapshot(core, {
      ...this.syncStatus.dataFlowStatus,
      ...dataFlow
    });

    if (!this.syncStatus.isEqual(updated)) {
      this.syncStatus = updated;
      // Only trigger this is there was a change
      this.iterateListeners((cb) => cb.statusChanged?.(updated.core, updated.dataFlowStatus));
    }
  }

  protected updateDataFlowStatus(dataFlow: SyncDataFlowStatus) {
    this.updateSyncStatus(this.syncStatus.core, dataFlow);
  }

  private async delayRetry(signal: AbortSignal, delay: number): Promise<void> {
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
