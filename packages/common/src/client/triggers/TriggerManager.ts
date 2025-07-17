import { LockContext } from '../../db/DBAdapter.js';

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
  /**
   * The modified row's `id` column value.
   */
  id: string;
  /**
   * The operation performed which created this record.
   */
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
  /**
   * The updated state of the row in JSON string format.
   */
  value: string;
  /**
   * The previous value of the row in JSON string format.
   */
  previous_value: string;
}

/**
 * Represents a diff record for a SQLite INSERT operation.
 * This record contains the new value represented as a JSON string.
 */
export interface TriggerDiffInsertRecord extends BaseTriggerDiffRecord {
  operation: DiffTriggerOperation.INSERT;
  /**
   * The value of the row, at the time of INSERT, in JSON string format.
   */
  value: string;
}

/**
 * Represents a diff record for a SQLite DELETE operation.
 * This record contains the new value represented as a JSON string.
 */
export interface TriggerDiffDeleteRecord extends BaseTriggerDiffRecord {
  operation: DiffTriggerOperation.DELETE;
  /**
   * The value of the row, before the DELETE operation, in JSON string format.
   */
  value: string;
}

/**
 * Diffs created by {@link TriggerManager#createDiffTrigger} are stored in a temporary table.
 * This is the record structure for all diff records.
 *
 * Querying the DIFF table directly with {@link TriggerDiffHandlerContext#withDiff} will return records
 * with the structure of this type.
 * @example
 * ```typescript
 * const diffs = await context.withDiff<TriggerDiffRecord>('SELECT * FROM DIFF');
 * diff.forEach(diff => console.log(diff.operation, diff.timestamp, JSON.parse(diff.value)))
 * ```
 */
export type TriggerDiffRecord = TriggerDiffUpdateRecord | TriggerDiffInsertRecord | TriggerDiffDeleteRecord;

/**
 * Querying the DIFF table directly with {@link TriggerDiffHandlerContext#withExtractedDiff} will return records
 * with the tracked columns extracted from the JSON value.
 * This type represents the structure of such records.
 * @example
 * ```typescript
 * const diffs = await context.withExtractedDiff<ExtractedTriggerDiffRecord<{id: string, name: string}>>('SELECT * FROM DIFF');
 * diff.forEach(diff => console.log(diff.__operation, diff.__timestamp, diff.columnName))
 * ```
 */
export type ExtractedTriggerDiffRecord<T> = T & {
  [K in keyof Omit<BaseTriggerDiffRecord, 'id'> as `__${string & K}`]: TriggerDiffRecord[K];
} & {
  __previous_value?: string;
};

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
   * PowerSync source table/view to trigger and track changes from.
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
   * This corresponds to a SQLite [WHEN](https://sqlite.org/lang_createtrigger.html) clause in the trigger body.
   * This is useful for only triggering on specific conditions.
   * For example, you can use it to only trigger on certain values in the NEW row.
   * Note that for PowerSync the row data is stored in a JSON column named `data`.
   * The row id is available in the `id` column.
   * @example
   * {
   *  'INSERT': `json_extract(NEW.data, '$.list_id') = 'abcd'`
   *  'UPDATE': `NEW.id = 'abcd' AND json_extract(NEW.data, '$.status') = 'active'`
   *  'DELETE': `json_extract(OLD.data, '$.list_id') = 'abcd'`
   * }
   */
  when?: Partial<Record<DiffTriggerOperation, string>>;

  /**
   * Hooks which allow execution during the trigger creation process.
   */
  hooks?: TriggerCreationHooks;
}

/**
 * Options for {@link TriggerManager#createDiffTrigger}.
 */
export interface CreateDiffTriggerOptions extends BaseCreateDiffTriggerOptions {
  /**
   * Destination table to track changes to.
   * This table is created internally as a SQLite temporary table.
   * This table will be dropped once the trigger is removed.
   */
  destination: string;
}

/**
 * Callback to drop a trigger after it has been created.
 */
export type TriggerRemoveCallback = () => Promise<void>;

/**
 * Context for the `onChange` handler provided to {@link TriggerManager#trackTableDiff}.
 */
export interface TriggerDiffHandlerContext extends LockContext {
  /**
   * The name of the temporary destination table created by the trigger.
   */
  destinationTable: string;

