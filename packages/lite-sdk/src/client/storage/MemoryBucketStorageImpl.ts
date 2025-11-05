import type { BucketState, Checkpoint } from '@powersync/service-core';
import type { BucketOperationProgress, BucketStorage, SyncDataBatch } from './BucketStorage.js';
import type { SyncOperation, SyncOperationsHandler } from './SyncOperationsHandler.js';
import { constructKey, toStringOrNull } from './bucketHelpers.js';
import { addChecksums, normalizeChecksum, subtractChecksums } from './checksumUtils.js';
import type { PSBucket } from './storage-types/ps_buckets.js';
import type { PSCrud } from './storage-types/ps_crud.js';
import type { PSKeyValue } from './storage-types/ps_kv.js';
import type { PSOplog } from './storage-types/ps_oplog.js';
import type { PSTx } from './storage-types/ps_tx.js';
import type { PSUntyped } from './storage-types/ps_untyped.js';

export type OpType = 'PUT' | 'REMOVE' | 'MOVE' | 'CLEAR';

export const MAX_OP_ID = '9223372036854775807';

export type MemoryBucketStorageImplOptions = {
  /** Array of handlers for processing sync operations collected from the protocol */
  operationsHandlers: SyncOperationsHandler[];
};

export class MemoryBucketStorageImpl implements BucketStorage {
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

  /** Handlers for processing sync operations collected from the protocol */
  protected operationsHandlers: SyncOperationsHandler[];

  constructor(options: MemoryBucketStorageImplOptions) {
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
    this.operationsHandlers = options.operationsHandlers;
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
    // TODO: maybe store local state separately
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

    // TODO crud
    // // 2. Verify sequence hasn't changed (SELECT seq FROM sqlite_sequence WHERE name = 'ps_crud')
    // // If sequence changed, new items were added even if later deleted
    // if (this.ps_crud_seq !== seqBefore) {
    //   // New crud data may have been uploaded since we got the checkpoint. Abort.
    //   return false;
    // }

    // // Verify sequence exists (should not be empty)
    // // SQL: SELECT seq FROM sqlite_sequence WHERE name = 'ps_crud'
    // if (this.ps_crud_seq === 0 && seqBefore === 0) {
    //   // This shouldn't happen if we got past the first check, but defensive
    //   throw new Error('SQLite Sequence should not be empty');
    // }

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
    const r = await this.validateChecksums(checkpoint, priority);
    if (!r.checkpointValid) {
      for (const b of r.checkpointFailures ?? []) {
        await this.removeBuckets([b]);
      }
      return { ready: false, checkpointValid: false, failures: r.checkpointFailures };
    }

    let buckets = checkpoint.buckets;
    if (priority !== undefined) {
      buckets = buckets.filter((b) => hasMatchingPriority(priority, b));
    }

    // Update bucket last_op to checkpoint.last_op_id
    const bucketNames = buckets.map((b) => b.bucket);
    for (const bucketName of bucketNames) {
      const bucket = this.ps_buckets.find((b) => b.name === bucketName);
      if (bucket) {
        bucket.last_op = normalizeChecksum(checkpoint.last_op_id);
      }
    }

    // Update '$local' bucket if write_checkpoint is provided and it's a complete sync
    if (priority == null && checkpoint.write_checkpoint) {
      const localBucket = this.ps_buckets.find((b) => b.name === '$local');
      if (localBucket) {
        localBucket.last_op = normalizeChecksum(checkpoint.write_checkpoint);
      }
    }

    const valid = await this.updateObjectsFromBuckets(checkpoint, priority);
    if (!valid) {
      return { ready: false, checkpointValid: true };
    }

    return {
      ready: true,
      checkpointValid: true
    };
  }

  /**
   * Atomically update the local state to the current checkpoint.
   * Ported from Rust sync_local function.
   *
   * This includes copying data over from the oplog to the output collections.
   * For now, operations are collected but not applied (pluggable approach).
   */
  private async updateObjectsFromBuckets(checkpoint: Checkpoint, priority: number | undefined): Promise<boolean> {
    // Check if sync can apply (can_apply_sync_changes equivalent)
    if (!(await this.canApplySyncChanges(priority))) {
      return false;
    }

    // Collect operations that need to be applied
    const operations = await this.collectFullOperations(checkpoint, priority);

    // Process operations using all handlers if provided
    if (this.operationsHandlers.length > 0 && operations.length > 0) {
      for (const handler of this.operationsHandlers) {
        await handler.processOperations(operations);
      }
    }

    // Update last_applied_op for buckets
    await this.setLastAppliedOp(checkpoint, priority);

    // Update count_at_last for complete sync
    if (priority == null) {
      const bucketToCount = new Map(checkpoint.buckets.map((b) => [b.bucket, b.count ?? 0]));
      for (const bucket of this.ps_buckets) {
        if (bucket.name !== '$local' && bucketToCount.has(bucket.name)) {
          bucket.count_at_last = bucketToCount.get(bucket.name)!;
          bucket.count_since_last = 0;
        }
      }
    }

    // Mark as completed (clear ps_updated_rows for complete sync)
    await this.markCompleted(priority);

    return true;
  }

