import type { BucketState, Checkpoint, ProtocolOplogData, SyncBucketData } from '@powersync/service-core';

export type SyncDataBatch = {
  buckets: Array<SyncBucketData<ProtocolOplogData>>;
};

export type SavedProgress = {
  atLast: number;
  sinceLast: number;
};

export type BucketOperationProgress = Record<string, SavedProgress>;

export interface BucketStorage {
  init: () => Promise<void>;

  saveSyncData: (batch: SyncDataBatch) => Promise<void>;

  removeBuckets: (buckets: Array<string>) => Promise<void>;

  setTargetCheckpoint: (checkpoint: Checkpoint) => Promise<void>;

  getBucketStates: () => Promise<Array<BucketState>>;

  getBucketOperationProgress: () => Promise<BucketOperationProgress>;

  syncLocalDatabase: (
    checkpoint: Checkpoint,
    priority?: number
  ) => Promise<{
    checkpointValid: boolean;
    ready: boolean;
    failures?: Array<any>;
  }>;

  hasCompletedSync: () => Promise<boolean>;

  updateLocalTarget: (cb: () => Promise<string>) => Promise<boolean>;

  getMaxOpId: () => string;

  /**
   * Get an unique client id.
   */
  getClientId: () => Promise<string>;
}
