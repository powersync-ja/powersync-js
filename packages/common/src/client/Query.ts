import { WatchedQueryComparator } from './watched/processors/comparators.js';
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
 * Options for building a query with {@link AbstractPowerSyncDatabase#query}.
 * This query will be executed with {@link AbstractPowerSyncDatabase#getAll}.
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
 * Options for {@link Query#watch}.
 */
export interface StandardWatchedQueryOptions<RowType> extends WatchedQueryOptions {
  /**
   * The underlying watched query implementation (re)evaluates the query on any SQLite table change.
   *
   * Providing this optional comparator can be used to filter duplicate result set emissions when the result set is unchanged.
   * The comparator compares the previous and current result set.
   *
   * For an efficient comparator see {@link ArrayComparator}.
   *
   * @example
   * ```javascript
   * comparator: new ArrayComparator({
   *     compareBy: (item) => JSON.stringify(item)
   * })
   * ```
   */
  comparator?: WatchedQueryComparator<RowType[]>;

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
   * query the underlying DB on underlying table changes, but the result will only be emitted if the comparator detects a change in the results.
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
   *
   * If the result set is different, the watched query will emit the new result set and emit a detailed diff of the changes via the `onData` and `onDiff` listeners.
   *
   * The deep differentiation allows maintaining result set object references between result emissions.
   * The {@link DifferentialWatchedQuery#state} `data` array will contain the previous row references for unchanged rows.
   *
   * @example
   * ```javascript
   * const watchedLists = powerSync.query({sql: 'SELECT * FROM lists'})
   *  .differentialWatch();
   *
   * const disposeListener = watchedLists.registerListener({
   *  onData: (lists) => {
   *    console.log('The latest result set for the query is', lists);
   *  },
   *  onDiff: (diff) => {
   *    console.log('The lists result set has changed since the last emission', diff.added, diff.removed, diff.updated, diff.all)
   *  }
   * })
   * ```
   */
  differentialWatch(options?: DifferentialWatchedQueryOptions<RowType>): DifferentialWatchedQuery<RowType>;
}
