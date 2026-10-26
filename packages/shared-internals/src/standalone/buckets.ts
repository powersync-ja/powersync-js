import { DownloadChanges, DownloadEvent, RestartSyncError } from './api.js';
import { BucketRequest, StreamingSyncRequest, StreamSubscriptionRequest } from './requests.js';
import type {
  BucketChecksum,
  BucketLine,
  Checkpoint,
  OplogEntryJSON,
  StreamingSyncCheckpointDiff
} from './sync_protocol.js';

export class LocalWriteState {
  hasLocalWrites: boolean = false;
  targetCheckpoint?: bigint;
}

/**
 * A JavaScript sync client.
 *
 * This tracks the equivalent of `ps_oplog`, `ps_buckets` and `ps_updated_rows` from the core extension and can update
 * its state for sync lines, emitting changed rows.
 */
export class DownloadClientState {
  readonly #buckets = new Map<string, Bucket>();
  #bucketsByPriority: Map<number, Bucket[]> | undefined;
  #checkpoint: TrackedCheckpoint | undefined;
  // Whether all data for #checkpoint has been received.
  #checkpointComplete = false;

  #writeState: LocalWriteState;
  // For each row (table + id pair), all buckets referencing that row in their oplog history. This is used to find the
  // latest oplog entry for a specific row.
  readonly #rowKeyToBuckets = new Map<string, { key: RowKey; buckets: Set<Bucket> }>();
  // Rows that need to be updated on the next complete sync, e.g. because there was a local mutation for which we need
  // to check whether it synced back down.
  readonly #updatedRows: Map<string, RowKey>;

