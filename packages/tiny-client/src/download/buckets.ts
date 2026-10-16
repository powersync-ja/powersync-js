import { BucketChecksum, BucketLine, Checkpoint, RawOplogEntry, StreamingSyncCheckpointDiff } from './protocol.js';

export interface DownloadChanges {
  updatedRows: Map<string, Map<string, Record<string, unknown> | null>>;
}

export type DownloadEvent = DownloadChanges | 'blockedDueToLocalData' | { waitingForCheckpoint: bigint };

export class DownloadClientState {
  readonly #buckets = new Map<string, Bucket>();
  #bucketsByPriority: Map<number, Bucket[]> | undefined;
  #checkpoint: TrackedCheckpoint | undefined;

  /**
   * State of local writes.
   *
   *  - 'dirty' means that local writes have not been uploaded yet (roughly corresponds to a non-empty `ps_crud` table).
   *  - a bigint value means that we have requested a checkpoint for local writes, and are waiting for it to be part of
   *    the sync response.
   *  - null means that there's never been a local write.
   */
  #localWriteState: 'dirty' | bigint | null = null;
  readonly #rowKeyToBuckets = new Map<string, Set<Bucket>>();
  readonly #updatedRows = new Map<string, RowKey>();

  push(line: BucketLine): DownloadEvent[] {
    if ('checkpoint' in line) {
      this.#reconcileBuckets(new TrackedCheckpoint(line.checkpoint));
    } else if ('checkpoint_diff' in line) {
      const existing = this.#checkpoint!;
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
        this.#rowKeyToBuckets.getOrInsertComputed(parsed.key.formatted, () => new Set()).add(resolvedBucket);
      }
    } else if ('checkpoint_complete' in line) {
      return this.#syncLocal();
    } else {
      return this.#syncLocal(line.partial_checkpoint_complete.priority);
    }

    return [];
  }

  markLocalWrite(state: 'dirty' | bigint) {
    this.#localWriteState = state;
  }

  #addToUpdatedRows(key: RowKey) {
    this.#updatedRows.set(key.formatted, key);
  }

  #reconcileBuckets(checkpoint: TrackedCheckpoint) {
    this.#checkpoint = checkpoint;

    const bucketsToDelete = new Set(this.#buckets.keys());
    for (const [bucket, entry] of checkpoint.buckets.entries()) {
      bucketsToDelete.delete(bucket);

      let resolvedBucket = this.#buckets.get(bucket);
      if (!resolvedBucket) {
        const newBucket = new Bucket();
        resolvedBucket = newBucket;
        this.#buckets.set(bucket, newBucket);
      }

      resolvedBucket.priority = entry.priority;
    }

    for (const remaining of bucketsToDelete) {
      const bucket = this.#buckets.get(remaining);
      if (bucket) {
        // All data visible because of this bucket needs to be rechecked at the next full checkpoint.
        for (const applied of bucket.appliedChanges.values()) {
          this.#addToUpdatedRows(applied.key);
          this.#rowKeyToBuckets.get(applied.key.formatted)?.delete(bucket);
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
          return [this.#applyChanges(0), blocked];
        }

        return [blocked];
      }
    }

    return [this.#applyChanges(targetPriority)];
  }

  /**
   * Returns an event explaining why a checkpoint can't be applied due to local writes, or `undefined` if there are no
   * outstanding local writes.
   */
  #checkLocalWrites(): DownloadEvent | undefined {
    const localWrites = this.#localWriteState;
    const writeCheckpoint = this.#checkpoint?.write_checkpoint;

    if (localWrites === 'dirty') {
      // Can't apply checkpoints with local sync changes.
      return 'blockedDueToLocalData';
    } else if (localWrites != null && (writeCheckpoint == null || writeCheckpoint < localWrites)) {
      return { waitingForCheckpoint: localWrites };
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
      const buckets = this.#rowKeyToBuckets.get(key.formatted);
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

  #lastEntry: bigint = -1n;
  readonly appliedChanges = new Map<string, OplogEntry>(); // indexed by partial row key
  readonly #allChanges = new Map<string, OplogEntry>(); // indexed by full row key (including subkeys)
  readonly #dirtyKeys = new Map<string, { row: RowKey; full: string }>();

  get dirtyKeys() {
    return this.#dirtyKeys.values();
  }

  #markDirty(key: RowKey, fullKey: string) {
    this.#dirtyKeys.set(key.formatted, { row: key, full: fullKey });
  }

  pushLine(raw: RawOplogEntry, data: OplogEntry) {
    if (this.#lastEntry >= data.id) {
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

    this.#lastEntry = data.id;
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
    source: RawOplogEntry
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

class RowKey {
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

export class RestartSyncError extends Error {
  constructor(
    message: string,
    readonly clearLocal = false
  ) {
    super(message);
  }
}
