import { LockContext } from 'src/db/DBAdapter.js';

/**
 * SQLite operations to track changes for with {@link TriggerManager}
 */
export enum DiffTriggerOperation {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

/**
 * Diffs created by {@link TriggerManager#createDiffTrigger} are stored in a temporary table.
 * This is the base record structure for all diff records.
 */
export interface BaseTriggerDiffRecord {
  id: string;
  operation: DiffTriggerOperation;
  /**
   * Time the change operation was recorded.
   * This is in ISO 8601 format, e.g. `2023-10-01T12:00:00.000Z`.
   */
  timestamp: string;
}

/**
 * Represents a diff record for a SQLite UPDATE operation.
 * This record contains the new value and optionally the previous value.
 * Values are stored as JSON strings.
 */
export interface TriggerDiffUpdateRecord extends BaseTriggerDiffRecord {
  operation: DiffTriggerOperation.UPDATE;
  value: string;
  previous_value?: string;
}

/**
 * Represents a diff record for a SQLite INSERT operation.
 * This record contains the new value represented as a JSON string.
 */
export interface TriggerDiffInsertRecord extends BaseTriggerDiffRecord {
  operation: DiffTriggerOperation.INSERT;
  value: string;
}

/**
 * Represents a diff record for a SQLite DELETE operation.
 * This record contains the new value represented as a JSON string.
 */
export interface TriggerDiffDeleteRecord extends BaseTriggerDiffRecord {
  operation: DiffTriggerOperation.DELETE;
}

/**
 * Diffs created by {@link TriggerManager#createDiffTrigger} are stored in a temporary table.
 * This is the record structure for all diff records.
 */
export type TriggerDiffRecord = TriggerDiffUpdateRecord | TriggerDiffInsertRecord | TriggerDiffDeleteRecord;

/**
 * Hooks used in the creation of a table diff trigger.
 */
export interface TriggerCreationHooks {
  /**
   * Executed inside a write lock before the trigger is created.
   */
  beforeCreate?: (context: LockContext) => Promise<void>;
}

/**
 * Common interface for options used in creating a diff trigger.
 */

interface BaseCreateDiffTriggerOptions {
  /**
   * Source table/view to trigger and track changes from.
   * This should be present in the PowerSync database's schema.
   */
  source: string;

  /**
   * Operations to track changes for.
   */
  operations: DiffTriggerOperation[];

  /**
   * Columns to track and report changes for.
   * Defaults to all columns in the source table.
   * Use an empty array to track only the ID and operation.
   */
  columns?: string[];

  /**
   * Optional condition to filter when the triggers should fire.
   * This is useful for only triggering on specific conditions.
   * For example, you can use it to only trigger on certain values in the NEW row.
   * Note that for PowerSync the data is stored in a JSON column named `data`.
   * @example
   * {
   *  'INSERT': `json_extract(NEW.data, '$.list_id') = 'abcd'`
   *  'UPDATE': `NEW.id = 'abcd' AND json_extract(NEW.data, '$.status') = 'active'`
   *  'DELETE': `json_extract(OLD.data, '$.list_id') = 'abcd'`
   * }
   */
  when?: Partial<Record<DiffTriggerOperation, string>>;

  /**
   * Optional context to create the triggers in.
   * This can be useful to synchronize the current state and fetch all changes after the current state.
   */
  hooks?: TriggerCreationHooks;
}

/**
 * Options for {@link TriggerManager#createDiffTrigger}.
 */
export interface CreateDiffTriggerOptions extends BaseCreateDiffTriggerOptions {
  /**
   * Destination table to track changes to.
   * This table is created internally.
   */
  destination: string;
}

export type TriggerRemoveCallback = () => Promise<void>;

/**
 * Context for the onChange handler provided to {@link TriggerManager#trackTableDiff}.
 */
export interface TriggerDiffHandlerContext extends LockContext {
  /**
   * The name of the temporary destination table created by the trigger.
   */
  destination_table: string;

  /**
   * Allows querying the database with access to the table containing diff records.
   * The diff table is accessible via the `DIFF` accessor.
   *
   * The `DIFF` table is of the form described in {@link TriggerManager#createDiffTrigger}
   * ```sql
   * CREATE TEMP DIFF (
   *       id TEXT,
   *       operation TEXT,
   *       timestamp TEXT
   *       value TEXT,
   *       previous_value TEXT
   *     );
   * ```
   *
   * @example
   * ```sql
   * SELECT
   *  todos.*
   * FROM
   *    DIFF
   * JOIN todos ON DIFF.id = todos.id
   * WHERE json_extract(DIFF.value, '$.status') = 'active'
   * ```
   */
  withDiff: <T = any>(query: string, params?: any[]) => Promise<T[]>;

