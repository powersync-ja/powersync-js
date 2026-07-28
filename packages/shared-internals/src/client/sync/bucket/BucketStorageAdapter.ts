import {
  BaseListener,
  BaseObserverInterface,
  Disposable,
  CrudBatch,
  CrudEntry,
  Transaction,
  SqliteValue
} from '@powersync/common';
import { MAX_OP_ID } from '../../../constants.js';

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
  UPDATE_SUBSCRIPTIONS = 'update_subscriptions',
  /**
   * An `established` or `end` event for response streams.
   */
  CONNECTION_STATE = 'connection'
}

export interface BucketStorageListener extends BaseListener {
  crudUpdate: () => void;
}

export interface BucketStorageAdapter extends BaseObserverInterface<BucketStorageListener>, Disposable {
  hasMigratedSubkeys(): Promise<boolean>;
  migrateToFixedSubkeys(): Promise<void>;

  nextCrudItem(): Promise<CrudEntry | undefined>;
  hasCrud(): Promise<boolean>;
  getCrudBatch(limit?: number): Promise<CrudBatch | null>;

  updateLocalTarget(cb: () => Promise<string>): Promise<boolean>;
  handleCrudCheckpoint(lastClientId: number, writeCheckpoint?: string): Promise<void>;

  /**
   * Get an unique client id.
   */
  getClientId(): Promise<string>;

  /**
   * Invokes the `powersync_control` function for the sync client.
   */
  control(op: PowerSyncControlCommand, payload: string | Uint8Array | null): Promise<string>;
}

/**
 * Invokes `powersync_control` from the core extension, casting the result to text.
 */
export async function rawPowerSyncControl(tx: Transaction, op: string, payload: SqliteValue): Promise<string | null> {
  const { rawRows } = await tx.executeRaw('SELECT CAST(powersync_control(?, ?) AS TEXT)', [op, payload]);
  return rawRows[0][0] as string | null;
}

/**
 * Reads the current target checkpoint request id, or updates it when the update parameter is set.
 *
 * After requesting a checkpoint, the service needs to include that checkpoint id (or a subsequent one) in a
 * `checkpoint_complete` message before we apply any subsequent sync lines. This guards against uploaded changes that
 * have not yet been synced to flicker if we apply an intermediate checkpoint.
 *
 * @param update An optional value to update the stored target checkpoint request. {@link MAX_OP_ID} can be used as a
 * sentinel for pending changes that have been uploaded, but for which no checkpoint request has been created yet.
 * @returns The previous checkpoint request.
 */
export function targetCheckpointRequestId(tx: Transaction, update: string | null = null): Promise<string | null> {
  return rawPowerSyncControl(tx, 'target_checkpoint_request_id', update);
}
