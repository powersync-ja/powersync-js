import { ArrayComparator } from './watched/processors/comparators.js';
import {
  DifferentialWatchedQuery,
  DifferentialWatchedQueryOptions
} from './watched/processors/DifferentialQueryProcessor.js';
import { ComparisonWatchedQuery } from './watched/processors/OnChangeQueryProcessor.js';
import { WatchedQueryOptions } from './watched/WatchedQuery.js';

/**
 * Query parameters for {@link ArrayQueryDefinition#parameters}
 */
export type QueryParam = string | number | boolean | null | undefined | bigint | Uint8Array;

/**
 * Options for building a query with {@link AbstractPowerSyncDatabase.query}.
 * This query will be executed with {@link AbstractPowerSyncDatabase.getAll}.
 */
export interface ArrayQueryDefinition<RowType = unknown> {
  sql: string;
  parameters?: ReadonlyArray<Readonly<QueryParam>>;
  /**
   * Maps the raw SQLite row to a custom typed object.
   * @example
   * ```javascript
   * mapper: (row) => ({
   *  ...row,
   *  created_at: new Date(row.created_at as string),
   * })
   * ```
   */
  mapper?: (row: Record<string, unknown>) => RowType;
}

/**
 * Options for {@link Query.watch}.
 */
export interface StandardWatchedQueryOptions<RowType> extends WatchedQueryOptions {
  /**
   * Optional comparator which processes the items of an array of rows.
   * The comparator compares the result set rows by index using the {@link ArrayComparatorOptions.compareBy} function.
   * The comparator reports a changed result set as soon as a row does not match the previous result set.
   *
   * @example
   * ```javascript
   * comparator: new ArrayComparator({
   *     compareBy: (item) => JSON.stringify(item)
   * })
   * ```
   */
  comparator?: ArrayComparator<RowType>;

  /**
   * The initial data state reported while the query is loading for the first time.
   * @default []
   */
  placeholderData?: RowType[];
}

export interface Query<RowType> {
  /**
   * Creates a {@link WatchedQuery} which watches and emits results of the linked query.
   *
   * By default the returned watched query will emit changes whenever a change to the underlying SQLite tables is made.
   * These changes might not be relevant to the query, but the query will emit a new result set.
   *
   * A {@link StandardWatchedQueryOptions#comparator} can be provided to limit the data emissions. The watched query will still
   * query the underlying DB on a underlying table changes, but the result will only be emitted if the comparator detects a change in the results.
   *
   * The comparator in this method is optimized and returns early as soon as it detects a change. Each data emission will correlate to a change in the result set,
   * but note that the result set will not maintain internal object references to the previous result set. If internal object references are needed,
   * consider using {@link Query#differentialWatch} instead.
   */
  watch(options?: StandardWatchedQueryOptions<RowType>): ComparisonWatchedQuery<ReadonlyArray<Readonly<RowType>>>;

  /**
   * Creates a {@link WatchedQuery} which watches and emits results of the linked query.
   *
   * This query method watches for changes in the underlying SQLite tables and runs the query on each table change.
   * The difference between the current and previous result set is computed.
   * The watched query will not emit changes if the result set is identical to the previous result set.
   * If the result set is different, the watched query will emit the new result set and provide a detailed diff of the changes.
   *
   * The deep differentiation allows maintaining result set object references between result emissions.
   * The {@link DifferentialWatchedQuery#state} `data` array will contain the previous row references for unchanged rows.
   * A detailed diff of the changes can be accessed via {@link DifferentialWatchedQuery#state} `diff`.
   */
  differentialWatch(options?: DifferentialWatchedQueryOptions<RowType>): DifferentialWatchedQuery<RowType>;
}
