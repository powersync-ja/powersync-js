import { ColumnType } from './Column.js';

/**
 * A complete, typed, round-trippable serialization of a {@link Schema}.
 *
 * Unlike {@link Schema.toJSON}, which produces the snake-cased payload the SQLite core extension
 * consumes (via `powersync_replace_schema`), this captures the schema as authored — every table
 * option, column, and index — so it can be inspected, transported, or reconstructed with
 * {@link Schema.fromSerialized}.
 *
 * @public
 */
export interface SerializedSchema {
  tables: SerializedTable[];
  rawTables: SerializedRawTable[];
}

/**
 * @public
 */
export interface SerializedTable {
  name: string;
  /** The effective view name (the override if set, otherwise the table name). */
  viewName: string;
  /** Present only when the view name was explicitly overridden. */
  viewNameOverride?: string;
  localOnly: boolean;
  insertOnly: boolean;
  trackPrevious: boolean | SerializedTrackPrevious;
  trackMetadata: boolean;
  ignoreEmptyUpdates: boolean;
  columns: SerializedColumn[];
  indexes: SerializedIndex[];
}

/**
 * @public
 */
export interface SerializedTrackPrevious {
  /** When set, the columns for which previous values are tracked; otherwise all columns. */
  columns?: string[];
  onlyWhenChanged: boolean;
}

/**
 * @public
 */
export interface SerializedColumn {
  name: string;
  type: ColumnType;
}

/**
 * @public
 */
export interface SerializedIndex {
  name: string;
  columns: SerializedIndexColumn[];
}

/**
 * @public
 */
export interface SerializedIndexColumn {
  name: string;
  ascending: boolean;
}

/**
 * Raw tables are managed by the application, so only their name is captured here.
 *
 * @public
 */
export interface SerializedRawTable {
  name: string;
}
