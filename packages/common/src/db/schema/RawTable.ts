/**
 * A pending variant of a {@link RawTable} that doesn't have a name (because it would be inferred when creating the
 * schema).
 */
export type RawTableType = {
  /**
   * The statement to run when PowerSync detects that a row needs to be inserted or updated.
   */
  put: PendingStatement;
  /**
   * The statement to run when PowerSync detects that a row needs to be deleted.
   */
  delete: PendingStatement;
};

/**
 * A parameter to use as part of {@link PendingStatement}.
 *
 * For delete statements, only the `"Id"` value is supported - the sync client will replace it with the id of the row to
 * be synced.
 *
 * For insert and replace operations, the values of columns in the table are available as parameters through
 * `{Column: 'name'}`.
 */
export type PendingStatementParameter = 'Id' | { Column: string };

/**
 * A statement that the PowerSync client should use to insert or delete data into a table managed by the user.
 */
export type PendingStatement = {
  sql: string;
  params: PendingStatementParameter[];
};

/**
 * Instructs PowerSync to sync data into a "raw" table.
 *
 * Since raw tables are not backed by JSON, running complex queries on them may be more efficient. Further, they allow
 * using client-side table and column constraints.
 *
 * Note that raw tables are only supported when using the new `SyncClientImplementation.rust` sync client.
 *
 * @experimental Please note that this feature is experimental at the moment, and not covered by PowerSync semver or
 * stability guarantees.
 */
export class RawTable implements RawTableType {
  /**
   * The name of the table.
   *
   * This does not have to match the actual table name in the schema - {@link put} and {@link delete} are free to use
   * another table. Instead, this name is used by the sync client to recognize that operations on this table (as it
   * appears in the source / backend database) are to be handled specially.
   */
  name: string;
  put: PendingStatement;
  delete: PendingStatement;

  constructor(name: string, type: RawTableType) {
    this.name = name;
    this.put = type.put;
    this.delete = type.delete;
  }
}
