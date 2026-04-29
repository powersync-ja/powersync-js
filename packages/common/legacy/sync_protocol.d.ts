export type SyncDataBucketJSON = {
  bucket: string;
  has_more?: boolean;
  after?: string;
  next_after?: string;
  data: OplogEntryJSON[];
};
export interface OplogEntryJSON {
  checksum: number;
  data?: string;
  object_id?: string;
  object_type?: string;
  op_id: string;
  op: OpTypeJSON;
  subkey?: string;
}
export type OpTypeJSON = 'CLEAR' | 'MOVE' | 'PUT' | 'REMOVE';

/**
 * 64-bit unsigned integer stored as a string in base-10.
 *
 * Not sortable as a string.
 */
export type OpId = string;

export interface BucketChecksum {
  bucket: string;
  priority?: number;
  /**
   * 32-bit unsigned hash.
   */
  checksum: number;

  /**
   * Count of operations - informational only.
   */
  count?: number;
  /**
   * The JavaScript client does not use this field, which is why it's defined to be `any`. We rely on the structure of
   * this interface to pass custom `BucketChecksum`s to the Rust client in unit tests, which so all fields need to be
   * present.
   */
  subscriptions?: any;
}

export interface Checkpoint {
  last_op_id: OpId;
  buckets: BucketChecksum[];
  write_checkpoint?: string;
  streams?: any[];
}

export interface StreamingSyncCheckpoint {
  checkpoint: Checkpoint;
}

export interface StreamingSyncCheckpointDiff {
  checkpoint_diff: {
    last_op_id: OpId;
    updated_buckets: BucketChecksum[];
    removed_buckets: string[];
    write_checkpoint?: string;
  };
}

export interface StreamingSyncDataJSON {
  data: SyncDataBucketJSON;
}

export interface StreamingSyncCheckpointComplete {
  checkpoint_complete: {
    last_op_id: OpId;
  };
}

export interface StreamingSyncCheckpointPartiallyComplete {
  partial_checkpoint_complete: {
    priority: number;
    last_op_id: OpId;
  };
}

export interface StreamingSyncKeepalive {
  /** If specified, token expires in this many seconds. */
  token_expires_in: number;
}

export type StreamingSyncLine =
  | StreamingSyncDataJSON
  | StreamingSyncCheckpoint
  | StreamingSyncCheckpointDiff
  | StreamingSyncCheckpointComplete
  | StreamingSyncCheckpointPartiallyComplete
  | StreamingSyncKeepalive;
