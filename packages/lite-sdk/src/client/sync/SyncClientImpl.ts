import type { Checkpoint, CheckpointBucket } from '@powersync/service-core';
import { BaseObserver } from '../../utils/BaseObserver.js';
import type { BucketStorage } from '../storage/BucketStorage.js';
import { normalizeChecksum } from '../storage/checksumUtils.js';
import { Connector } from './Connector.js';
import { CrudManager } from './CrudManager.js';
import type {
  CreateCheckpointResponse,
  StreamOpener,
  SyncClient,
  SyncClientListener,
  SyncClientOptions,
  SyncStatus
} from './SyncClient.js';
import { AuthorizationError, openHttpStream, type BucketRequest } from './open-stream.js';

type BucketDescription = {
  name: string;
  priority: number;
};

type InternalSyncState = {
  targetCheckpoint: Checkpoint | null;
  // A checkpoint that has been validated but not applied (e.g. due to pending local writes)
  pendingValidatedCheckpoint: Checkpoint | null;
  bucketMap: Map<string, BucketDescription | null>;
};

// The priority we assume when we receive checkpoint lines where no priority is set.
// This is the default priority used by the sync service, but can be set to an arbitrary
// value since sync services without priorities also won't send partial sync completion
// messages.
const FALLBACK_PRIORITY = 3;

export class SyncClientImpl extends BaseObserver<SyncClientListener> implements SyncClient {
  status: SyncStatus;

  protected abortController: AbortController;
  protected openStreamFn: StreamOpener;
  protected uploadPromise: Promise<void> | null;
  protected connector: Connector | null;

  constructor(protected options: SyncClientOptions) {
    super();
    this.connector = null;
    this.abortController = new AbortController();
    this.status = {
      connected: false,
      lastSyncedAt: null,
      hasSynced: false,
      connecting: false,
      downloading: false,
      uploading: false,
      uploadError: null,
      downloadError: null
    };
    this.uploadPromise = null;
    this.openStreamFn = options.streamOpener ?? openHttpStream;
  }

  protected get bucketStorage(): BucketStorage {
    return this.options.storage;
  }

  protected get crudManager(): CrudManager | undefined {
    return this.options.crudManager;
  }

  /**
   * Updates the sync status with the provided options.
   * Emits to listeners for status changes.
   */
  protected updateSyncStatus(options: Partial<SyncStatus>): void {
    const oldStatus = { ...this.status };
    this.status = {
      ...this.status,
      ...options
    };

    // Only emit full status if something actually changed
    if (!this.isStatusEqual(oldStatus, this.status)) {
      this.iterateListeners((listener) => {
        listener.statusChanged?.(this.status);
      });
    }
  }

  async connect(connector: Connector): Promise<void> {
    // Abort any existing connection
    this.abortController.abort();
    this.connector = connector;

    const controller = new AbortController();
    this.abortController = controller;

    // Don't await this, this will run until the connection is aborted
    this.connectInternal(connector, controller.signal);
  }

