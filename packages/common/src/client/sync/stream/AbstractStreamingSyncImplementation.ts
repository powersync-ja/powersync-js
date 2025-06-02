import Logger, { ILogger } from 'js-logger';

import { InternalProgressInformation } from 'src/db/crud/SyncProgress.js';
import { DataStream } from 'src/utils/DataStream.js';
import { SyncStatus, SyncStatusOptions } from '../../../db/crud/SyncStatus.js';
import { AbortOperation } from '../../../utils/AbortOperation.js';
import { BaseListener, BaseObserver, Disposable } from '../../../utils/BaseObserver.js';
import { onAbortPromise, throttleLeadingTrailing } from '../../../utils/async.js';
import { BucketChecksum, BucketDescription, BucketStorageAdapter, Checkpoint } from '../bucket/BucketStorageAdapter.js';
import { CrudEntry } from '../bucket/CrudEntry.js';
import { SyncDataBucket } from '../bucket/SyncDataBucket.js';
import { AbstractRemote, FetchStrategy, SyncStreamOptions } from './AbstractRemote.js';
import {
  BucketRequest,
  StreamingSyncLine,
  StreamingSyncRequestParameterType,
  isStreamingKeepalive,
  isStreamingSyncCheckpoint,
  isStreamingSyncCheckpointComplete,
  isStreamingSyncCheckpointDiff,
  isStreamingSyncCheckpointPartiallyComplete,
  isStreamingSyncData
} from './streaming-sync-types.js';

export enum LockType {
  CRUD = 'crud',
  SYNC = 'sync'
}

export enum SyncStreamConnectionMethod {
  HTTP = 'http',
  WEB_SOCKET = 'web-socket'
}

/**
 * Abstract Lock to be implemented by various JS environments
 */
export interface LockOptions<T> {
  callback: () => Promise<T>;
  type: LockType;
  signal?: AbortSignal;
}

