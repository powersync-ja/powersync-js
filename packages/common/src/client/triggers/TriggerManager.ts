import { LockContext } from '../../db/DBAdapter.js';

/**
 * SQLite operations to track changes for with {@link TriggerManager}
 * @experimental
 */
export enum DiffTriggerOperation {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

/**
 * @experimental
 * Diffs created by {@link TriggerManager#createDiffTrigger} are stored in a temporary table.
 * This is the base record structure for all diff records.
 *
 * @template TOperationId - The type for `operation_id`. Defaults to `number` as returned by default SQLite database queries.
 * Use `string` for full 64-bit precision when using `{ castOperationIdAsText: true }` option.
 */
export interface BaseTriggerDiffRecord<TOperationId extends string | number = number> {
  /**
   * The modified row's `id` column value.
   */
  id: string;
  /**
   * The operation performed which created this record.
   */
  operation: DiffTriggerOperation;
  /**
   * Auto-incrementing primary key for the operation.
   * Defaults to number as returned by database queries (wa-sqlite returns lower 32 bits).
   * Can be string for full 64-bit precision when using `{ castOperationIdAsText: true }` option.
   */
  operation_id: TOperationId;

  /**
   * Time the change operation was recorded.
   * This is in ISO 8601 format, e.g. `2023-10-01T12:00:00.000Z`.
   */
  timestamp: string;
}

/**
 * @experimental
 * Represents a diff record for a SQLite UPDATE operation.
 * This record contains the new value and optionally the previous value.
 * Values are stored as JSON strings.
 */
export interface TriggerDiffUpdateRecord<
  TOperationId extends string | number = number
> extends BaseTriggerDiffRecord<TOperationId> {
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
 * @experimental
 * Represents a diff record for a SQLite INSERT operation.
 * This record contains the new value represented as a JSON string.
 */
export interface TriggerDiffInsertRecord<
  TOperationId extends string | number = number
> extends BaseTriggerDiffRecord<TOperationId> {
  operation: DiffTriggerOperation.INSERT;
  /**
   * The value of the row, at the time of INSERT, in JSON string format.
   */
  value: string;
}

/**
 * @experimental
 * Represents a diff record for a SQLite DELETE operation.
 * This record contains the new value represented as a JSON string.
 */
export interface TriggerDiffDeleteRecord<
  TOperationId extends string | number = number
> extends BaseTriggerDiffRecord<TOperationId> {
  operation: DiffTriggerOperation.DELETE;
  /**
   * The value of the row, before the DELETE operation, in JSON string format.
   */
  value: string;
}

/**
 * @experimental
 * Diffs created by {@link TriggerManager#createDiffTrigger} are stored in a temporary table.
 * This is the record structure for all diff records.
 *
 * Querying the DIFF table directly with {@link TriggerDiffHandlerContext#withDiff} will return records
 * with the structure of this type.
 *
 * @template TOperationId - The type for `operation_id`. Defaults to `number` as returned by database queries.
 * Use `string` for full 64-bit precision when using `{ castOperationIdAsText: true }` option.
 *
 * @example
 * ```typescript
 * // Default: operation_id is number
 * const diffs = await context.withDiff<TriggerDiffRecord>('SELECT * FROM DIFF');
 *
 * // With string operation_id for full precision
 * const diffsWithString = await context.withDiff<TriggerDiffRecord<string>>(
 *   'SELECT * FROM DIFF',
 *   undefined,
 *   { castOperationIdAsText: true }
 * );
 * ```
 */
export type TriggerDiffRecord<TOperationId extends string | number = number> =
  | TriggerDiffUpdateRecord<TOperationId>
  | TriggerDiffInsertRecord<TOperationId>
  | TriggerDiffDeleteRecord<TOperationId>;

/**
 * @experimental
 * Querying the DIFF table directly with {@link TriggerDiffHandlerContext#withExtractedDiff} will return records
 * with the tracked columns extracted from the JSON value.
 * This type represents the structure of such records.
 *
 * @template T - The type for the extracted columns from the tracked JSON value.
 * @template TOperationId - The type for `operation_id`. Defaults to `number` as returned by database queries.
 * Use `string` for full 64-bit precision when using `{ castOperationIdAsText: true }` option.
 *
 * @example
 * ```typescript
 * // Default: operation_id is number
 * const diffs = await context.withExtractedDiff<ExtractedTriggerDiffRecord<{id: string, name: string}>>('SELECT * FROM DIFF');
 *
 * // With string operation_id for full precision
 * const diffsWithString = await context.withExtractedDiff<ExtractedTriggerDiffRecord<{id: string, name: string}, string>>(
 *   'SELECT * FROM DIFF',
 *   undefined,
 *   { castOperationIdAsText: true }
 * );
 * ```
 */
export type ExtractedTriggerDiffRecord<T, TOperationId extends string | number = number> = T & {
  [K in keyof Omit<BaseTriggerDiffRecord<TOperationId>, 'id'> as `__${string & K}`]: TriggerDiffRecord<TOperationId>[K];
} & {
  __previous_value?: string;
};

/**
 * @experimental
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
   * Columns to track and report changes for.
   * Defaults to all columns in the source table.
   * Use an empty array to track only the ID and operation.
   */
  columns?: string[];

  /**
   * Condition to filter when the triggers should fire.
   * This corresponds to a SQLite [WHEN](https://sqlite.org/lang_createtrigger.html) clause in the trigger body.
   * This is useful for only triggering on specific conditions.
   * For example, you can use it to only trigger on certain values in the NEW row.
   * Note that for PowerSync the row data is stored in a JSON column named `data`.
   * The row id is available in the `id` column.
   *
   * NB! The WHEN clauses here are added directly to the SQLite trigger creation SQL.
   * Any user input strings here should be sanitized externally. The {@link when} string template function performs
   * some basic sanitization, extra external sanitization is recommended.
   *
   * @example
   * {
   *  'INSERT': sanitizeSQL`json_extract(NEW.data, '$.list_id') = ${sanitizeUUID(list.id)}`,
   *  'INSERT': `TRUE`,
   *  'UPDATE': sanitizeSQL`NEW.id = 'abcd' AND json_extract(NEW.data, '$.status') = 'active'`,
   *  'DELETE': sanitizeSQL`json_extract(OLD.data, '$.list_id') = 'abcd'`
   * }
   */
  when: Partial<Record<DiffTriggerOperation, string>>;

  /**
   * Hooks which allow execution during the trigger creation process.
   */
  hooks?: TriggerCreationHooks;

  /**
   * Use storage-backed (non-TEMP) tables and triggers that persist across sessions.
   * These resources are still automatically disposed when no longer claimed.
   */
  useStorage?: boolean;
}

/**
 * @experimental
 * Options for {@link TriggerManager#createDiffTrigger}.
 */
export interface CreateDiffTriggerOptions extends BaseCreateDiffTriggerOptions {
  /**
   * Destination table to send changes to.
   * This table is created internally as a SQLite temporary table.
   * This table will be dropped once the trigger is removed.
   */
  destination: string;
}

/**
 * @experimental
 * Callback to drop a trigger after it has been created.
 */
export type TriggerRemoveCallback = () => Promise<void>;

/**
 * @experimental
 * Options for {@link TriggerDiffHandlerContext#withDiff}.
 */
export interface WithDiffOptions {
  /**
   * If true, casts `operation_id` as TEXT in the internal CTE to preserve full 64-bit precision.
   * Use this when you need to ensure `operation_id` is treated as a string to avoid precision loss
   * for values exceeding JavaScript's Number.MAX_SAFE_INTEGER.
   *
   * When enabled, use {@link TriggerDiffRecord}<string> to type the result correctly.
   */
  castOperationIdAsText?: boolean;
}

/**
 * @experimental
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
   *       operation_id INTEGER PRIMARY KEY AUTOINCREMENT,
   *       id TEXT,
   *       operation TEXT,
   *       timestamp TEXT,
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
   *
   * @example
   * ```typescript
   * // With operation_id cast as TEXT for full precision
   * const diffs = await context.withDiff<TriggerDiffRecord<string>>(
   *   'SELECT * FROM DIFF',
   *   undefined,
   *   { castOperationIdAsText: true }
   * );
   * // diffs[0].operation_id is now typed as string
   * ```
   */
  withDiff: <T = any>(query: string, params?: ReadonlyArray<Readonly<any>>, options?: WithDiffOptions) => Promise<T[]>;

