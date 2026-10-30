import { DownloadChanges, DownloadEvent, RestartSyncError } from './api.js';
import { Bucket, OplogEntry, OplogState, RowKey, RowState } from './oplog.js';
import { BucketRequest, StreamingSyncRequest, StreamSubscriptionRequest } from './requests.js';
import type { BucketChecksum, BucketLine, Checkpoint, StreamingSyncCheckpointDiff } from './sync_protocol.js';

/**
 * A JavaScript sync client.
 *
 * This tracks the equivalent of `ps_oplog`, `ps_buckets` and `ps_updated_rows` from the core extension and can update
 * its state for sync lines, emitting changed rows.
 *
 * Instead of storing the full oplog of each bucket, state is tracked per row (table and id): For each row, we store
 * the latest operation for each bucket and subkey. Once every bucket has removed a row and that removal has been
 * applied, the row's state is dropped entirely.
 */
export class DownloadClientState {
  readonly #oplog = new OplogState();
  #bucketsByPriority: Map<number, Bucket[]> | undefined;
  #checkpoint: TrackedCheckpoint | undefined;
  // Whether all data for #checkpoint has been received.
  #checkpointComplete = false;

  #writeState: LocalWriteState;
  // Rows that need to be updated on the next complete sync, e.g. because there was a local mutation for which we need
  // to check whether it synced back down.
  readonly #updatedRows: Map<string, RowKey>;

  constructor(writeState: LocalWriteState, previous?: DownloadClientState) {
    this.#writeState = writeState;

    if (previous) {
      this.#updatedRows = previous.#updatedRows;
      // This replaces a previous client state. Mark all rows tracked by that state as updated, so that we can emit a
      // delete event if they're removed.
      for (const row of previous.#oplog.rows.values()) {
        this.#updatedRows.set(row.key.formatted, row.key);
      }
    } else {
      this.#updatedRows = new Map();
    }
  }

  prepareConnectRequest(
    clientId: string,
    parameters: Record<string, unknown>,
    streams: StreamSubscriptionRequest,
    metadata?: Record<string, string>
  ): StreamingSyncRequest {
    const buckets = this.#oplog.buckets
      .values()
      .filter((f) => f.lastEntry >= 0n)
      .map((bkt) => ({ name: bkt.name, after: String(bkt.lastEntry) }) satisfies BucketRequest);

    return {
      buckets: buckets.toArray(),
      include_checksum: true,
      raw_data: true,
      client_id: clientId,
      parameters,
      streams,
      app_metadata: metadata
    };
  }

  push(line: BucketLine): DownloadEvent[] {
    if ('checkpoint' in line) {
      this.#checkpointComplete = false;
      this.#reconcileBuckets(new TrackedCheckpoint(line.checkpoint));
      const streams = line.checkpoint.streams;
      if (streams != null) {
        return [{ type: 'resolvedStreams', streams }];
      }
    } else if ('checkpoint_diff' in line) {
      const existing = this.#checkpoint!;
      this.#checkpointComplete = false;
      existing.applyDiff(line);
      this.#reconcileBuckets(existing);
    } else if ('data' in line) {
      const { bucket, data } = line.data;
      const resolvedBucket = this.#oplog.buckets.get(bucket)!;
      for (const raw of data) {
        const parsed = OplogEntry.fromJson(raw);
        if (parsed.id > this.#checkpoint!.last_op) {
          throw new RestartSyncError('Checkpoint id out of bounds', true);
        }

        resolvedBucket.pushLine(this.#oplog, raw, parsed);
      }
    } else if ('checkpoint_complete' in line) {
      this.#checkpointComplete = true;
      return this.#syncLocal();
    } else {
      return this.#syncLocal(line.partial_checkpoint_complete.priority);
    }

    return [];
  }

  /**
   * Attempts to apply the last checkpoint again if all of its data has been received, e.g. because
   * {@link LocalWriteState} has changed since it was received.
   */
  retryCheckpoint(): DownloadEvent[] {
    return this.#checkpointComplete ? this.#syncLocal() : [];
  }

  addToUpdatedRows(key: RowKey) {
    this.#updatedRows.set(key.formatted, key);
  }

  #reconcileBuckets(checkpoint: TrackedCheckpoint) {
    this.#checkpoint = checkpoint;
    const buckets = this.#oplog.buckets;

    const bucketsToDelete = new Set(buckets.keys());
    for (const [bucket, entry] of checkpoint.buckets.entries()) {
      bucketsToDelete.delete(bucket);

      const resolvedBucket = buckets.getOrInsertComputed(bucket, () => new Bucket(bucket));
      if (entry.priority != null) resolvedBucket.priority = entry.priority;
    }

    for (const remaining of bucketsToDelete) {
      // All data visible because of this bucket needs to be rechecked at the next full checkpoint.
      for (const key of this.#oplog.removeBucket(buckets.get(remaining)!)) {
        this.addToUpdatedRows(key);
      }
    }

    this.#bucketsByPriority = Map.groupBy(buckets.values(), (b) => b.priority);
  }