  constructor(writeState: LocalWriteState, previous?: DownloadClientState) {
    this.#writeState = writeState;

    if (previous) {
      this.#updatedRows = previous.#updatedRows;
      // This replaces a previous client state. Mark all rows tracked by that state as updated, so that we can emit a
      // delete event if they're removed.
      for (const [formattedKey, { key }] of previous.#rowKeyToBuckets) {
        this.#updatedRows.set(formattedKey, key);
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
    const buckets = this.#buckets
      .values()
      .filter((f) => f.lastEntry >= 0n)
      .map((bkt) => ({ name: bkt.name, after: String(bkt.lastEntry) }) satisfies BucketRequest);

    return {
      buckets: buckets.toArray(),
      include_checksum: false,
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
      const resolvedBucket = this.#buckets.get(bucket)!;
      for (const raw of data) {
        const parsed = new OplogEntry(resolvedBucket, raw);
        if (parsed.id > this.#checkpoint!.last_op) {
          throw new RestartSyncError('Checkpoint id out of bounds', true);
        }

        resolvedBucket.pushLine(raw, parsed);
        this.#rowKeyToBuckets
          .getOrInsertComputed(parsed.key.formatted, () => ({ key: parsed.key, buckets: new Set() }))
          .buckets.add(resolvedBucket);
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

    const bucketsToDelete = new Set(this.#buckets.keys());
    for (const [bucket, entry] of checkpoint.buckets.entries()) {
      bucketsToDelete.delete(bucket);

      const resolvedBucket = this.#buckets.getOrInsertComputed(bucket, () => new Bucket(bucket));
      if (entry.priority != null) resolvedBucket.priority = entry.priority;
    }

    for (const remaining of bucketsToDelete) {
      const bucket = this.#buckets.get(remaining);
      if (bucket) {
        // All data visible because of this bucket needs to be rechecked at the next full checkpoint.
        for (const applied of bucket.appliedChanges.values()) {
          this.addToUpdatedRows(applied.key);
          this.#rowKeyToBuckets.get(applied.key.formatted)?.buckets.delete(bucket);
        }
      }

      this.#buckets.delete(remaining);
    }

    this.#bucketsByPriority = Map.groupBy(this.#buckets.values(), (b) => b.priority);
  }

  #syncLocal(targetPriority?: number): DownloadEvent[] {
    if (targetPriority != 0) {
      const blocked = this.#checkLocalWrites();
      if (blocked) {
        // If all buckets in a full checkpoint have priority 0, we can still apply them as a partial checkpoint. The
        // sync service doesn't send a partial_checkpoint_complete line when all buckets have the same priority, so this
        // emulates that line.
        const buckets = [...this.#buckets.values()];
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
        ? this.#buckets.values()
        : this.#bucketsByPriority
            ?.entries()
            .flatMap(([priority, buckets]) => (priority > targetPriority ? [] : buckets));

    const handledKeys = new Set<string>();
    const changes = new Map<string, Map<string, Record<string, unknown> | null>>();

    const handleKey = (key: RowKey) => {
      // We always search for the latest oplog entry across all buckets, so if a key was handled we don't need to handle
      // it again (in case it was updated in two buckets).
      if (handledKeys.has(key.formatted)) return;

      // Find the latest oplog entry for this key in all buckets.
      let latestEntry: OplogEntry | undefined;
      const buckets = this.#rowKeyToBuckets.get(key.formatted)?.buckets;
      if (buckets) {
        for (const bucket of buckets) {
          const entry = bucket.entryFor(
            key.formatted,
            // Include pending changed when bucket is in affectedBuckets
            targetPriority == null || bucket.priority <= targetPriority
          );

          if (entry) {
            if (latestEntry != null && latestEntry.id > entry.id) continue;

            latestEntry = entry;
          }
        }
      }

      const tableEntries = changes.getOrInsertComputed(key.table, () => new Map());
      tableEntries.set(key.rowid, latestEntry?.data?.parsed() ?? null);

      handledKeys.add(key.formatted);
    };

    for (const bucket of affectedBuckets ?? []) {
      for (const key of bucket.dirtyKeys) {
        handleKey(key.row);
      }

      bucket.markApplied();
    }

    if (targetPriority == null) {
      for (const key of this.#updatedRows.values()) {
        handleKey(key);
      }
      this.#updatedRows.clear();
    }

    return { updatedRows: changes };
  }
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

class Bucket {
  priority: number = 3;

  lastEntry: bigint = -1n;
  readonly appliedChanges = new Map<string, OplogEntry>(); // indexed by partial row key
  readonly #allChanges = new Map<string, OplogEntry>(); // indexed by full row key (including subkeys)
  readonly #dirtyKeys = new Map<string, { row: RowKey; full: string }>();

  constructor(readonly name: string) {}

  get dirtyKeys() {
    return this.#dirtyKeys.values();
  }

  #markDirty(key: RowKey, fullKey: string) {
    this.#dirtyKeys.set(key.formatted, { row: key, full: fullKey });
  }

  pushLine(raw: OplogEntryJSON, data: OplogEntry) {
    if (this.lastEntry >= data.id) {
      // To simplify the sync client, we only support a linear bucket history. This works for compacting buckets, but
      // breaks for full defrag if that doesn't generate new bucket names. We just delete everything and restart. This
      // allows not tracking checksums.
      throw new RestartSyncError('already tracked entry', true);
    }

    switch (raw.op) {
      case 'CLEAR': {
        // All prior put operations have turned into remove operations.
        for (const value of this.#allChanges.values()) {
          if (value.data != null) {
            this.#markDirty(value.key, value.fullKey);
            value.data = undefined;
            value.id = data.id;
          }
        }
        break;
      }
      case 'MOVE':
        // MOVE only affects checksums, which we don't compute here.
        break;
      case 'PUT':
      case 'REMOVE':
        this.#allChanges.set(data.fullKey, data);
        this.#markDirty(data.key, data.fullKey);
        break;
    }

    this.lastEntry = data.id;
  }

  entryFor(key: string, includeUnapplied: boolean) {
    if (includeUnapplied) {
      const fullKey = this.#dirtyKeys.get(key)?.full;
      const unappliedChange = fullKey != null && this.#allChanges.get(fullKey);
      if (unappliedChange) return unappliedChange;
    }

    return this.appliedChanges.get(key);
  }

  markApplied() {
    for (const key of this.dirtyKeys) {
      const oplogEntry = this.#allChanges.get(key.full);
      if (oplogEntry == null) {
        this.appliedChanges.delete(key.row.formatted);
      } else {
        this.appliedChanges.set(key.row.formatted, oplogEntry);
      }
    }

    this.#dirtyKeys.clear();
  }
}

class OplogEntry {
  id: bigint;

  readonly key: RowKey;
  readonly fullKey: string;
  data: OplogData | undefined;

  constructor(
    readonly bucket: Bucket,
    source: OplogEntryJSON
  ) {
    this.id = BigInt(source.op_id);
    this.data = source.data ? new OplogData(source.data) : undefined;

    if (source.object_type && source.object_id) {
      this.key = new RowKey(source.object_type, source.object_id);
      this.fullKey = `${this.key.formatted}/${source.subkey}`;
    } else {
      this.key = RowKey.fallback;
      this.fullKey = '';
    }
  }
}

export class RowKey {
  readonly formatted: string;

  constructor(
    readonly table: string,
    readonly rowid: string
  ) {
    this.formatted = `${table}/${rowid}`;
  }

  static fallback = new RowKey('', '');
}

class OplogData {
  #parsedData?: Record<string, unknown>;

  constructor(readonly data: string) {}

  parsed(): Record<string, unknown> {
    if (this.#parsedData) {
      return this.#parsedData;
    }

    return (this.#parsedData = JSON.parse(this.data));
  }
}