  /**
   * Allows querying the database with access to the table containing diff records.
   * The diff table is accessible via the `DIFF` accessor.
   *
   * This is similar to {@link withDiff} but extracts the columns from the JSON value.
   * The `DIFF` table exposes the tracked table columns directly as columns. The diff meta data is available as _columns.
   *
   * ```sql
   * CREATE TEMP TABLE DIFF (
   *       id TEXT,
   *       replicated_column_1 COLUMN_TYPE,
   *       replicated_column_2 COLUMN_TYPE,
   *       __operation TEXT,
   *       __timestamp TEXT,
   *       __previous_value TEXT
   *     );
   * ```
   *
   * @example
   * ```sql
   * SELECT
   *  todos.*
   * FROM
   *    DIFF
   *  JOIN todos ON DIFF.id = todos.id
   * --- The todo column names are extracted from json and are available as DIFF.name
   * WHERE DIFF.name = 'example'
   * ```
   */
  withExtractedDiff: <T = any>(query: string, params?: any[]) => Promise<T[]>;
}

/**
 * Options for tracking changes to a table with {@link TriggerManager#trackTableDiff}.
 */
export interface TrackDiffOptions extends BaseCreateDiffTriggerOptions {
  /**
   * Handler for processing diff operations.
   * Automatically invoked once diff items are present.
   * Diff items are automatically cleared after the handler is invoked.
   */
  onChange: (context: TriggerDiffHandlerContext) => Promise<void>;
}

export interface TriggerManager {
  /**
   * Creates a temporary trigger which tracks changes to a source table
   * and writes changes to a destination table.
   * The temporary destination table is created internally and will be dropped when the trigger is removed.
   * The temporary destination table is created with the structure:
   * ```sql
   * CREATE TEMP TABLE ${destination} (
   *       id TEXT,
   *       operation TEXT,
   *       timestamp TEXT
   *       value TEXT,
   *       previous_value TEXT
   *     );
   * ```
   * The `value` column contains the JSON representation of the change. This column is NULL for
   * {@link DiffTriggerOperation#DELETE} operations.
   * For {@link DiffTriggerOperation#UPDATE} operations the `previous_value` column contains the previous value of the changed row
   * in a JSON format.
   *
   * @returns A callback to remove the trigger and drop the destination table.
   */
  createDiffTrigger(options: CreateDiffTriggerOptions): Promise<TriggerRemoveCallback>;

  /**
   * Tracks changes for a table. Triggering a provided handler on changes.
   * Uses {@link createDiffTrigger} internally to create a temporary destination table.
   * @returns A callback to cleanup the trigger and stop tracking changes.
   *
   * @example
   * ```javascript
   *  database.triggers.trackTableDiff({
   *        source: 'ps_data__todos',
   *        columns: ['list_id'],
   *        filter: "json_extract(NEW.data, '$.list_id') = '123'",
   *        operations: [DiffTriggerOperation.INSERT],
   *        onChange: async (context) => {
   *          // Fetches the todo records that were inserted during this diff
   *          const newTodos = await context.getAll<Database['todos']>("
   *            SELECT
   *              todos.*
   *            FROM
   *              DIFF
   *              JOIN todos ON DIFF.id = todos.id
   *          ");
   *          todos.push(...newTodos);
   *        },
   *        hooks: {
   *          beforeCreate: async (lockContext) => {
   *            // This hook is executed inside the write lock before the trigger is created.
   *            // It can be used to synchronize the current state and fetch all changes after the current state.
   *            // Read the current state of the todos table
   *            const currentTodos = await lockContext.getAll<Database['todos']>(
   *              "
   *                SELECT
   *                  *
   *                FROM
   *                  todos
   *                WHERE
   *                  list_id = ?
   *              ",
   *              ['123']
   *            );
   *
   *            // Example code could process the current todos if necessary
   *            todos.push(...currentTodos);
   *          }
   *        }
   *      });
   * ```
   */
  trackTableDiff(options: TrackDiffOptions): Promise<TriggerRemoveCallback>;
}
