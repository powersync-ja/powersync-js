import type { BucketState, Checkpoint } from '@powersync/service-core';
import type { BucketOperationProgress, BucketStorage, SyncDataBatch } from './BucketStorage.js';
import { constructKey, toStringOrNull } from './bucketHelpers.js';
import type { PSBucket } from './buckets/ps_buckets.js';
import type { PSCrud } from './buckets/ps_crud.js';
import type { PSKeyValue } from './buckets/ps_kv.js';
import type { PSOplog } from './buckets/ps_oplog.js';
import type { PSTx } from './buckets/ps_tx.js';
import type { PSUntyped } from './buckets/ps_untyped.js';
import { addChecksums, normalizeChecksum, subtractChecksums } from './checksumUtils.js';

export type OpType = 'PUT' | 'REMOVE' | 'MOVE' | 'CLEAR';

export const MAX_OP_ID = '9223372036854775807';

export class BucketStorageImpl implements BucketStorage {
  protected ps_buckets: PSBucket[];
  protected ps_oplog: PSOplog[];
  protected ps_updated_rows: PSUntyped[];
  // TODO: ps_crud implementation - ignoring for now
  // ps_crud tracks client-side changes that need to be uploaded to the server
  protected ps_crud: PSCrud[];
  protected ps_kv: PSKeyValue[];
  protected clientId: string;

  protected ps_tx: PSTx;

  // Track sequence/counter for ps_crud (simulates SQLite sequence)
  // TODO: This should be properly managed when ps_crud is implemented
  protected ps_crud_seq: number = 0;

  constructor() {
    this.ps_buckets = [];
    this.ps_oplog = [];
    this.ps_tx = {
      current_tx: null,
      next_tx: null
    };
    this.ps_updated_rows = [];
    this.ps_crud = [];
    this.ps_kv = [];
    this.clientId = 'TODO';
  }

  async init(): Promise<void> {}

  getMaxOpId(): string {
    return MAX_OP_ID;
  }

  async getClientId(): Promise<string> {
    return this.clientId;
  }

  async getBucketStates(): Promise<Array<BucketState>> {
    return this.ps_buckets.map((bucket) => ({
      bucket: bucket.name,
      op_id: bucket.last_op.toString(),
      target_op_id: bucket.target_op.toString(),
      add_checksum: bucket.add_checksum.toString(),
      op_checksum: bucket.op_checksum.toString(),
      pending_delete: bucket.pending_delete
    }));
  }