  /**
   * Check if sync changes can be applied.
   * Ported from Rust can_apply_sync_changes.
   *
   * Don't publish downloaded data until the upload queue is empty
   * (except for downloaded data in priority 0, which is published earlier).
   */
  private async canApplySyncChanges(priority: number | undefined): Promise<boolean> {
    const needsCheck = priority === undefined || !this.mayPublishWithOutstandingUploads(priority);

    if (needsCheck) {
      // Check if '$local' bucket has target_op > last_op
      // SQL: SELECT 1 FROM ps_buckets WHERE target_op > last_op AND name = '$local'
      const localBucket = this.ps_buckets.find((b) => b.name === '$local');
      if (localBucket && localBucket.target_op > localBucket.last_op) {
        return false;
      }

      // Check if ps_crud has any data
      // SQL: SELECT 1 FROM ps_crud LIMIT 1
      if (this.ps_crud.length > 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a priority may publish with outstanding uploads.
   * Ported from Rust BucketPriority::may_publish_with_outstanding_uploads.
   */
  private mayPublishWithOutstandingUploads(priority: number): boolean {
    // Priority 0 may publish with outstanding uploads
    return priority === 0;
  }

  /**
   * Collect full operations from oplog that need to be applied.
   * Ported from Rust collect_full_operations.
   *
   * Returns an array of operations to apply, where each operation contains:
   * - type: row_type (table name)
   * - id: row_id
   * - op: operation type ('PUT' or 'REMOVE')
   * - data: oplog data (null for REMOVE operations)
   */
  private async collectFullOperations(
    checkpoint: Checkpoint,
    priority: number | undefined
  ): Promise<Array<SyncOperation>> {
    const operations: Array<SyncOperation> = [];

    if (priority === undefined) {
      // Complete sync - collect all updated rows
      // SQL equivalent:
      // WITH updated_rows AS (
      //   SELECT b.row_type, b.row_id FROM ps_buckets AS buckets
      //     CROSS JOIN ps_oplog AS b ON b.bucket = buckets.id
      //     AND (b.op_id > buckets.last_applied_op)
      //   UNION ALL SELECT row_type, row_id FROM ps_updated_rows
      // )
      // SELECT b.row_type, b.row_id,
      //   (SELECT iif(max(r.op_id), r.data, null)
      //    FROM ps_oplog r
      //    WHERE r.row_type = b.row_type AND r.row_id = b.row_id) as data
      // FROM updated_rows b
      // GROUP BY b.row_type, b.row_id

      // Collect updated rows from oplog (op_id > last_applied_op)
      const updatedRows = new Map<string, { type: string; id: string; maxOpId: bigint; data: string | null }>();

      for (const bucket of this.ps_buckets) {
        for (const oplogEntry of this.ps_oplog) {
          if (oplogEntry.bucket === bucket.id && oplogEntry.op_id > bucket.last_applied_op) {
            if (oplogEntry.row_type && oplogEntry.row_id) {
              const key = `${oplogEntry.row_type}:${oplogEntry.row_id}`;
              const existing = updatedRows.get(key);
              if (!existing || oplogEntry.op_id > existing.maxOpId) {
                updatedRows.set(key, {
                  type: oplogEntry.row_type,
                  id: oplogEntry.row_id,
                  maxOpId: oplogEntry.op_id,
                  data: oplogEntry.data
                });
              }
            }
          }
        }
      }

      // Add rows from ps_updated_rows
      for (const row of this.ps_updated_rows) {
        if (row.type && row.id) {
          const key = `${row.type}:${row.id}`;
          if (!updatedRows.has(key)) {
            updatedRows.set(key, {
              type: row.type,
              id: row.id,
              maxOpId: 0n,
              data: null
            });
          }
        }
      }

      // For each updated row, find the latest oplog entry across all buckets
      // The updatedRows map already has the data from oplog entries with op_id > last_applied_op,
      // but we need to find the absolute latest across all buckets (not just those with op_id > last_applied_op)
      for (const row of updatedRows.values()) {
        let latestData: string | null = row.data;
        let latestOpId: bigint = row.maxOpId;

        // Find the latest oplog entry across all buckets for this row
        for (const oplogEntry of this.ps_oplog) {
          if (oplogEntry.row_type === row.type && oplogEntry.row_id === row.id && oplogEntry.op_id > latestOpId) {
            latestOpId = oplogEntry.op_id;
            latestData = oplogEntry.data;
          }
        }

        operations.push({
          type: row.type,
          id: row.id,
          op: latestData === null ? 'REMOVE' : 'PUT',
          data: latestData
        });
      }
    } else {
      // Partial sync - only collect operations for specific buckets
      // SQL equivalent:
      // WITH involved_buckets (id) AS MATERIALIZED (
      //   SELECT id FROM ps_buckets WHERE name IN (SELECT value FROM json_each(json_extract(?1, '$.buckets')))
      // ),
      // updated_rows AS (
      //   SELECT b.row_type, b.row_id FROM ps_buckets AS buckets
      //     CROSS JOIN ps_oplog AS b ON b.bucket = buckets.id
      //     AND (b.op_id > buckets.last_applied_op)
      //     WHERE buckets.id IN (SELECT id FROM involved_buckets)
      // )
      // SELECT b.row_type, b.row_id,
      //   (SELECT iif(max(r.op_id), r.data, null)
      //    FROM ps_oplog r
      //    WHERE r.row_type = b.row_type AND r.row_id = b.row_id
      //    AND r.bucket IN (SELECT id FROM involved_buckets)) as data
      // FROM updated_rows b
      // GROUP BY b.row_type, b.row_id

      // Get involved buckets (buckets matching the priority)
      const involvedBuckets = checkpoint.buckets.filter((b) => hasMatchingPriority(priority, b)).map((b) => b.bucket);

      const involvedBucketIds = new Set(
        this.ps_buckets.filter((b) => involvedBuckets.includes(b.name)).map((b) => b.id)
      );

      // Collect updated rows from oplog for involved buckets
      const updatedRows = new Map<string, { type: string; id: string; maxOpId: bigint; data: string | null }>();

      for (const bucket of this.ps_buckets) {
        if (involvedBucketIds.has(bucket.id)) {
          for (const oplogEntry of this.ps_oplog) {
            if (
              oplogEntry.bucket === bucket.id &&
              oplogEntry.op_id > bucket.last_applied_op &&
              oplogEntry.row_type &&
              oplogEntry.row_id
            ) {
              const key = `${oplogEntry.row_type}:${oplogEntry.row_id}`;
              const existing = updatedRows.get(key);
              if (!existing || oplogEntry.op_id > existing.maxOpId) {
                updatedRows.set(key, {
                  type: oplogEntry.row_type,
                  id: oplogEntry.row_id,
                  maxOpId: oplogEntry.op_id,
                  data: oplogEntry.data
                });
              }
            }
          }
        }
      }

      // For each updated row, find the latest oplog entry from involved buckets
      // The updatedRows map already has the data from oplog entries with op_id > last_applied_op,
      // but we need to find the absolute latest across all involved buckets
      for (const row of updatedRows.values()) {
        let latestData: string | null = row.data;
        let latestOpId: bigint = row.maxOpId;

        // Find the latest oplog entry from involved buckets for this row
        for (const oplogEntry of this.ps_oplog) {
          if (
            involvedBucketIds.has(oplogEntry.bucket) &&
            oplogEntry.row_type === row.type &&
            oplogEntry.row_id === row.id &&
            oplogEntry.op_id > latestOpId
          ) {
            latestOpId = oplogEntry.op_id;
            latestData = oplogEntry.data;
          }
        }

        operations.push({
          type: row.type,
          id: row.id,
          op: latestData === null ? 'REMOVE' : 'PUT',
          data: latestData
        });
      }
    }

    return operations;
  }

  /**
   * Set last_applied_op for buckets.
   * Ported from Rust set_last_applied_op.
   */
  private async setLastAppliedOp(checkpoint: Checkpoint, priority: number | undefined): Promise<void> {
    if (priority !== undefined) {
      // Partial sync - update only involved buckets
      // SQL: UPDATE ps_buckets SET last_applied_op = last_op
      //      WHERE last_applied_op != last_op AND
      //      name IN (SELECT value FROM json_each(json_extract(?1, '$.buckets')))
      const involvedBuckets = checkpoint.buckets.filter((b) => hasMatchingPriority(priority, b)).map((b) => b.bucket);

      for (const bucketName of involvedBuckets) {
        const bucket = this.ps_buckets.find((b) => b.name === bucketName);
        if (bucket && bucket.last_applied_op !== bucket.last_op) {
          bucket.last_applied_op = bucket.last_op;
        }
      }
    } else {
      // Complete sync - update all buckets
      // SQL: UPDATE ps_buckets SET last_applied_op = last_op WHERE last_applied_op != last_op
      for (const bucket of this.ps_buckets) {
        if (bucket.last_applied_op !== bucket.last_op) {
          bucket.last_applied_op = bucket.last_op;
        }
      }
    }
  }

  /**
   * Mark sync as completed.
   * Ported from Rust mark_completed.
   */
  private async markCompleted(priority: number | undefined): Promise<void> {
    if (priority === undefined) {
      // Complete sync - clear ps_updated_rows
      // SQL: DELETE FROM ps_updated_rows
      this.ps_updated_rows = [];
    }

    // TODO: Handle ps_sync_state table if needed
    // For now, we just clear ps_updated_rows for complete sync
  }

  /**
   * Validate checksums for a checkpoint.
   * This is a placeholder that will be implemented with the Rust validation logic.
   */
  async validateChecksums(
    checkpoint: Checkpoint,
    priority: number | undefined
  ): Promise<{ checkpointValid: boolean; ready: boolean; checkpointFailures?: string[] }> {
    if (priority !== undefined) {
      // Only validate the buckets within the priority we care about
      const newBuckets = checkpoint.buckets.filter((cs) => hasMatchingPriority(priority, cs));
      checkpoint = { ...checkpoint, buckets: newBuckets };
    }

    const result = await this.validateCheckpointInternal(checkpoint);

    if (!result) {
      return {
        checkpointValid: false,
        ready: false,
        checkpointFailures: []
      };
    }

    if (result.valid) {
      return { ready: true, checkpointValid: true };
    } else {
      return {
        checkpointValid: false,
        ready: false,
        checkpointFailures: result.failed_buckets
      };
    }
  }

  /**
   * Internal checkpoint validation implementation.
   * Ported from Rust validate_checkpoint function.
   *
   * Validates that the checksums in the checkpoint match the actual checksums
   * stored in ps_buckets. For each bucket:
   * - Queries ps_buckets to get add_checksum and op_checksum
   * - Calculates actual = add_checksum + op_checksum
   * - Compares with expected checksum from checkpoint
   * - Returns list of failed buckets if checksums don't match
   */
  private async validateCheckpointInternal(checkpoint: Checkpoint): Promise<{
    valid: boolean;
    failed_buckets?: string[];
  } | null> {
    const failedBuckets: string[] = [];

    // Iterate through each bucket in the checkpoint
    for (const bucketChecksum of checkpoint.buckets) {
      // Find the bucket in ps_buckets by name
      // SQL equivalent: SELECT add_checksum, op_checksum FROM ps_buckets WHERE name = ?
      const bucket = this.ps_buckets.find((b) => b.name === bucketChecksum.bucket);

      // If bucket doesn't exist, use zero checksums (matching Rust behavior)
      let addChecksum: bigint = 0n;
      let opChecksum: bigint = 0n;

      if (bucket) {
        addChecksum = bucket.add_checksum;
        opChecksum = bucket.op_checksum;
      }

      // Calculate actual checksum: add_checksum + op_checksum
      // This matches Rust: let actual = add_checksum + oplog_checksum;
      // addChecksums already handles 32-bit unsigned wrapping
      const actual = addChecksums(addChecksum, opChecksum);

      // Normalize expected checksum from checkpoint (it's a number, convert to bigint)
      // The checkpoint checksum is a 32-bit unsigned integer
      const expected = normalizeChecksum(bucketChecksum.checksum);

      // Compare actual with expected checksum
      // Both are already 32-bit masked (actual from addChecksums, expected needs masking)
      // Mask expected to ensure 32-bit comparison (checksums are 32-bit unsigned)
      const expected32 = expected & 0xffffffffn;

      if (actual !== expected32) {
        // Checksum mismatch - add to failures
        failedBuckets.push(bucketChecksum.bucket);
      }
    }

    // Return result matching Rust CheckpointResult structure
    return {
      valid: failedBuckets.length === 0,
      failed_buckets: failedBuckets.length > 0 ? failedBuckets : undefined
    };
  }

  async setTargetCheckpoint(checkpoint: Checkpoint): Promise<void> {
    // This is a no-op
  }
}

/**
 * Helper function to check if a bucket matches the given priority.
 */
function hasMatchingPriority(priority: number, bucket: { priority?: number }): boolean {
  return bucket.priority != null && bucket.priority <= priority;
}
