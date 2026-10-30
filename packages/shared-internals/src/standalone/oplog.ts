import { RestartSyncError } from './api.js';
import type { OplogEntryJSON } from './sync_protocol.js';

export class OplogState {
  readonly rows = new Map<string, RowState>();
  readonly buckets = new Map<string, Bucket>();

  rowState(key: RowKey) {
    return this.rows.getOrInsertComputed(key.formatted, () => new RowState(key));
  }

  /**
   * Removes a bucket and all row state associated with it.
   *
   * Returns keys of rows for which the bucket has contributed applied state.
   */
  removeBucket(bucket: Bucket): RowKey[] {
    const affected: RowKey[] = [];
    for (const row of bucket.rows) {
      if (row.buckets.get(bucket)!.applied != null) {
        affected.push(row.key);
      }

      row.buckets.delete(bucket);
      if (row.buckets.size == 0) {
        this.rows.delete(row.key.formatted);
      }
    }

    this.buckets.delete(bucket.name);
    return affected;
  }

  /**
   * Drops the state of a row if it can no longer contribute data.
   */
  collectGarbage(row: RowState) {
    if (!row.isRemoved) return;

    for (const bucket of row.buckets.keys()) {
      bucket.rows.delete(row);
    }
    this.rows.delete(row.key.formatted);
  }
}

export class Bucket {
  priority: number = 3;
  checksum = 0;
  lastEntry: bigint = -1n;

  /**
   * All rows for which this bucket has operations.
   */
  readonly rows = new Set<RowState>();
  /**
   * Rows for which this bucket has received operations that haven't been applied yet.
   */
  readonly dirtyRows = new Set<RowState>();

  constructor(readonly name: string) {}

  #addToChecksum(value: number) {
    // Checksums are u32 values, they should wrap around.
    this.checksum = (this.checksum + value) | 0;
  }

  pushLine(oplog: OplogState, raw: OplogEntryJSON, data: OplogEntry) {
    if (this.lastEntry >= data.id) {
      // To simplify the sync client, we only support a linear bucket history. This works for compacting buckets, but
      // breaks for full defrag if that doesn't generate new bucket names. We just delete everything and restart. This
      // allows not tracking checksums.
      throw new RestartSyncError('already tracked entry', true);
    }

    const opChecksum = raw.checksum | 0;

    switch (raw.op) {
      case 'CLEAR': {
        // All prior put operations have turned into remove operations.
        for (const row of this.rows) {
          const bySubkey = row.buckets.get(this)!.bySubkey;
          bySubkey.clear();
          bySubkey.set('', new OplogEntry(data.id, row.key, '', undefined));
          this.dirtyRows.add(row);
        }

        // The checksum of a clear operation is the sum of all put operations we've just replaced.
        this.checksum = opChecksum;
        break;
      }
      case 'MOVE':
        this.#addToChecksum(opChecksum);
        break;
      case 'PUT':
      case 'REMOVE':
        this.#addToChecksum(opChecksum);
        const key = data.key;
        if (key == null) {
          throw new RestartSyncError('Expected row key');
        }

        const row = oplog.rowState(key);
        row.bucketState(this).bySubkey.set(data.subkey, data);
        this.rows.add(row);
        this.dirtyRows.add(row);
        break;
    }

    this.lastEntry = data.id;
  }

  markApplied() {
    for (const row of this.dirtyRows) {
      const state = row.buckets.get(this)!;
      state.applied = state.resolveLatest();
    }

    this.dirtyRows.clear();
  }
}

/**
 * The state of a row (identified by table and id) across all buckets.
 */
export class RowState {
  readonly buckets = new Map<Bucket, BucketRowState>();

  constructor(readonly key: RowKey) {}

  bucketState(bucket: Bucket): BucketRowState {
    return this.buckets.getOrInsertComputed(bucket, () => new BucketRowState());
  }

  /**
   * Finds the latest oplog entry for this row across all buckets.
   *
   * Pending changes are only considered for buckets included in the target priority, other buckets use their applied
   * state. Unlike the core extension (which doesn't store REMOVE operations), a REMOVE in one bucket also hides older
   * PUTs from other buckets.
   */
  resolve(targetPriority?: number): OplogEntry | undefined {
    let latestEntry: OplogEntry | undefined;
    for (const [bucket, state] of this.buckets) {
      const entry = targetPriority == null || bucket.priority <= targetPriority ? state.resolveLatest() : state.applied;

      if (entry && (latestEntry == null || entry.id > latestEntry.id)) {
        latestEntry = entry;
      }
    }

    return latestEntry;
  }

  /**
   * Whether every bucket has removed this row and all of those removals have been applied.
   */
  get isRemoved(): boolean {
    for (const [bucket, state] of this.buckets) {
      if (bucket.dirtyRows.has(this) || state.applied?.data != null) {
        return false;
      }
    }

    return true;
  }
}

/**
 * The state of a row within a single bucket.
 */
class BucketRowState {
  // Latest operation for each subkey.
  readonly bySubkey = new Map<string, OplogEntry>();
  // The resolved entry at the time this bucket was last applied.
  applied: OplogEntry | undefined;

  /**
   * Resolves the current state of a row in this bucket across all subkeys.
   */
  resolveLatest(): OplogEntry | undefined {
    let latestPut: OplogEntry | undefined;
    let latestRemove: OplogEntry | undefined;

    for (const entry of this.bySubkey.values()) {
      if (entry.data != null) {
        if (latestPut == null || entry.id > latestPut.id) latestPut = entry;
      } else {
        if (latestRemove == null || entry.id > latestRemove.id) latestRemove = entry;
      }
    }

    // Within a bucket, the row exists if any subkey has a PUT (the operation is only removed once we see a REMOVE for
    // every subkey).
    return latestPut ?? latestRemove;
  }
}

export class RowKey {
  readonly formatted: string;

  constructor(
    readonly table: string,
    readonly rowid: string
  ) {
    this.formatted = JSON.stringify([table, rowid]);
  }
}

export class OplogEntry {
  constructor(
    readonly id: bigint,
    readonly key: RowKey | null,
    readonly subkey: string,
    readonly data: OplogData | undefined
  ) {}

  static fromJson(source: OplogEntryJSON): OplogEntry {
    const id = BigInt(source.op_id);
    const data = source.data ? new OplogData(source.data) : undefined;
    const key = source.object_type && source.object_id ? new RowKey(source.object_type, source.object_id) : null;

    return new OplogEntry(id, key, source.subkey ?? '', data);
  }
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