export interface AbstractStreamingSyncImplementationOptions extends AdditionalConnectionOptions {
  adapter: BucketStorageAdapter;
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
export interface PowerSyncConnectionOptions extends BaseConnectionOptions, AdditionalConnectionOptions {}

/** @internal */
export interface BaseConnectionOptions {
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
export type RequiredAdditionalConnectionOptions = Required<AdditionalConnectionOptions>;

export interface StreamingSyncImplementation extends BaseObserver<StreamingSyncImplementationListener>, Disposable {
  /**
   * Connects to the sync service
   */
  connect(options?: PowerSyncConnectionOptions): Promise<void>;
  /**
   * Disconnects from the sync services.
   * @throws if not connected or if abort is not controlled internally
   */
  disconnect(): Promise<void>;
  getWriteCheckpoint: () => Promise<string>;
  hasCompletedSync: () => Promise<boolean>;
  isConnected: boolean;
  lastSyncedAt?: Date;
  syncStatus: SyncStatus;
  triggerCrudUpload: () => void;
  waitForReady(): Promise<void>;
  waitForStatus(status: SyncStatusOptions): Promise<void>;
  waitUntilStatusMatches(predicate: (status: SyncStatus) => boolean): Promise<void>;
}

export const DEFAULT_CRUD_UPLOAD_THROTTLE_MS = 1000;
export const DEFAULT_RETRY_DELAY_MS = 5000;

export const DEFAULT_STREAMING_SYNC_OPTIONS = {
  retryDelayMs: DEFAULT_RETRY_DELAY_MS,
  logger: Logger.get('PowerSyncStream'),
  crudUploadThrottleMs: DEFAULT_CRUD_UPLOAD_THROTTLE_MS
};

export type RequiredPowerSyncConnectionOptions = Required<BaseConnectionOptions>;

export const DEFAULT_STREAM_CONNECTION_OPTIONS: RequiredPowerSyncConnectionOptions = {
  connectionMethod: SyncStreamConnectionMethod.WEB_SOCKET,
  fetchStrategy: FetchStrategy.Buffered,
  params: {}
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
  protected _lastSyncedAt: Date | null;
  protected options: AbstractStreamingSyncImplementationOptions;
  protected abortController: AbortController | null;
  protected crudUpdateListener?: () => void;
  protected streamingSyncPromise?: Promise<void>;
  private pendingCrudUpload?: Promise<void>;

  syncStatus: SyncStatus;
  triggerCrudUpload: () => void;

  constructor(options: AbstractStreamingSyncImplementationOptions) {
    super();
    this.options = { ...DEFAULT_STREAMING_SYNC_OPTIONS, ...options };

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

    this.triggerCrudUpload = throttleLeadingTrailing(() => {
      if (!this.syncStatus.connected || this.pendingCrudUpload != null) {
        return;
      }

      this.pendingCrudUpload = new Promise((resolve) => {
        this._uploadAllCrud().finally(() => {
          this.pendingCrudUpload = undefined;
          resolve();
        });
      });
    }, this.options.crudUploadThrottleMs!);
  }

  async waitForReady() {}

  waitForStatus(status: SyncStatusOptions): Promise<void> {
    return this.waitUntilStatusMatches((currentStatus) => {
      /**
       * Match only the partial status options provided in the
       * matching status
       */
      const matchPartialObject = (compA: object, compB: object) => {
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

  protected get logger() {
    return this.options.logger!;
  }

  async dispose() {
    this.crudUpdateListener?.();
    this.crudUpdateListener = undefined;
  }

  abstract obtainLock<T>(lockOptions: LockOptions<T>): Promise<T>;

  async hasCompletedSync() {
    return this.options.adapter.hasCompletedSync();
  }

  async getWriteCheckpoint(): Promise<string> {
    const clientId = await this.options.adapter.getClientId();
    let path = `/write-checkpoint2.json?client_id=${clientId}`;
    const response = await this.options.remote.get(path);
    return response['data']['write_checkpoint'] as string;
  }

  protected async _uploadAllCrud(): Promise<void> {
    return this.obtainLock({
      type: LockType.CRUD,
      callback: async () => {
        /**
         * Keep track of the first item in the CRUD queue for the last `uploadCrud` iteration.
         */
        let checkedCrudItem: CrudEntry | undefined;

        while (true) {
          this.updateSyncStatus({
            dataFlow: {
              uploading: true
            }
          });
          try {
            /**
             * This is the first item in the FIFO CRUD queue.
             */
            const nextCrudItem = await this.options.adapter.nextCrudItem();
            if (nextCrudItem) {
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
              await this.options.adapter.updateLocalTarget(() => this.getWriteCheckpoint());
              break;
            }
          } catch (ex) {
            checkedCrudItem = undefined;
            this.updateSyncStatus({
              dataFlow: {
                uploading: false,
                uploadError: ex
              }
            });
            await this.delayRetry();
            if (!this.isConnected) {
              // Exit the upload loop if the sync stream is no longer connected
              break;
            }
            this.logger.debug(
              `Caught exception when uploading. Upload will retry after a delay. Exception: ${ex.message}`
            );
          } finally {
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

    // Return a promise that resolves when the connection status is updated
    return new Promise<void>((resolve) => {
      const disposer = this.registerListener({
        statusUpdated: (update) => {
          // This is triggered as soon as a connection is read from
          if (typeof update.connected == 'undefined') {
            // only concern with connection updates
            return;
          }

          if (update.connected == false) {
            /**
             * This function does not reject if initial connect attempt failed.
             * Connected can be false if the connection attempt was aborted or if the initial connection
             * attempt failed.
             */
            this.logger.warn('Initial connect attempt did not successfully connect to server');
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

  /**
   * @deprecated use [connect instead]
   */
  async streamingSync(signal?: AbortSignal, options?: PowerSyncConnectionOptions): Promise<void> {
    if (!signal) {
      this.abortController = new AbortController();
      signal = this.abortController.signal;
    }

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

    /**
     * This loops runs until [retry] is false or the abort signal is set to aborted.
     * Aborting the nestedAbortController will:
     *  - Abort any pending fetch requests
     *  - Close any sync stream ReadableStreams (which will also close any established network requests)
     */
    while (true) {
      this.updateSyncStatus({ connecting: true });
      try {
        if (signal?.aborted) {
          break;
        }
        await this.streamingSyncIteration(nestedAbortController.signal, options);
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
        let delay = true;
        if (ex instanceof AbortOperation) {
          this.logger.warn(ex);
          delay = false;
          // A disconnect was requested, we should not delay since there is no explicit retry
        } else {
          this.logger.error(ex);
        }

        this.updateSyncStatus({
          dataFlow: {
            downloadError: ex
          }
        });

        // On error, wait a little before retrying
        if (delay) {
          await this.delayRetry();
        }
      } finally {
        if (!signal.aborted) {
          nestedAbortController.abort(new AbortOperation('Closing sync stream network requests before retry.'));
          nestedAbortController = new AbortController();
        }

        this.updateSyncStatus({
          connected: false,
          connecting: true // May be unnecessary
        });
      }
    }

    // Mark as disconnected if here
    this.updateSyncStatus({ connected: false, connecting: false });
  }

  private async collectLocalBucketState(): Promise<[BucketRequest[], Map<string, BucketDescription | null>]> {
    const bucketEntries = await this.options.adapter.getBucketStates();
    const req: BucketRequest[] = bucketEntries.map((entry) => ({
      name: entry.bucket,
      after: entry.op_id
    }));
    const localDescriptions = new Map<string, BucketDescription | null>();
    for (const entry of bucketEntries) {
      localDescriptions.set(entry.bucket, null);
    }

    return [req, localDescriptions];
  }

  protected async streamingSyncIteration(signal: AbortSignal, options?: PowerSyncConnectionOptions): Promise<void> {
    await this.obtainLock({
      type: LockType.SYNC,
      signal,
      callback: async () => {
        const resolvedOptions: RequiredPowerSyncConnectionOptions = {
          ...DEFAULT_STREAM_CONNECTION_OPTIONS,
          ...(options ?? {})
        };

        this.logger.debug('Streaming sync iteration started');
        this.options.adapter.startSession();
        let [req, bucketMap] = await this.collectLocalBucketState();

        // These are compared by reference
        let targetCheckpoint: Checkpoint | null = null;
        let validatedCheckpoint: Checkpoint | null = null;
        let appliedCheckpoint: Checkpoint | null = null;

        const clientId = await this.options.adapter.getClientId();

        if (signal.aborted) {
          return;
        }

        this.logger.debug('Requesting stream from server');

        const syncOptions: SyncStreamOptions = {
          path: '/sync/stream',
          abortSignal: signal,
          data: {
            buckets: req,
            include_checksum: true,
            raw_data: true,
            parameters: resolvedOptions.params,
            client_id: clientId
          }
        };

        let stream: DataStream<StreamingSyncLine>;
        if (resolvedOptions?.connectionMethod == SyncStreamConnectionMethod.HTTP) {
          stream = await this.options.remote.postStream(syncOptions);
        } else {
          stream = await this.options.remote.socketStream({
            ...syncOptions,
            ...{ fetchStrategy: resolvedOptions.fetchStrategy }
          });
        }

        this.logger.debug('Stream established. Processing events');

        while (!stream.closed) {
          const line = await stream.read();
          if (!line) {
            // The stream has closed while waiting
            return;
          }

          // A connection is active and messages are being received
          if (!this.syncStatus.connected) {
            // There is a connection now
            Promise.resolve().then(() => this.triggerCrudUpload());
            this.updateSyncStatus({
              connected: true
            });
          }

          if (isStreamingSyncCheckpoint(line)) {
            targetCheckpoint = line.checkpoint;
            const bucketsToDelete = new Set<string>(bucketMap.keys());
            const newBuckets = new Map<string, BucketDescription>();
            for (const checksum of line.checkpoint.buckets) {
              newBuckets.set(checksum.bucket, {
                name: checksum.bucket,
                priority: checksum.priority ?? FALLBACK_PRIORITY
              });
              bucketsToDelete.delete(checksum.bucket);
            }
            if (bucketsToDelete.size > 0) {
              this.logger.debug('Removing buckets', [...bucketsToDelete]);
            }
            bucketMap = newBuckets;
            await this.options.adapter.removeBuckets([...bucketsToDelete]);
            await this.options.adapter.setTargetCheckpoint(targetCheckpoint);
            await this.updateSyncStatusForStartingCheckpoint(targetCheckpoint);
          } else if (isStreamingSyncCheckpointComplete(line)) {
            const result = await this.applyCheckpoint(targetCheckpoint!, signal);
            if (result.endIteration) {
              return;
            } else if (result.applied) {
              appliedCheckpoint = targetCheckpoint;
            }
            validatedCheckpoint = targetCheckpoint;
          } else if (isStreamingSyncCheckpointPartiallyComplete(line)) {
            const priority = line.partial_checkpoint_complete.priority;
            this.logger.debug('Partial checkpoint complete', priority);
            const result = await this.options.adapter.syncLocalDatabase(targetCheckpoint!, priority);
            if (!result.checkpointValid) {
              // This means checksums failed. Start again with a new checkpoint.
              // TODO: better back-off
              await new Promise((resolve) => setTimeout(resolve, 50));
              return;
            } else if (!result.ready) {
              // If we have pending uploads, we can't complete new checkpoints outside of priority 0.
              // We'll resolve this for a complete checkpoint.
            } else {
              // We'll keep on downloading, but can report that this priority is synced now.
              this.logger.debug('partial checkpoint validation succeeded');

              // All states with a higher priority can be deleted since this partial sync includes them.
              const priorityStates = this.syncStatus.priorityStatusEntries.filter((s) => s.priority <= priority);
              priorityStates.push({
                priority,
                lastSyncedAt: new Date(),
                hasSynced: true
              });

              this.updateSyncStatus({
                connected: true,
                priorityStatusEntries: priorityStates
              });
            }
          } else if (isStreamingSyncCheckpointDiff(line)) {
            // TODO: It may be faster to just keep track of the diff, instead of the entire checkpoint
            if (targetCheckpoint == null) {
              throw new Error('Checkpoint diff without previous checkpoint');
            }
            const diff = line.checkpoint_diff;
            const newBuckets = new Map<string, BucketChecksum>();
            for (const checksum of targetCheckpoint.buckets) {
              newBuckets.set(checksum.bucket, checksum);
            }
            for (const checksum of diff.updated_buckets) {
              newBuckets.set(checksum.bucket, checksum);
            }
            for (const bucket of diff.removed_buckets) {
              newBuckets.delete(bucket);
            }

            const newCheckpoint: Checkpoint = {
              last_op_id: diff.last_op_id,
              buckets: [...newBuckets.values()],
              write_checkpoint: diff.write_checkpoint
            };
            targetCheckpoint = newCheckpoint;
            await this.updateSyncStatusForStartingCheckpoint(targetCheckpoint);

            bucketMap = new Map();
            newBuckets.forEach((checksum, name) =>
              bucketMap.set(name, {
                name: checksum.bucket,
                priority: checksum.priority ?? FALLBACK_PRIORITY
              })
            );

            const bucketsToDelete = diff.removed_buckets;
            if (bucketsToDelete.length > 0) {
              this.logger.debug('Remove buckets', bucketsToDelete);
            }
            await this.options.adapter.removeBuckets(bucketsToDelete);
            await this.options.adapter.setTargetCheckpoint(targetCheckpoint);
          } else if (isStreamingSyncData(line)) {
            const { data } = line;
            const previousProgress = this.syncStatus.dataFlowStatus.downloadProgress;
            let updatedProgress: InternalProgressInformation | null = null;
            if (previousProgress) {
              updatedProgress = { ...previousProgress };
              const progressForBucket = updatedProgress[data.bucket];
              if (progressForBucket) {
                updatedProgress[data.bucket] = {
                  ...progressForBucket,
                  sinceLast: Math.min(
                    progressForBucket.sinceLast + data.data.length,
                    progressForBucket.targetCount - progressForBucket.atLast
                  )
                };
              }
            }

            this.updateSyncStatus({
              dataFlow: {
                downloading: true,
                downloadProgress: updatedProgress
              }
            });
            await this.options.adapter.saveSyncData({ buckets: [SyncDataBucket.fromRow(data)] });
          } else if (isStreamingKeepalive(line)) {
            const remaining_seconds = line.token_expires_in;
            if (remaining_seconds == 0) {
              // Connection would be closed automatically right after this
              this.logger.debug('Token expiring; reconnect');
              this.options.remote.invalidateCredentials();

              /**
               * For a rare case where the backend connector does not update the token
               * (uses the same one), this should have some delay.
               */
              await this.delayRetry();
              return;
            } else if (remaining_seconds < 30) {
              this.logger.debug('Token will expire soon; reconnect');
              // Pre-emptively refresh the token
              this.options.remote.invalidateCredentials();
              return;
            }
            this.triggerCrudUpload();
          } else {
            this.logger.debug('Sync complete');

            if (targetCheckpoint === appliedCheckpoint) {
              this.updateSyncStatus({
                connected: true,
                lastSyncedAt: new Date(),
                priorityStatusEntries: [],
                dataFlow: {
                  downloadError: undefined
                }
              });
            } else if (validatedCheckpoint === targetCheckpoint) {
              const result = await this.applyCheckpoint(targetCheckpoint!, signal);
              if (result.endIteration) {
                return;
              } else if (result.applied) {
                appliedCheckpoint = targetCheckpoint;
              }
            }
          }
        }
        this.logger.debug('Stream input empty');
        // Connection closed. Likely due to auth issue.
        return;
      }
    });
  }

  private async updateSyncStatusForStartingCheckpoint(checkpoint: Checkpoint) {
    const localProgress = await this.options.adapter.getBucketOperationProgress();
    const progress: InternalProgressInformation = {};
    let invalidated = false;

    for (const bucket of checkpoint.buckets) {
      const savedProgress = localProgress[bucket.bucket];
      const atLast = savedProgress?.atLast ?? 0;
      const sinceLast = savedProgress?.sinceLast ?? 0;

      progress[bucket.bucket] = {
        // The fallback priority doesn't matter here, but 3 is the one newer versions of the sync service
        // will use by default.
        priority: bucket.priority ?? 3,
        atLast: atLast,
        sinceLast: sinceLast,
        targetCount: bucket.count ?? 0
      };

      if (bucket.count != null && bucket.count < atLast + sinceLast) {
        // Either due to a defrag / sync rule deploy or a compaction operation, the size
        // of the bucket shrank so much that the local ops exceed the ops in the updated
        // bucket. We can't prossibly report progress in this case (it would overshoot 100%).
        invalidated = true;
      }
    }

    if (invalidated) {
      for (const bucket in progress) {
        const bucketProgress = progress[bucket];
        bucketProgress.atLast = 0;
        bucketProgress.sinceLast = 0;
      }
    }

    this.updateSyncStatus({
      dataFlow: {
        downloading: true,
        downloadProgress: progress
      }
    });
  }

  private async applyCheckpoint(checkpoint: Checkpoint, abort: AbortSignal) {
    let result = await this.options.adapter.syncLocalDatabase(checkpoint);
    const pending = this.pendingCrudUpload;

    if (!result.checkpointValid) {
      this.logger.debug('Checksum mismatch in checkpoint, will reconnect');
      // This means checksums failed. Start again with a new checkpoint.
      // TODO: better back-off
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { applied: false, endIteration: true };
    } else if (!result.ready && pending != null) {
      // We have pending entries in the local upload queue or are waiting to confirm a write
      // checkpoint, which prevented this checkpoint from applying. Wait for that to complete and
      // try again.
      this.logger.debug(
        'Could not apply checkpoint due to local data. Waiting for in-progress upload before retrying.'
      );
      await Promise.race([pending, onAbortPromise(abort)]);

      if (abort.aborted) {
        return { applied: false, endIteration: true };
      }

      // Try again now that uploads have completed.
      result = await this.options.adapter.syncLocalDatabase(checkpoint);
    }

    if (result.checkpointValid && result.ready) {
      this.logger.debug('validated checkpoint', checkpoint);
      this.updateSyncStatus({
        connected: true,
        lastSyncedAt: new Date(),
        dataFlow: {
          downloading: false,
          downloadProgress: null,
          downloadError: undefined
        }
      });

      return { applied: true, endIteration: false };
    } else {
      this.logger.debug('Could not apply checkpoint. Waiting for next sync complete line.');
      return { applied: false, endIteration: false };
    }
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
      priorityStatusEntries: options.priorityStatusEntries ?? this.syncStatus.priorityStatusEntries
    });

    if (!this.syncStatus.isEqual(updatedStatus)) {
      this.syncStatus = updatedStatus;
      // Only trigger this is there was a change
      this.iterateListeners((cb) => cb.statusChanged?.(updatedStatus));
    }

    // trigger this for all updates
    this.iterateListeners((cb) => cb.statusUpdated?.(options));
  }

  private async delayRetry() {
    return new Promise((resolve) => setTimeout(resolve, this.options.retryDelayMs));
  }
}