  async hasCompletedSync(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async updateLocalTarget(cb: () => Promise<string>): Promise<boolean> {
    // Find the '$local' bucket and check if target_op = MAX_OP_ID
    // SQL: SELECT target_op FROM ps_buckets WHERE name = '$local' AND target_op = CAST(? as INTEGER)
    const localBucket = this.ps_buckets.find((b) => b.name === '$local');
    if (!localBucket) {
      // Nothing to update
      return false;
    }

    const maxOpIdBigint = BigInt(MAX_OP_ID);
    if (localBucket.target_op !== maxOpIdBigint) {
      // target_op is not MAX_OP_ID, nothing to update
      return false;
    }

    // TODO: ps_crud sequence tracking - proper implementation needed
    // SQL: SELECT seq FROM sqlite_sequence WHERE name = 'ps_crud'
    // In SQLite, sequences exist independently of table data (auto-increment tracking)
    // For now, we check if ps_crud has any data as a proxy for sequence existence
    // Proper implementation would track sequence counter separately
    if (this.ps_crud.length === 0 && this.ps_crud_seq === 0) {
      // No crud data/sequence, nothing to update
      return false;
    }

    // Save current sequence state before calling callback
    // SQL: SELECT seq FROM sqlite_sequence WHERE name = 'ps_crud'
    const seqBefore = this.ps_crud_seq;

    // Call the callback to get the new opId
    const opId = await cb();

    // Within transaction equivalent (in memory, we do checks atomically):
    // 1. Check if ps_crud has any data (SELECT 1 FROM ps_crud LIMIT 1)
    // If it has data, new data was uploaded since write checkpoint - need new write checkpoint
    if (this.ps_crud.length > 0) {
      // Still has crud data, can't update checkpoint
      return false;
    }

    // 2. Verify sequence hasn't changed (SELECT seq FROM sqlite_sequence WHERE name = 'ps_crud')
    // If sequence changed, new items were added even if later deleted
    if (this.ps_crud_seq !== seqBefore) {
      // New crud data may have been uploaded since we got the checkpoint. Abort.
      return false;
    }

    // Verify sequence exists (should not be empty)
    // SQL: SELECT seq FROM sqlite_sequence WHERE name = 'ps_crud'
    if (this.ps_crud_seq === 0 && seqBefore === 0) {
      // This shouldn't happen if we got past the first check, but defensive
      throw new Error('SQLite Sequence should not be empty');
    }

    // Update the '$local' bucket's target_op to the new opId
    // SQL: UPDATE ps_buckets SET target_op = CAST(? as INTEGER) WHERE name='$local'
    const opIdBigint = normalizeChecksum(opId);
    localBucket.target_op = opIdBigint;

    return true;
  }

  async getBucketOperationProgress(): Promise<BucketOperationProgress> {
    // TODO
    return {};
  }

  async removeBuckets(buckets: Array<string>): Promise<void> {
    for (const bucketName of buckets) {
      // Find bucket by name and get its id
      const bucketIndex = this.ps_buckets.findIndex((b) => b.name === bucketName);
      if (bucketIndex === -1) {
        // Bucket doesn't exist, nothing to do
        continue;
      }

      const bucket = this.ps_buckets[bucketIndex];
      const bucketId = bucket.id;

      // Add all rows from ps_oplog for this bucket to ps_updated_rows
      // (INSERT OR IGNORE logic - only add if not already exists)
      const bucketOps = this.ps_oplog.filter((op) => op.bucket === bucketId);
      for (const op of bucketOps) {
        if (op.row_type && op.row_id) {
          const exists = this.ps_updated_rows.some((row) => row.type === op.row_type && row.id === op.row_id);
          if (!exists) {
            this.ps_updated_rows.push({
              type: op.row_type,
              id: op.row_id,
              data: null
            });
          }
        }
      }

      // Delete all rows from ps_oplog for this bucket
      this.ps_oplog = this.ps_oplog.filter((op) => op.bucket !== bucketId);

      // Delete the bucket from ps_buckets
      this.ps_buckets.splice(bucketIndex, 1);
    }
  }

  /**
   * Helper to find or create a bucket by name
   */
  protected findOrCreateBucket(bucketName: string): PSBucket {
    let bucket = this.ps_buckets.find((b) => b.name === bucketName);
    if (!bucket) {
      const nextId = this.ps_buckets.length > 0 ? Math.max(...this.ps_buckets.map((b) => b.id)) + 1 : 1;
      bucket = {
        id: nextId,
        name: bucketName,
        last_applied_op: 0n,
        last_op: 0n,
        target_op: 0n,
        add_checksum: 0n,
        op_checksum: 0n,
        pending_delete: false,
        count_at_last: 0,
        count_since_last: 0
      };
      this.ps_buckets.push(bucket);
    }
    return bucket;
  }

  async saveSyncData(batch: SyncDataBatch): Promise<void> {
    for (const bucketData of batch.buckets) {
      const bucketName = bucketData.bucket;
      const bucket = this.findOrCreateBucket(bucketName);
      const bucketId = bucket.id;
      const lastAppliedOp = bucket.last_applied_op;

      // Optimization for initial sync - we can avoid persisting individual REMOVE
      // operations when last_applied_op = 0
      let isEmpty = lastAppliedOp === 0n;

      let lastOp: bigint | null = null;
      let addChecksum = 0n;
      let opChecksum = 0n; // Start at 0, will be added to bucket's op_checksum at the end
      let addedOps = 0;

      for (const line of bucketData.data) {
        // line might be OplogEntry or ProtocolOplogData - access properties directly
        const opId = normalizeChecksum(line.op_id);
        const opType = line.op as OpType;
        const objectType = line.object_type;
        const objectId = line.object_id;
        const subkey = line.subkey;
        const checksum = normalizeChecksum(line.checksum);
        const opData = toStringOrNull(line.data);

        lastOp = opId;
        addedOps += 1;

        if (opType === 'PUT' || opType === 'REMOVE') {
          const key = constructKey(objectType, objectId, subkey);

          // Supersede (delete) previous operations with the same key
          const supersededOps: PSOplog[] = [];
          const remainingOps: PSOplog[] = [];

          for (const oplog of this.ps_oplog) {
            if (oplog.bucket === bucketId && oplog.key === key) {
              supersededOps.push(oplog);
              // Add superseded checksum to add_checksum
              addChecksum = addChecksums(addChecksum, oplog.hash);
              // Subtract superseded checksum from op_checksum
              opChecksum = subtractChecksums(opChecksum, oplog.hash);
            } else {
              remainingOps.push(oplog);
            }
          }

          // Update ps_oplog by removing superseded operations
          this.ps_oplog = remainingOps;

          // Check if we superseded an operation (only skip if bucket was empty)
          const superseded = supersededOps.length > 0 && !isEmpty;

          if (opType === 'REMOVE') {
            const shouldSkipRemove = !superseded;

            addChecksum = addChecksums(addChecksum, checksum);

            if (!shouldSkipRemove) {
              if (objectType && objectId) {
                // Insert into ps_updated_rows (or ignore if already exists)
                const exists = this.ps_updated_rows.some((row) => row.type === objectType && row.id === objectId);
                if (!exists) {
                  this.ps_updated_rows.push({
                    type: objectType,
                    id: objectId,
                    data: null
                  });
                }
              }
            }
            continue;
          }

          // Handle PUT operation
          const newOplog: PSOplog = {
            bucket: bucketId,
            op_id: opId,
            key: key || null,
            row_type: objectType || null,
            row_id: objectId || null,
            data: opData,
            hash: checksum // Already normalized to bigint
          };

          this.ps_oplog.push(newOplog);
          opChecksum = addChecksums(opChecksum, checksum);
        } else if (opType === 'MOVE') {
          addChecksum = addChecksums(addChecksum, checksum);
        } else if (opType === 'CLEAR') {
          // Any remaining PUT operations should get an implicit REMOVE
          // Add all rows from ps_oplog to ps_updated_rows for this bucket
          const bucketOps = this.ps_oplog.filter((op) => op.bucket === bucketId);
          for (const op of bucketOps) {
            if (op.row_type && op.row_id) {
              const exists = this.ps_updated_rows.some((row) => row.type === op.row_type && row.id === op.row_id);
              if (!exists) {
                this.ps_updated_rows.push({
                  type: op.row_type,
                  id: op.row_id,
                  data: null
                });
              }
            }
          }

          // Delete all ops from ps_oplog for this bucket
          this.ps_oplog = this.ps_oplog.filter((op) => op.bucket !== bucketId);

          // Update bucket: set last_applied_op = 0, replace add_checksum with CLEAR op checksum, reset op_checksum
          bucket.last_applied_op = 0n;
          // Store checksum as-is (preserve full 64-bit value from SQLite)
          // The checksum comes from the operation, which is already in correct range
          bucket.add_checksum = checksum;
          bucket.op_checksum = 0n;

          addChecksum = 0n;
          isEmpty = true;
          opChecksum = 0n;
        }
      }

      // Update bucket state if we processed any operations
      if (lastOp !== null) {
        bucket.last_op = lastOp;
        // addChecksums() handles 32-bit unsigned wrapping and returns the result
        // We store as full bigint value (SQLite can store 64-bit INTEGERs)
        bucket.add_checksum = addChecksums(bucket.add_checksum, addChecksum);
        bucket.op_checksum = addChecksums(bucket.op_checksum, opChecksum);
        bucket.count_since_last += addedOps;
      }
    }
  }

  async syncLocalDatabase(
    checkpoint: Checkpoint,
    priority?: number
  ): Promise<{ checkpointValid: boolean; ready: boolean; failures?: Array<any> }> {
    throw new Error('Method not implemented.');
  }

  async setTargetCheckpoint(checkpoint: Checkpoint): Promise<void> {
    // This is a no-op
  }
}
