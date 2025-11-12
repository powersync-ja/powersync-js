import type { BucketState, Checkpoint, ProtocolOplogData, SyncBucketData } from '@powersync/service-core';

export type SyncDataBatch = {
  buckets: Array<SyncBucketData<ProtocolOplogData>>;
};

export type SavedProgress = {
  atLast: number;
  sinceLast: number;
};

export interface LocalState {
  /**
   * The last write checkpoint that was applied to the local database.
   */
  lastOpId: bigint;
  /**
   * The target write checkpoint that the local database is syncing to.
   */
  targetOpId: bigint;
}

export type BucketOperationProgress = Record<string, SavedProgress>;

/**
 * Interface for managing bucket storage operations in PowerSync.
 *
 * BucketStorage is responsible for:
 * - Storing and managing sync data from the server
 * - Tracking bucket states and operation progress
 * - Synchronizing local database with checkpoints
 * - Managing client-side CRUD operations
 */
export interface BucketStorage {
  /**
   * Initialize the storage system.
   * Should be called before any other operations to set up the storage state.
   */
  init: () => Promise<void>;

  /**
   * Clear all data from storage.
   * Removes all buckets, operations, and associated data.
   */
  clear(): Promise<void>;

  /**
   * Save a batch of sync data received from the server.
   *
   * @param batch - The batch of sync data containing buckets and their operations
   */
  saveSyncData: (batch: SyncDataBatch) => Promise<void>;

  /**
   * Remove one or more buckets from storage.
   *
   * @param buckets - Array of bucket names to remove
   */
  removeBuckets: (buckets: Array<string>) => Promise<void>;

  /**
   * Get the current state of all buckets.
   *
   * @returns Array of bucket states, each containing bucket name, operation ID, checksums, etc.
   */
  getBucketStates: () => Promise<Array<BucketState>>;

  /**
   * Get the current state of the local bucket.
   * FIXME maybe a better name?
   * @returns The local bucket state, containing bucket name, operation ID, checksums, etc.
   */
  getLocalState: () => Promise<LocalState>;

  /**
   * Synchronize the local database with a checkpoint.
   * Validates checksums, applies operations, and updates bucket states.
   *
   * @param checkpoint - The checkpoint to sync with
   * @param priority - Optional priority level to filter which buckets to sync
   * @returns Object indicating if checkpoint is valid, if sync is ready, and any failures
   */
  syncLocalDatabase: (
    checkpoint: Checkpoint,
    priority?: number
  ) => Promise<{
    checkpointValid: boolean;
    ready: boolean;
    failures?: Array<any>;
  }>;

  /**
   * Check if the initial sync has completed.
   *
   * @returns True if the initial sync has been completed, false otherwise
   */
  hasCompletedSync: () => Promise<boolean>;

  /**
   * Updates the local target checkpoint after CRUD items have been uploaded.
   * @param writeCheckpoint - Optional write checkpoint to set the local target to
   *  - If provided, only updates if all CRUD items have been uploaded
   *  - If not provided, sets the local target to the max op id
   * @returns void
   */
  handleCrudUploaded(writeCheckpoint?: string): Promise<void>;

  /**
   * Update the local target checkpoint atomically.
   * Only updates if no new CRUD data has been added since the checkpoint was obtained.
   *
   * @param cb - Callback that returns the new operation ID to set as the target
   * @returns True if the update was successful, false if new data was detected
   */
  updateLocalTarget: (cb: () => Promise<string>) => Promise<boolean>;

  /**
   * Get the maximum operation ID value.
   * This represents the highest possible operation ID in the system.
   *
   * @returns The maximum operation ID as a string
   */
  getMaxOpId: () => string;

  /**
   * Get a unique client ID for this storage instance.
   * The client ID is used to identify this client in the sync protocol.
   *
   * @returns A unique client identifier
   */
  getClientId: () => Promise<string>;
}
