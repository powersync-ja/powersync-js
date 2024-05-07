import throttle from 'lodash/throttle';

import Logger, { ILogger } from 'js-logger';

import {
  BucketRequest,
  isStreamingKeepalive,
  isStreamingSyncCheckpoint,
  isStreamingSyncCheckpointComplete,
  isStreamingSyncCheckpointDiff,
  isStreamingSyncData
} from './streaming-sync-types';
import { AbstractRemote, SyncStreamOptions } from './AbstractRemote';
import { BucketChecksum, BucketStorageAdapter, Checkpoint } from '../bucket/BucketStorageAdapter';
import { SyncStatus, SyncStatusOptions } from '../../../db/crud/SyncStatus';
import { SyncDataBucket } from '../bucket/SyncDataBucket';
import { BaseObserver, BaseListener, Disposable } from '../../../utils/BaseObserver';
import { AbortOperation } from '../../../utils/AbortOperation';

export enum LockType {
  CRUD = 'crud',
  SYNC = 'sync'
}
/**
 * Abstract Lock to be implemented by various JS environments
 */
export interface LockOptions<T> {
  callback: () => Promise<T>;
  type: LockType;
  signal?: AbortSignal;
}

export interface AbstractStreamingSyncImplementationOptions {
  adapter: BucketStorageAdapter;
  uploadCrud: () => Promise<void>;
  crudUploadThrottleMs?: number;
  /**
   * An identifier for which PowerSync DB this sync implementation is
   * linked to. Most commonly DB name, but not restricted to DB name.
   */
  identifier?: string;
  logger?: ILogger;
  remote: AbstractRemote;
  retryDelayMs?: number;
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
export interface PowerSyncConnectionOptions {
  /**
   * The connection method to use when streaming updates from
   * the PowerSync backend instance.
   * Defaults to a HTTP streaming connection.
   */
  connectionMethod?: SyncStreamConnectionMethod;
}

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
}

export enum SyncStreamConnectionMethod {
  HTTP = 'http',
  WEB_SOCKET = 'web-socket'
}

export const DEFAULT_CRUD_UPLOAD_THROTTLE_MS = 1000;

export const DEFAULT_STREAMING_SYNC_OPTIONS = {
  retryDelayMs: 5000,
  logger: Logger.get('PowerSyncStream'),
  crudUploadThrottleMs: DEFAULT_CRUD_UPLOAD_THROTTLE_MS
};

export const DEFAULT_STREAM_CONNECTION_OPTIONS: Required<PowerSyncConnectionOptions> = {
  connectionMethod: SyncStreamConnectionMethod.HTTP
};

