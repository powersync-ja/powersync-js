import { BaseListener, BaseObserver, Disposable } from '../../../utils/BaseObserver.js';
import { CrudBatch } from './CrudBatch.js';
import { CrudEntry, OpId } from './CrudEntry.js';
import { SyncDataBatch } from './SyncDataBatch.js';

export interface BucketDescription {
  name: string;
  priority: number;
}

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

export type SavedProgress = {
  atLast: number;
  sinceLast: number;
};

export type BucketOperationProgress = Record<string, SavedProgress>;

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
}

export enum PSInternalTable {
  DATA = 'ps_data',
  CRUD = 'ps_crud',
  BUCKETS = 'ps_buckets',
  OPLOG = 'ps_oplog',
  UNTYPED = 'ps_untyped'
}

export enum PowerSyncControlCommand {
  PROCESS_TEXT_LINE = 'line_text',
  PROCESS_BSON_LINE = 'line_binary',
  STOP = 'stop',
  START = 'start',
  NOTIFY_TOKEN_REFRESHED = 'refreshed_token',
  NOTIFY_CRUD_UPLOAD_COMPLETED = 'completed_upload'
}

export interface BucketStorageListener extends BaseListener {
  crudUpdate: () => void;
}

export interface BucketStorageAdapter extends BaseObserver<BucketStorageListener>, Disposable {
  init(): Promise<void>;
  saveSyncData(batch: SyncDataBatch, fixedKeyFormat?: boolean): Promise<void>;
  removeBuckets(buckets: string[]): Promise<void>;
  setTargetCheckpoint(checkpoint: Checkpoint): Promise<void>;

  startSession(): void;

  getBucketStates(): Promise<BucketState[]>;
  getBucketOperationProgress(): Promise<BucketOperationProgress>;
  hasMigratedSubkeys(): Promise<boolean>;
  migrateToFixedSubkeys(): Promise<void>;

  syncLocalDatabase(
    checkpoint: Checkpoint,
    priority?: number
  ): Promise<{ checkpointValid: boolean; ready: boolean; failures?: any[] }>;

  nextCrudItem(): Promise<CrudEntry | undefined>;
  hasCrud(): Promise<boolean>;
  getCrudBatch(limit?: number): Promise<CrudBatch | null>;

  hasCompletedSync(): Promise<boolean>;
  updateLocalTarget(cb: () => Promise<string>): Promise<boolean>;
  getMaxOpId(): string;

  /**
   * Get an unique client id.
   */
  getClientId(): Promise<string>;

  /**
   * Invokes the `powersync_control` function for the sync client.
   */
  control(op: PowerSyncControlCommand, payload: string | Uint8Array | null): Promise<string>;
}