  /**
   * Allows querying the database with access to the table containing diff records.
   * The diff table is accessible via the `DIFF` accessor.
   *
   * This is similar to {@link withDiff} but extracts the row columns from the tracked JSON value. The diff operation
   * data is aliased as `__` columns to avoid column conflicts.
   *
   * For {@link DiffTriggerOperation#DELETE} operations the previous_value columns are extracted for convenience.
   *
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
 * @experimental
 * Options for tracking changes to a table with {@link TriggerManager#trackTableDiff}.
 */
export interface TrackDiffOptions extends BaseCreateDiffTriggerOptions {
  /**
   * Handler for processing diff operations.
   * Automatically invoked once diff items are present.
   * Diff items are automatically cleared after the handler is invoked.
   */
  onChange: (context: TriggerDiffHandlerContext) => Promise<void>;

  /**
   * The minimum interval, in milliseconds, between {@link onChange} invocations.
   *  @default {@link DEFAULT_WATCH_THROTTLE_MS}
   */
  throttleMs?: number;
}

/**
 * @experimental
 */
export interface TriggerManager {
  /**
   * @experimental
   * Creates a temporary trigger which tracks changes to a source table
   * and writes changes to a destination table.
   * The temporary destination table is created internally and will be dropped when the trigger is removed.
   * The temporary destination table is created with the structure:
   *
   * ```sql
   * CREATE TEMP TABLE ${destination} (
   *       operation_id INTEGER PRIMARY KEY AUTOINCREMENT,
   *       id TEXT,
   *       operation TEXT,
   *       timestamp TEXT,
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
   *   when: {
   *    [DiffTriggerOperation.INSERT]: 'TRUE',
   *    [DiffTriggerOperation.UPDATE]: 'TRUE',
   *    [DiffTriggerOperation.DELETE]: 'TRUE'
   *   }
   * });
   * ```
   */
  createDiffTrigger(options: CreateDiffTriggerOptions): Promise<TriggerRemoveCallback>;