export abstract class AbstractStreamingSyncImplementation
  extends BaseObserver<StreamingSyncImplementationListener>
  implements StreamingSyncImplementation
{
  protected _lastSyncedAt: Date | null;
  protected options: AbstractStreamingSyncImplementationOptions;
  protected abortController: AbortController | null;
  protected crudUpdateListener?: () => void;
  protected streamingSyncPromise?: Promise<void>;

  syncStatus: SyncStatus;
  triggerCrudUpload: () => void;

  constructor(options: AbstractStreamingSyncImplementationOptions) {
    super();
    this.options = { ...DEFAULT_STREAMING_SYNC_OPTIONS, ...options };

    this.syncStatus = new SyncStatus({
      connected: false,
      lastSyncedAt: undefined,
      dataFlow: {
        uploading: false,
        downloading: false
      }
    });
    this.abortController = null;

    this.triggerCrudUpload = throttle(
      () => {
        if (!this.syncStatus.connected || this.syncStatus.dataFlowStatus.uploading) {
          return;
        }
        this._uploadAllCrud();
      },
      this.options.crudUploadThrottleMs,
      { trailing: true }
    );
  }

  async waitForReady() {}

  waitForStatus(status: SyncStatusOptions): Promise<void> {
    return new Promise((resolve) => {
      const l = this.registerListener({
        statusChanged: (updatedStatus) => {
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

          if (matchPartialObject(status, updatedStatus.toJSON())) {
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
    const response = await this.options.remote.get('/write-checkpoint2.json');
    return response['data']['write_checkpoint'] as string;
  }

  protected async _uploadAllCrud(): Promise<void> {
    return this.obtainLock({
      type: LockType.CRUD,
      callback: async () => {
        this.updateSyncStatus({
          dataFlow: {
            uploading: true
          }
        });
        while (true) {
          try {
            const done = await this.uploadCrudBatch();
            if (done) {
              break;
            }
          } catch (ex) {
            this.updateSyncStatus({
              connected: false,
              dataFlow: {
                uploading: false
              }
            });
            await this.delayRetry();
            break;
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

  protected async uploadCrudBatch(): Promise<boolean> {
    const hasCrud = await this.options.adapter.hasCrud();
    if (hasCrud) {
      await this.options.uploadCrud();
      return false;
    } else {
      await this.options.adapter.updateLocalTarget(() => this.getWriteCheckpoint());
      return true;
    }
  }

  async connect(options?: PowerSyncConnectionOptions) {
    if (this.abortController) {
      await this.disconnect();
    }

    this.abortController = new AbortController();
    this.streamingSyncPromise = this.streamingSync(this.abortController.signal, options);

    // Return a promise that resolves when the connection status is updated
    return new Promise<void>((resolve) => {
      const l = this.registerListener({
        statusUpdated: (update) => {
          // This is triggered as soon as a connection is read from
          if (typeof update.connected == 'undefined') {
            // only concern with connection updates
            return;
          }

          if (update.connected == false) {
            /**
             * This function does not reject if initial connect attempt failed
             */
            this.logger.warn('Initial connect attempt did not successfully connect to server');
          }

          resolve();
          l();
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
    this.updateSyncStatus({ connected: false });
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
        dataFlow: {
          downloading: false
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
      try {
        if (signal?.aborted) {
          break;
        }
        const { retry } = await this.streamingSyncIteration(nestedAbortController.signal, options);
        if (!retry) {
          /**
           * A sync error ocurred that we cannot recover from here.
           * This loop must terminate.
           * The nestedAbortController will close any open network requests and streams below.
           */
          break;
        }
        // Continue immediately
      } catch (ex) {
        /**
         * Either:
         *  - A network request failed with a failed connection or not OKAY response code.
         *  - There was a sync processing error.
         * This loop will retry.
         * The nested abort controller will cleanup any open network requests and streams.
         * The WebRemote should only abort pending fetch requests or close active Readable streams.
         */
        if (ex instanceof AbortOperation) {
          this.logger.warn(ex);
        } else {
          this.logger.error(ex);
        }
        await this.delayRetry();
      } finally {
        if (!signal.aborted) {
          nestedAbortController.abort(new AbortOperation('Closing sync stream network requests before retry.'));
          nestedAbortController = new AbortController();
        }

        this.updateSyncStatus({
          connected: false
        });

        // On error, wait a little before retrying
      }
    }

    // Mark as disconnected if here
    this.updateSyncStatus({ connected: false });
  }

  protected async streamingSyncIteration(
    signal: AbortSignal,
    options?: PowerSyncConnectionOptions
  ): Promise<{ retry?: boolean }> {
    return await this.obtainLock({
      type: LockType.SYNC,
      signal,
      callback: async () => {
        const resolvedOptions: Required<PowerSyncConnectionOptions> = {
          ...DEFAULT_STREAM_CONNECTION_OPTIONS,
          ...(options ?? {})
        };

        this.logger.debug('Streaming sync iteration started');
        this.options.adapter.startSession();
        const bucketEntries = await this.options.adapter.getBucketStates();
        const initialBuckets = new Map<string, string>();

        bucketEntries.forEach((entry) => {
          initialBuckets.set(entry.bucket, entry.op_id);
        });

        const req: BucketRequest[] = Array.from(initialBuckets.entries()).map(([bucket, after]) => ({
          name: bucket,
          after: after
        }));

        // These are compared by reference
        let targetCheckpoint: Checkpoint | null = null;
        let validatedCheckpoint: Checkpoint | null = null;
        let appliedCheckpoint: Checkpoint | null = null;

        let bucketSet = new Set<string>(initialBuckets.keys());

        this.logger.debug('Requesting stream from server');

        const syncOptions: SyncStreamOptions = {
          path: '/sync/stream',
          abortSignal: signal,
          data: {
            buckets: req,
            include_checksum: true,
            raw_data: true
          }
        };

        const stream =
          resolvedOptions?.connectionMethod == SyncStreamConnectionMethod.HTTP
            ? await this.options.remote.postStream(syncOptions)
            : await this.options.remote.socketStream(syncOptions);

        this.logger.debug('Stream established. Processing events');

        while (!stream.closed) {
          const line = await stream.read();
          if (!line) {
            // The stream has closed while waiting
            return { retry: true };
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
            const bucketsToDelete = new Set<string>(bucketSet);
            const newBuckets = new Set<string>();
            for (const checksum of line.checkpoint.buckets) {
              newBuckets.add(checksum.bucket);
              bucketsToDelete.delete(checksum.bucket);
            }
            if (bucketsToDelete.size > 0) {
              this.logger.debug('Removing buckets', [...bucketsToDelete]);
            }
            bucketSet = newBuckets;
            await this.options.adapter.removeBuckets([...bucketsToDelete]);
            await this.options.adapter.setTargetCheckpoint(targetCheckpoint);
          } else if (isStreamingSyncCheckpointComplete(line)) {
            this.logger.debug('Checkpoint complete', targetCheckpoint);
            const result = await this.options.adapter.syncLocalDatabase(targetCheckpoint!);
            if (!result.checkpointValid) {
              // This means checksums failed. Start again with a new checkpoint.
              // TODO: better back-off
              await new Promise((resolve) => setTimeout(resolve, 50));
              return { retry: true };
            } else if (!result.ready) {
              // Checksums valid, but need more data for a consistent checkpoint.
              // Continue waiting.
              // landing here the whole time
            } else {
              appliedCheckpoint = targetCheckpoint;
              this.logger.debug('validated checkpoint', appliedCheckpoint);
              this.updateSyncStatus({
                connected: true,
                lastSyncedAt: new Date(),
                dataFlow: {
                  downloading: false
                }
              });
            }

            validatedCheckpoint = targetCheckpoint;
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

            bucketSet = new Set<string>(newBuckets.keys());

            const bucketsToDelete = diff.removed_buckets;
            if (bucketsToDelete.length > 0) {
              this.logger.debug('Remove buckets', bucketsToDelete);
            }
            await this.options.adapter.removeBuckets(bucketsToDelete);
            await this.options.adapter.setTargetCheckpoint(targetCheckpoint);
          } else if (isStreamingSyncData(line)) {
            const { data } = line;
            this.updateSyncStatus({
              dataFlow: {
                downloading: true
              }
            });
            await this.options.adapter.saveSyncData({ buckets: [SyncDataBucket.fromRow(data)] });
          } else if (isStreamingKeepalive(line)) {
            const remaining_seconds = line.token_expires_in;
            if (remaining_seconds == 0) {
              // Connection would be closed automatically right after this
              this.logger.debug('Token expiring; reconnect');
              /**
               * For a rare case where the backend connector does not update the token
               * (uses the same one), this should have some delay.
               */
              await this.delayRetry();
              return { retry: true };
            }
            this.triggerCrudUpload();
          } else {
            this.logger.debug('Sync complete');

            if (targetCheckpoint === appliedCheckpoint) {
              this.updateSyncStatus({
                connected: true,
                lastSyncedAt: new Date()
              });
            } else if (validatedCheckpoint === targetCheckpoint) {
              const result = await this.options.adapter.syncLocalDatabase(targetCheckpoint!);
              if (!result.checkpointValid) {
                // This means checksums failed. Start again with a new checkpoint.
                // TODO: better back-off
                await new Promise((resolve) => setTimeout(resolve, 50));
                return { retry: false };
              } else if (!result.ready) {
                // Checksums valid, but need more data for a consistent checkpoint.
                // Continue waiting.
              } else {
                appliedCheckpoint = targetCheckpoint;
                this.updateSyncStatus({
                  connected: true,
                  lastSyncedAt: new Date(),
                  dataFlow: {
                    downloading: false
                  }
                });
              }
            }
          }
        }
        this.logger.debug('Stream input empty');
        // Connection closed. Likely due to auth issue.
        return { retry: true };
      }
    });
  }

  protected updateSyncStatus(options: SyncStatusOptions) {
    const updatedStatus = new SyncStatus({
      connected: options.connected ?? this.syncStatus.connected,
      lastSyncedAt: options.lastSyncedAt ?? this.syncStatus.lastSyncedAt,
      dataFlow: {
        ...this.syncStatus.dataFlowStatus,
        ...options.dataFlow
      }
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