  #syncLocal(targetPriority?: number): DownloadEvent[] {
    if (targetPriority != 0) {
      const blocked = this.#checkLocalWrites();
      if (blocked) {
        // If all buckets in a full checkpoint have priority 0, we can still apply them as a partial checkpoint. The
        // sync service doesn't send a partial_checkpoint_complete line when all buckets have the same priority, so this
        // emulates that line.
        const buckets = [...this.#oplog.buckets.values()];
        if (targetPriority == null && buckets.length != 0 && buckets.every((b) => b.priority == 0)) {
          return [{ type: 'rows', changes: this.#applyChanges(0), priority: 0 }, blocked];
        }

        return [blocked];
      }
    }

    const changes = this.#applyChanges(targetPriority);
    return [targetPriority == null ? { type: 'rows', changes } : { type: 'rows', changes, priority: targetPriority }];
  }

  /**
   * Returns an event explaining why a checkpoint can't be applied due to local writes, or `undefined` if there are no
   * outstanding local writes.
   */
  #checkLocalWrites(): DownloadEvent | undefined {
    const localWrites = this.#writeState;
    const target = localWrites.targetCheckpoint;
    const writeCheckpoint = this.#checkpoint?.write_checkpoint;

    if (localWrites.hasLocalWrites) {
      // Can't apply checkpoints with mutations that haven't been uploaded yet.
      return { type: 'blockedDueToLocalData' };
    } else if (target != null && (writeCheckpoint == null || writeCheckpoint < target)) {
      return { type: 'waitingForCheckpoint', target, received: writeCheckpoint };
    }

    return undefined;
  }

  #applyChanges(targetPriority?: number): DownloadChanges {
    let affectedBuckets =
      targetPriority == null
        ? this.#oplog.buckets.values()
        : this.#bucketsByPriority
            ?.entries()
            .flatMap(([priority, buckets]) => (priority > targetPriority ? [] : buckets));

    const handledKeys = new Set<string>();
    const handledRows: RowState[] = [];
    const changes = new Map<string, Map<string, Record<string, unknown> | null>>();

    const handleKey = (key: RowKey) => {
      // We always search for the latest oplog entry across all buckets, so if a key was handled we don't need to handle
      // it again (in case it was updated in two buckets).
      if (handledKeys.has(key.formatted)) return;
      handledKeys.add(key.formatted);

      const row = this.#oplog.rows.get(key.formatted);
      const latestEntry = row?.resolve(targetPriority);
      if (row) handledRows.push(row);

      const tableEntries = changes.getOrInsertComputed(key.table, () => new Map());
      tableEntries.set(key.rowid, latestEntry?.data?.parsed() ?? null);
    };

    for (const bucket of affectedBuckets ?? []) {
      const expectedChecksum = (this.#checkpoint!.buckets.get(bucket.name)?.checksum ?? 0) | 0;
      if (bucket.checksum != expectedChecksum) {
        throw new RestartSyncError(
          `Checksum error on ${bucket.name}, expected ${expectedChecksum} but oplog is at ${bucket.checksum}`,
          true
        );
      }

      for (const row of bucket.dirtyRows) {
        handleKey(row.key);
      }

      bucket.markApplied();
    }

    if (targetPriority == null) {
      for (const key of this.#updatedRows.values()) {
        handleKey(key);
      }
      this.#updatedRows.clear();
    }

    for (const row of handledRows) {
      this.#oplog.collectGarbage(row);
    }

    return { updatedRows: changes };
  }
}

export class LocalWriteState {
  hasLocalWrites: boolean = false;
  targetCheckpoint?: bigint;
}

class TrackedCheckpoint {
  last_op: bigint;
  write_checkpoint: bigint | null;
  readonly buckets: Map<string, BucketChecksum> = new Map();

  constructor(source: Checkpoint) {
    this.last_op = BigInt(source.last_op_id);
    this.write_checkpoint = source.write_checkpoint == null ? null : BigInt(source.write_checkpoint);
    for (const bucket of source.buckets) {
      this.buckets.set(bucket.bucket, bucket);
    }
  }

  /**
   * Merges bucket changes from a diff checkpoint line into this full checkpoint.
   */
  applyDiff({ checkpoint_diff }: StreamingSyncCheckpointDiff) {
    this.last_op = BigInt(checkpoint_diff.last_op_id);
    this.write_checkpoint = checkpoint_diff.write_checkpoint == null ? null : BigInt(checkpoint_diff.write_checkpoint);

    for (const update of checkpoint_diff.updated_buckets) {
      this.buckets.set(update.bucket, update);
    }
    for (const removed of checkpoint_diff.removed_buckets) {
      this.buckets.delete(removed);
    }
  }
}
