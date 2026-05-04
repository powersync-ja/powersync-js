import { BaseListener, BaseObserverInterface, Disposable } from '../../../utils/BaseObserver.js';
import { CrudBatch } from './CrudBatch.js';
import { CrudEntry } from './CrudEntry.js';

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
  NOTIFY_CRUD_UPLOAD_COMPLETED = 'completed_upload',
  UPDATE_SUBSCRIPTIONS = 'update_subscriptions'
}

export interface BucketStorageListener extends BaseListener {
  crudUpdate: () => void;
}

export interface BucketStorageAdapter extends BaseObserverInterface<BucketStorageListener>, Disposable {
  init(): Promise<void>;

  hasMigratedSubkeys(): Promise<boolean>;
  migrateToFixedSubkeys(): Promise<void>;

  nextCrudItem(): Promise<CrudEntry | undefined>;
  hasCrud(): Promise<boolean>;
  getCrudBatch(limit?: number): Promise<CrudBatch | null>;

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
