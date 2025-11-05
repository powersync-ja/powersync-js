import type { Checkpoint, CheckpointBucket } from '@powersync/service-core';
import type { BucketStorage } from '../storage/BucketStorage.js';
import type { SystemDependencies } from '../system/SystemDependencies.js';
import { BucketRequest, openHttpStream } from './open-stream.js';

export type PowerSyncCredentials = {
  endpoint: string;
  token: string;
};

export type Connector = {
  fetchCredentials: () => Promise<PowerSyncCredentials | null>;
};

// TODO improve this
export interface SyncStatus {
  connected: boolean;
  connecting: boolean;
  uploading: boolean;
  downloading: boolean;
  uploadError?: Error;
  downloadError?: Error;
  anyError?: Error;
}

export interface SyncClient {
  status: SyncStatus;

  connect: (connector: Connector) => Promise<void>;

  disconnect: () => void;
}

export type SyncClientOptions = {
  connectionRetryDelayMs: number;
  uploadRetryDelayMs: number;
  storage: BucketStorage;
  systemDependencies: SystemDependencies;
};

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

export class SyncClientImpl implements SyncClient {
  readonly status: SyncStatus;

  protected cachedCredentials: PowerSyncCredentials | null;
  protected abortController: AbortController;

  constructor(protected options: SyncClientOptions) {
    this.cachedCredentials = null;
    this.abortController = new AbortController();
    this.status = {
      connected: false,
      connecting: false,
      uploading: false,
      downloading: false
    };
  }

  protected get bucketStorage(): BucketStorage {
    return this.options.storage;
  }

  async connect(connector: Connector): Promise<void> {
    // Abort any existing connection
    this.abortController.abort();

    const controller = new AbortController();
    this.abortController = controller;

    while (!this.abortController.signal.aborted) {
      try {
        await this.syncIteration(connector, controller.signal);
      } catch (error) {
        this.status.downloadError = error as Error;

        // TODO support aborts
        await new Promise((resolve) => setTimeout(resolve, this.options.connectionRetryDelayMs));
      }
    }
  }

  disconnect() {
    this.abortController.abort();
  }

  protected invalidateCredentials(): void {
    this.cachedCredentials = null;
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
    const credentials = this.cachedCredentials ?? (await connector.fetchCredentials());

    if (!credentials) {
      throw new Error(`No credentials found`);
    }

    const [bucketRequests, initBucketMap] = await this.collectLocalBucketState();

    const stream = await openHttpStream({
      endpoint: credentials.endpoint,
      token: credentials.token,
      signal: signal,
      clientId: await this.bucketStorage.getClientId(),
      bucketPositions: bucketRequests,
      systemDependencies: this.options.systemDependencies
    });

    let syncState: InternalSyncState = {
      targetCheckpoint: null,
      pendingValidatedCheckpoint: null,
      bucketMap: initBucketMap
    };

    const reader = stream.getReader();
    console.debug(`Starting sync iteration`);
    try {
      while (!signal.aborted) {
        const { value: line, done } = await reader.read();
        if (done) break;

        // Handle various sync line types
        if (`checkpoint` in line) {
          console.debug(`Received checkpoint`, line.checkpoint);
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
          await this.bucketStorage.setTargetCheckpoint(line.checkpoint);
          // TODO update sync status
          // await this.updateSyncStatusForStartingCheckpoint(targetCheckpoint);
        } else if (`checkpoint_complete` in line) {
          console.debug(`Received checkpoint complete`, syncState.targetCheckpoint);
          const result = await this.applyCheckpoint(syncState.targetCheckpoint!);
          if (result.endIteration) {
            return;
          } else if (!result.applied) {
            syncState.pendingValidatedCheckpoint = syncState.targetCheckpoint;
          } else {
            syncState.pendingValidatedCheckpoint = null;
          }
        } else if (`partial_checkpoint_complete` in line) {
          console.debug(`Received partial checkpoint complete`, syncState.targetCheckpoint);
          const priority = line.partial_checkpoint_complete.priority;
          console.debug(`Partial checkpoint complete`, priority);
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
          console.debug(`Received checkpoint diff`, syncState.targetCheckpoint);
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

          // TODO
          // await this.updateSyncStatusForStartingCheckpoint(targetCheckpoint);

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
          await this.bucketStorage.setTargetCheckpoint(syncState.targetCheckpoint!);
        } else if (`data` in line) {
          console.debug(`Received data`, line.data);
          const { data } = line;
          // TODO update sync status
          await this.bucketStorage.saveSyncData({
            buckets: [data]
          });
        } else if (`token_expires_in` in line) {
          console.debug(`Received token expires in`, line.token_expires_in);
          const { token_expires_in } = line;

          if (token_expires_in == 0) {
            throw new Error(`Token already expired`);
          } else if (token_expires_in < 30) {
            this.invalidateCredentials();
            throw new Error(`Token will expire soon. Need to reconnect.`);
          }
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

    console.debug(`Applied checkpoint ${checkpoint.last_op_id}`, checkpoint);
    // this.updateSyncStatus({
    //   connected: true,
    //   lastSyncedAt: new Date(),
    //   dataFlow: {
    //     downloading: false,
    //     downloadProgress: null,
    //     downloadError: undefined,
    //   },
    // })

    return { applied: true, endIteration: false };
  }
}
