export enum DiffTriggerOperation {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

export type TriggerResultUpdate = {
  operation: 'UPDATE';
  id: string;
  change: string;
};

export type TriggerResultInsert = {
  operation: 'INSERT';
  id: string;
  change: string;
};

export type TriggerResultDelete = {
  id: string;
  operation: 'DELETE';
};

export type TriggerDiffResult = TriggerResultUpdate | TriggerResultInsert | TriggerResultDelete;

export type CreateDiffTriggerOptions = {
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
   * @example `NEW.data.status = 'active' AND length(NEW.data.name) > 3`
   */
  when?: string;
};

export type TriggerRemoveCallback = () => Promise<void>;

export interface TriggerManager {
  /**
   * Creates a temporary trigger which tracks changes to a source table
   * and writes changes to a destination table.
   * The temporary destination table is created internally and will be dropped when the trigger is removed.
   * @returns A callback to remove the trigger and drop the destination table.
   */
  createDiffTrigger(options: CreateDiffTriggerOptions): Promise<TriggerRemoveCallback>;
}
