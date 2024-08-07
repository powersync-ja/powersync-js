import { BaseListener, BaseObserver, Disposable } from '../../../utils/BaseObserver';
import { CrudBatch } from './CrudBatch';
import { CrudEntry, OpId } from './CrudEntry';
import { SyncDataBatch } from './SyncDataBatch';

export interface Checkpoint {
  last_op_id: OpId;
  buckets: BucketChecksum[];
  write_checkpoint?: string;
}

export interface BucketState {
  bucket: string;
  op_id: string;
}

export interface ChecksumCache {
  checksums: Map<string, { checksum: BucketChecksum; last_op_id: OpId }>;
  lastOpId: OpId;
}

export interface SyncLocalDatabaseResult {
  ready: boolean;
  checkpointValid: boolean;
  checkpointFailures?: string[];
}

export interface BucketChecksum {
  bucket: string;
  /**
   * 32-bit unsigned hash.
   */
  checksum: number;

  /**
   * Count of operations - informational only.
   */
  count?: number;
}

export enum PSInternalTable {
  DATA = 'ps_data',
  CRUD = 'ps_crud',
  BUCKETS = 'ps_buckets',
  OPLOG = 'ps_oplog',
  UNTYPED = 'ps_untyped'
}

export interface BucketStorageListener extends BaseListener {
  crudUpdate: () => void;
}

export interface BucketStorageAdapter extends BaseObserver<BucketStorageListener>, Disposable {
  init(): Promise<void>;
  saveSyncData(batch: SyncDataBatch): Promise<void>;
  removeBuckets(buckets: string[]): Promise<void>;
  setTargetCheckpoint(checkpoint: Checkpoint): Promise<void>;

  startSession(): void;

  getBucketStates(): Promise<BucketState[]>;

  syncLocalDatabase(checkpoint: Checkpoint): Promise<{ checkpointValid: boolean; ready: boolean; failures?: any[] }>;

  nextCrudItem(): Promise<CrudEntry | undefined>;
  hasCrud(): Promise<boolean>;
  getCrudBatch(limit?: number): Promise<CrudBatch | null>;

  hasCompletedSync(): Promise<boolean>;
  updateLocalTarget(cb: () => Promise<string>): Promise<boolean>;
  /**
   * Exposed for tests only.
   */
  autoCompact(): Promise<void>;

  /**
   * Exposed for tests only.
   */
  forceCompact(): Promise<void>;

  getMaxOpId(): string;
}
