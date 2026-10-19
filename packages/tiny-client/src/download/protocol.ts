export interface StreamingSyncRequest {
  buckets: BucketRequest[];
  include_checksum: false;
  raw_data: true;
  client_id: string;
  parameters: Record<string, unknown>;
  streams: StreamSubscriptionRequest;
  app_metadata: Record<string, string> | undefined;
}

export interface BucketRequest {
  name: string;
  after: string;
}

export interface StreamSubscriptionRequest {
  include_defaults: boolean;
  subscriptions: RequestedStreamSubscription[];
}

export interface RequestedStreamSubscription {
  stream: string;
  parameters: Record<string, unknown> | undefined;
  override_priority: number | null;
}

export interface SyncDataBucket {
  bucket: string;
  data: RawOplogEntry[];
}

export interface RawOplogEntry {
  checksum: number;
  data?: string;
  object_id?: string;
  object_type?: string;
  op_id: string;
  op: OpType;
  subkey?: string;
}

export type OpType = 'CLEAR' | 'MOVE' | 'PUT' | 'REMOVE';

/**
 * 64-bit unsigned integer stored as a string in base-10.
 *
 * Not sortable as a string.
 */
export type RawOpId = string;

export interface BucketChecksum {
  bucket: string;
  priority: number;
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
  last_op_id: RawOpId;
  buckets: BucketChecksum[];
  write_checkpoint: string | null | undefined;
  streams?: any[];
}

export interface StreamingSyncCheckpoint {
  checkpoint: Checkpoint;
}

export interface StreamingSyncCheckpointDiff {
  checkpoint_diff: {
    last_op_id: RawOpId;
    updated_buckets: BucketChecksum[];
    removed_buckets: string[];
    write_checkpoint: string | null | undefined;
  };
}

export interface StreamingSyncData {
  data: SyncDataBucket;
}

export interface StreamingSyncCheckpointComplete {
  checkpoint_complete: {
    last_op_id: RawOpId;
  };
}

export interface StreamingSyncCheckpointPartiallyComplete {
  partial_checkpoint_complete: {
    priority: number;
    last_op_id: RawOpId;
  };
}

export interface StreamingSyncKeepalive {
  /** If specified, token expires in this many seconds. */
  token_expires_in: number;
}

export type BucketLine =
  | StreamingSyncData
  | StreamingSyncCheckpoint
  | StreamingSyncCheckpointDiff
  | StreamingSyncCheckpointComplete
  | StreamingSyncCheckpointPartiallyComplete;

export type StreamingSyncLine = BucketLine | StreamingSyncKeepalive;