  /**
   * Allows querying the database with access to the table containing DIFF records.
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
   * Note that the `value` and `previous_value` columns store the row state in JSON string format.
   * To access the row state in an extracted form see {@link TriggerDiffHandlerContext#withExtractedDiff}.
   *
   * @example
   * ```sql
   * --- This fetches the current state of `todo` rows which have a diff operation present.
   * --- The state of the row at the time of the operation is accessible in the DIFF records.
   * SELECT
   *  todos.*
   * FROM
   *    DIFF
   * JOIN todos ON DIFF.id = todos.id
   * WHERE json_extract(DIFF.value, '$.status') = 'active'
   * ```
   */
  withDiff: <T = any>(query: string, params?: ReadonlyArray<Readonly<any>>) => Promise<T[]>;

  /**
   * Allows querying the database with access to the table containing diff records.
   * The diff table is accessible via the `DIFF` accessor.
   *
   * This is similar to {@link withDiff} but extracts the row columns from the tracked JSON value. The diff operation
   * data is aliased as `__` columns to avoid column conflicts.
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
  withExtractedDiff: <T = any>(query: string, params?: ReadonlyArray<Readonly<any>>) => Promise<T[]>;
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
   *
   * ```sql
   * CREATE TEMP TABLE ${destination} (
   *       id TEXT,
   *       operation TEXT,
   *       timestamp TEXT
   *       value TEXT,
   *       previous_value TEXT
   *     );
   * ```
   * The `value` column contains the JSON representation of the row's value at the change.
   *
   * For {@link DiffTriggerOperation#UPDATE} operations the `previous_value` column contains the previous value of the changed row
   * in a JSON format.
   *
   * NB: The triggers created by this method might be invalidated by {@link AbstractPowerSyncDatabase#updateSchema} calls.
   * These triggers should manually be dropped and recreated when updating the schema.
   *
   * @returns A callback to remove the trigger and drop the destination table.
   *
   * @example
   * ```javascript
   * const dispose = await database.triggers.createDiffTrigger({
   *   source: 'lists',
   *   destination: 'ps_temp_lists_diff',
   *   columns: ['name'],
   *   operations: [DiffTriggerOperation.INSERT, DiffTriggerOperation.UPDATE, DiffTriggerOperation.DELETE]
   * });
   * ```
   */
  createDiffTrigger(options: CreateDiffTriggerOptions): Promise<TriggerRemoveCallback>;

  /**
   * Tracks changes for a table. Triggering a provided handler on changes.
   * Uses {@link createDiffTrigger} internally to create a temporary destination table.
   *
   * @returns A callback to cleanup the trigger and stop tracking changes.
   *
   * NB: The triggers created by this method might be invalidated by {@link AbstractPowerSyncDatabase#updateSchema} calls.
   * These triggers should manually be dropped and recreated when updating the schema.
   *
   * @example
   * ```javascript
   *  const dispose = database.triggers.trackTableDiff({
   *        source: 'todos',
   *        columns: ['list_id'],
   *        when: {
   *          [DiffTriggerOperation.INSERT]: "json_extract(NEW.data, '$.list_id') = '123'"
   *        },
   *        operations: [DiffTriggerOperation.INSERT],
   *        onChange: async (context) => {
   *          // Fetches the todo records that were inserted during this diff
   *          const newTodos = await context.getAll<Database['todos']>(`
   *            SELECT
   *              todos.*
   *            FROM
   *              DIFF
   *              JOIN todos ON DIFF.id = todos.id
   *          `);
   *
   *          // Process newly created todos
   *        },
   *        hooks: {
   *          beforeCreate: async (lockContext) => {
   *            // This hook is executed inside the write lock before the trigger is created.
   *            // It can be used to synchronize the current state of the table with processor logic.
   *            // Any changes after this callback are guaranteed to trigger the `onChange` handler.
   *
   *            // Read the current state of the todos table
   *            const currentTodos = await lockContext.getAll<Database['todos']>(
   *              `
   *                SELECT
   *                  *
   *                FROM
   *                  todos
   *                WHERE
   *                  list_id = ?
   *              `,
   *              ['123']
   *            );
   *
   *            // Process existing todos
   *          }
   *        }
   *      });
   * ```
   */
  trackTableDiff(options: TrackDiffOptions): Promise<TriggerRemoveCallback>;
}
