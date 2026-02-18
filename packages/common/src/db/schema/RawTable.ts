import { TableOrRawTableOptions } from './Table.js';

/**
 * Instructs PowerSync to sync data into a "raw" table.
 *
 * Since raw tables are not backed by JSON, running complex queries on them may be more efficient. Further, they allow
 * using client-side table and column constraints.
 *
 * To collect local writes to raw tables with PowerSync, custom triggers are required. See
 * {@link https://docs.powersync.com/usage/use-case-examples/raw-tables the documentation} for details and an example on
 * using raw tables.
 *
 * Note that raw tables are only supported when using the new `SyncClientImplementation.rust` sync client.
 *
 * @experimental Please note that this feature is experimental at the moment, and not covered by PowerSync semver or
 * stability guarantees.
 */
export type RawTableType = RawTableTypeWithStatements | InferredRawTableType;

interface RawTableTypeWithStatements {
  /**
   * The statement to run when PowerSync detects that a row needs to be inserted or updated.
   */
  put: PendingStatement;
  /**
   * The statement to run when PowerSync detects that a row needs to be deleted.
   */
  delete: PendingStatement;

  /**
   * An optional statement to run when `disconnectAndClear()` is called on a PowerSync database.
   */
  clear?: string;
}

interface InferredRawTableType extends Partial<RawTableTypeWithStatements>, TableOrRawTableOptions {
  /**
   * The actual name of the raw table in the local schema.
   *
   * Unlike {@link RawTable.name}, which describes the name of synced tables to match, this reflects  the SQLite table
   * name. This is used to infer {@link RawTableType.put} and {@link RawTableType.delete} statements for the sync
   * client. It can also be used to auto-generate triggers forwarding writes on raw tables into the CRUD upload queue
   * (using the `powersync_create_raw_table_crud_trigger` SQL function).
   */
  tableName: string;

  /**
   * An optional filter of columns that should be synced.
   *
   * By default, all columns in a raw table are considered for sync. If a filter is specified, PowerSync treats
   * unmatched columns as local-only and will not attempt to sync them.
   */
  syncedColumns?: string[];
}

/**
 * A parameter to use as part of {@link PendingStatement}.
 *
 * For delete statements, only the `"Id"` value is supported - the sync client will replace it with the id of the row to
 * be synced.
 *
 * For insert and replace operations, the values of columns in the table are available as parameters through
 * `{Column: 'name'}`.
 * The `"Rest"` parameter gets resolved to a JSON object covering all values from the synced row that haven't been
 * covered by a `Column` parameter.
 */
export type PendingStatementParameter = 'Id' | { Column: string } | 'Rest';

/**
 * A statement that the PowerSync client should use to insert or delete data into a table managed by the user.
 */
export type PendingStatement = {
  sql: string;
  params: PendingStatementParameter[];
};

/**
 * @internal
 */
export type RawTable<T extends RawTableType = RawTableType> = T & {
  /**
   * The name of the table.
   *
   * This does not have to match the actual table name in the schema - {@link RawTableType.put} and
   * {@link RawTableType.delete} are free to use another table. Instead, this name is used by the sync client to
   * recognize that operations on this table (as it appears in the source / backend database) are to be handled
   * specially.
   */
  name: string;
};