  protected async connectInternal(connector: Connector, signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      try {
        this.updateSyncStatus({ connecting: true });
        await this.syncIteration(connector, signal);
      } catch (error) {
        this.updateSyncStatus({
          connected: false,
          downloading: false,
          downloadError: error as Error
        });

        // TODO support aborts
        await new Promise((resolve) => setTimeout(resolve, this.options.connectionRetryDelayMs));
      } finally {
        this.updateSyncStatus({ connecting: false });
      }
    }
  }
  disconnect() {
    this.abortController.abort();
  }

  async checkpoint(customCheckpoint?: string): Promise<CreateCheckpointResponse> {
    let targetCheckpoint: string | undefined = customCheckpoint;
    // FIXME, could this be optimized?
    // If there are no crud items, we set the target to the custom checkpoint or the max op id
    // We then set the local target to the new checkpoint
    await this.bucketStorage.handleCrudUploaded(customCheckpoint);
    const targetUpdated = await this.bucketStorage.updateLocalTarget(async () => {
      if (targetCheckpoint) {
        return targetCheckpoint;
      }
      targetCheckpoint = await this.getWriteCheckpoint();
      return targetCheckpoint;
    });
    return {
      targetUpdated,
      targetCheckpoint,
      waitForValidation: async (signal?: AbortSignal) => {
        if (!targetCheckpoint || !targetUpdated) {
          // FIXME throw an error in this case?
          return;
        }
        const localBucketState = await this.bucketStorage.getLocalState();
        if (localBucketState.lastOpId >= normalizeChecksum(targetCheckpoint)!) {
          return;
        }

        return new Promise((resolve, reject) => {
          let disposeListener: (() => void) | null = null;
          const signalListener = () => {
            reject(new Error('Aborted'));
            disposeListener?.();
          };
          disposeListener = this.registerListener({
            checkpointCompleted: (checkpoint) => {
              if (checkpoint.write_checkpoint && checkpoint.write_checkpoint >= targetCheckpoint!) {
                resolve();
                disposeListener?.();
                signal?.removeEventListener('abort', signalListener);
              }
            }
          });
          signal?.addEventListener('abort', disposeListener, { once: true });
        });
      }
    };
  }

  triggerCrudUpload(): void {
    if (!this.crudManager) {
      return;
    }
    // We already have an operation queued
    if (this.uploadPromise) {
      return;
    }

    const process = async () => {
      try {
        const hasCrud = await this.crudManager?.hasCrud().catch(() => false);
        if (!hasCrud) {
          // We are done
          this.uploadPromise = null;
          this.updateSyncStatus({
            uploading: false
          });
          return;
        }

        this.updateSyncStatus({
          uploading: true,
          uploadError: null
        });

        try {
          await this.crudManager?.performUpload({
            complete: this.bucketStorage.handleCrudUploaded
          });

          const hasCrudAfter = await this.crudManager?.hasCrud().catch(() => false);
          if (hasCrudAfter) {
            // Keep the chain running
            // Implement throttling
            await new Promise((resolve) => setTimeout(resolve, this.options.uploadThrottleMs));
            return (this.uploadPromise = process() ?? null);
          } else {
            // We are done with this iteration
            this.uploadPromise = null;
            this.updateSyncStatus({
              uploading: false,
              uploadError: null
            });
            // Get a write checkpoint
            await this.bucketStorage.updateLocalTarget(() => this.getWriteCheckpoint());
          }
        } catch (error) {
          this.updateSyncStatus({
            uploadError: error as Error
          });
        } finally {
          // Implement throttling
          await new Promise((resolve) => setTimeout(resolve, this.options.uploadThrottleMs));
        }
      } catch (error) {
        this.updateSyncStatus({
          uploadError: error as Error
        });
      }
    };
    // Start by performing an upload
    this.uploadPromise = process() ?? null;
  }

  protected async getWriteCheckpoint(): Promise<string> {
    if (!this.connector) {
      throw new Error(`No connector found`);
    }
    const credentials = await this.connector.prefetchCredentials();
    if (!credentials) {
      throw new Error(`No credentials found`);
    }
    const clientId = await this.bucketStorage.getClientId();
    let path = `/write-checkpoint2.json?client_id=${clientId}`;
    const response = await fetch(`${credentials.endpoint}${path}`, {
      headers: {
        Authorization: `Bearer ${credentials.token}`
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to get write checkpoint: ${response.statusText}`);
    }
    const data = (await response.json()) as { data: { write_checkpoint: string } };
    const checkpoint = data['data']['write_checkpoint'] as string;
    return checkpoint;
  }

  private async collectLocalBucketState(): Promise<[BucketRequest[], Map<string, BucketDescription | null>]> {
    const bucketEntries = await this.bucketStorage.getBucketStates();
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

  protected async syncIteration(connector: Connector, signal: AbortSignal): Promise<void> {
    const credentials = connector.cachedCredentials ?? (await connector.fetchCredentials());

    if (!credentials) {
      throw new Error(`No credentials found`);
    }

    const [bucketRequests, initBucketMap] = await this.collectLocalBucketState();

    const stream = await this.openStreamFn({
      endpoint: credentials.endpoint,
      token: credentials.token,
      signal: signal,
      clientId: await this.bucketStorage.getClientId(),
      bucketPositions: bucketRequests,
      systemDependencies: this.options.systemDependencies
    }).catch((ex) => {
      if (ex instanceof AuthorizationError) {
        connector.invalidateCredentials();
      }
      throw ex;
    });

    let syncState: InternalSyncState = {
      targetCheckpoint: null,
      pendingValidatedCheckpoint: null,
      bucketMap: initBucketMap
    };

    this.updateSyncStatus({
      connected: true,
      connecting: false,
      downloadError: null
    });

    const reader = stream.getReader();
    console.debug(`Starting sync iteration`);

    // Trigger a CRUD upload immediately after connecting
    Promise.resolve().then(() => this.triggerCrudUpload());

    try {
      while (!signal.aborted) {
        const { value: line, done } = await reader.read();
        if (done) break;

        // Handle various sync line types
        if (`checkpoint` in line) {
          this.options.debugMode && console.debug(`Received checkpoint`, line.checkpoint);
          const bucketsToDelete = new Set<string>(syncState.bucketMap.keys());
          const newBuckets = new Map<string, BucketDescription>();
          for (const checksum of line.checkpoint.buckets) {
            newBuckets.set(checksum.bucket, {
              name: checksum.bucket,
              priority: checksum.priority ?? FALLBACK_PRIORITY
            });
            bucketsToDelete.delete(checksum.bucket);
          }
          syncState = {
            targetCheckpoint: line.checkpoint,
            pendingValidatedCheckpoint: null,
            bucketMap: newBuckets
          };
          await this.bucketStorage.removeBuckets(Array.from(bucketsToDelete));
          this.updateSyncStatus({
            downloading: true
          });
        } else if (`checkpoint_complete` in line) {
          this.options.debugMode && console.debug(`Received checkpoint complete`, syncState.targetCheckpoint);
          const result = await this.applyCheckpoint(syncState.targetCheckpoint!);
          if (result.endIteration) {
            return;
          } else if (!result.applied) {
            syncState.pendingValidatedCheckpoint = syncState.targetCheckpoint;
          } else {
            syncState.pendingValidatedCheckpoint = null;
            // Status updated in applyCheckpoint when applied successfully
          }
        } else if (`partial_checkpoint_complete` in line) {
          this.options.debugMode && console.debug(`Received partial checkpoint complete`, syncState.targetCheckpoint);
          const priority = line.partial_checkpoint_complete.priority;
          const result = await this.bucketStorage.syncLocalDatabase(syncState.targetCheckpoint!, priority);
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
          }
        } else if (`checkpoint_diff` in line) {
          this.options.debugMode && console.debug(`Received checkpoint diff`, syncState.targetCheckpoint);
          // TODO: It may be faster to just keep track of the diff, instead of the entire checkpoint
          if (syncState.targetCheckpoint == null) {
            throw new Error(`Checkpoint diff without previous checkpoint`);
          }
          // New checkpoint - existing validated checkpoint is no longer valid
          syncState.pendingValidatedCheckpoint = null;
          const diff = line.checkpoint_diff;
          const newBuckets = new Map<string, CheckpointBucket>();
          for (const checksum of syncState.targetCheckpoint.buckets) {
            newBuckets.set(checksum.bucket, checksum);
          }
          for (const checksum of diff.updated_buckets) {
            newBuckets.set(checksum.bucket, checksum);
          }
          for (const bucket of diff.removed_buckets) {
            newBuckets.delete(bucket);
          }
          syncState.targetCheckpoint = {
            last_op_id: diff.last_op_id,
            buckets: [...newBuckets.values()],
            write_checkpoint: diff.write_checkpoint,
            streams: [] // TODO: implement streams
          };

          this.updateSyncStatus({
            downloading: true
          });

          syncState.bucketMap = new Map();
          newBuckets.forEach((checksum, name) =>
            syncState.bucketMap.set(name, {
              name: checksum.bucket,
              priority: checksum.priority ?? FALLBACK_PRIORITY
            })
          );

          const bucketsToDelete = diff.removed_buckets;
          if (bucketsToDelete.length > 0) {
            console.debug(`Remove buckets`, bucketsToDelete);
          }
          await this.bucketStorage.removeBuckets(bucketsToDelete);
        } else if (`data` in line) {
          this.options.debugMode && console.debug(`Received data`, line.data);
          const { data } = line;
          // Update status to indicate we're downloading data
          this.updateSyncStatus({
            downloading: true
          });
          await this.bucketStorage.saveSyncData({
            buckets: [data]
          });
        } else if (`token_expires_in` in line) {
          this.options.debugMode && console.debug(`Received token expires in`, line.token_expires_in);
          const { token_expires_in } = line;

          if (token_expires_in == 0) {
            throw new Error(`Token already expired`);
          } else if (token_expires_in < 30) {
            connector.invalidateCredentials();
            throw new Error(`Token will expire soon. Need to reconnect.`);
          }
          this.triggerCrudUpload();
        } else {
          console.debug(`Received unknown sync line`, line);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async applyCheckpoint(checkpoint: Checkpoint) {
    const result = await this.bucketStorage.syncLocalDatabase(checkpoint);

    if (!result.checkpointValid) {
      console.debug(`Checksum mismatch in checkpoint ${checkpoint.last_op_id}, will reconnect`);
      // This means checksums failed. Start again with a new checkpoint.
      // TODO: better back-off
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { applied: false, endIteration: true };
    } else if (!result.ready) {
      console.debug(
        `Could not apply checkpoint ${checkpoint.last_op_id} due to local data. We will retry applying the checkpoint after that upload is completed.`
      );

      return { applied: false, endIteration: false };
    }

    this.options.debugMode && console.debug(`Applied checkpoint ${checkpoint.last_op_id}`, checkpoint);
    this.updateSyncStatus({
      hasSynced: true,
      downloading: false,
      lastSyncedAt: new Date()
    });

    this.iterateListeners((listener) => {
      listener.checkpointCompleted?.(checkpoint);
    });

    return { applied: true, endIteration: false };
  }

  /**
   * Compares two status objects to determine if they are equal.
   * Handles Error objects properly by serializing their properties.
   */
  private isStatusEqual(a: SyncStatus, b: SyncStatus): boolean {
    /**
     * By default Error objects are serialized to an empty object.
     * This replaces Errors with more useful information before serialization.
     */
    const replacer = (_: string, value: any) => {
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }
      return value;
    };

    return JSON.stringify(a, replacer) === JSON.stringify(b, replacer);
  }
}
