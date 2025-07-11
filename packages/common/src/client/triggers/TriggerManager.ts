import { LockContext } from 'src/db/DBAdapter.js';

export enum DiffTriggerOperation {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

export interface BaseTriggerDiffRecord {
  id: string;
  operation: DiffTriggerOperation;
  /**
   * Time the change operation was recorded.
   * This is in ISO 8601 format, e.g. `2023-10-01T12:00:00.000Z`.
   */
  timestamp: string;
}

export interface TriggerDiffUpdateRecord extends BaseTriggerDiffRecord {
  operation: DiffTriggerOperation.UPDATE;
  change: string;
}

export interface TriggerDiffInsertRecord extends BaseTriggerDiffRecord {
  operation: DiffTriggerOperation.INSERT;
  change: string;
}

export interface TriggerDiffDeleteRecord extends BaseTriggerDiffRecord {
  operation: DiffTriggerOperation.DELETE;
}

export type TriggerDiffRecord = TriggerDiffUpdateRecord | TriggerDiffInsertRecord | TriggerDiffDeleteRecord;

export interface TriggerCreationHooks {
  /**
   * Executed inside the write lock before the trigger is created.
   */
  beforeCreate?: (context: LockContext) => Promise<void>;
}

export interface CreateDiffTriggerOptions {
  /**
   * Source table to trigger and track changes from.
   */
  source: string;

  /**
   * Operations to track changes for.
   */
  operations: DiffTriggerOperation[];

  /**
   * Destination table to track changes to.
   * This table is created internally.
   */
  destination: string;

  /**
   * Columns to track and report changes for.
   * Defaults to all columns in the source table.
   */
  columns?: string[];

  /**
   * Optional condition to filter when the trigger should fire.
   * This is useful for only triggering on specific conditions.
   * For example, you can use it to only trigger on certain values in the NEW row.
   * Note that for PowerSync the data is stored in a JSON column named `data`.
   * @example
   * [`NEW.data.status = 'active' AND length(NEW.data.name) > 3`]
   */
  when?: string;

  /**
   * Optional context to create the triggers in.
   * This can be useful to synchronize the current state and fetch all changes after the current state.
   */
  hooks?: TriggerCreationHooks;
}

export type TriggerRemoveCallback = () => Promise<void>;

export interface TriggerDiffHandlerContext {
  getAll: <T = any>(query: string, params?: any[]) => Promise<T[]>;
}

export interface TrackDiffOptions {
  source: string;
  filter?: string;
  columns?: string[];
  operations: DiffTriggerOperation[];
  onChange: (context: TriggerDiffHandlerContext) => Promise<void>;
  hooks?: TriggerCreationHooks;
}

export interface TriggerManager {
  /**
   * Creates a temporary trigger which tracks changes to a source table
   * and writes changes to a destination table.
   * The temporary destination table is created internally and will be dropped when the trigger is removed.
   * @returns A callback to remove the trigger and drop the destination table.
   */
  createDiffTrigger(options: CreateDiffTriggerOptions): Promise<TriggerRemoveCallback>;

  /**
   * Tracks changes for a table. Triggering a provided handler on changes.
   * Uses {@link createDiffTrigger} internally to create a temporary destination table.
   * @returns A callback to cleanup the trigger and stop tracking changes.
   */
  trackTableDiff(options: TrackDiffOptions): Promise<TriggerRemoveCallback>;
}