  /**
   * @experimental
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
   *          [DiffTriggerOperation.INSERT]: sanitizeSQL`json_extract(NEW.data, '$.list_id') = ${sanitizeUUID(someIdVariable)}`
   *        },
   *        onChange: async (context) => {
   *          // Fetches the todo records that were inserted during this diff
   *          const newTodos = await context.withDiff<Database['todos']>(`
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

/**
 * @experimental
 * @internal
 * Manages claims on persisted SQLite triggers and destination tables to enable proper cleanup
 * when they are no longer actively in use.
 *
 * When using persisted triggers (especially for OPFS multi-tab scenarios), we need a reliable way to determine which resources are still actively in use across different connections/tabs so stale resources can be safely cleaned up without interfering with active triggers.
 *
 * A cleanup process runs
 * on database creation (and every 2 minutes) that:
 * 1. Queries for existing managed persisted resources
 * 2. Checks with the claim manager if any consumer is actively using those resources
 * 3. Deletes unused resources
 */

export interface TriggerClaimManager {
  /**
   * Obtains or marks a claim on a certain identifier.
   * @returns a callback to release the claim.
   */
  obtainClaim: (identifier: string) => Promise<() => Promise<void>>;
  /**
   * Checks if a claim is present for an identifier.
   */
  checkClaim: (identifier: string) => Promise<boolean>;
}

/**
 * @experimental
 * @internal
 */
export interface TriggerManagerConfig {
  claimManager: TriggerClaimManager;
}
