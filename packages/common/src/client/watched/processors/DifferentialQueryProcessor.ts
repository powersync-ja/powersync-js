import { WatchCompatibleQuery, WatchedQuery, WatchedQueryListener, WatchedQueryOptions } from '../WatchedQuery.js';

/**
 * Represents an updated row in a differential watched query.
 * It contains both the current and previous state of the row.
 *
 * @public
 */
export interface WatchedQueryRowDifferential<RowType> {
  readonly current: RowType;
  readonly previous: RowType;
}

/**
 * Represents the result of a watched query that has been diffed.
 * {@link DifferentialWatchedQueryState#diff} is of the {@link WatchedQueryDifferential} form.
 *
 * @public
 */
export interface WatchedQueryDifferential<RowType> {
  readonly added: ReadonlyArray<Readonly<RowType>>;
  /**
   * The entire current result set.
   * Array item object references are preserved between updates if the item is unchanged.
   *
   * e.g. In the query
   * ```sql
   *  SELECT name, make FROM assets ORDER BY make ASC;
   * ```
   *
   * If a previous result set contains an item (A) `{name: 'pc', make: 'Cool PC'}` and
   * an update has been made which adds another item (B) to the result set (the item A is unchanged) - then
   * the updated result set will be contain the same object reference, to item A, as the previous result set.
   * This is regardless of the item A's position in the updated result set.
   */
  readonly all: ReadonlyArray<Readonly<RowType>>;
  readonly removed: ReadonlyArray<Readonly<RowType>>;
  readonly updated: ReadonlyArray<WatchedQueryRowDifferential<Readonly<RowType>>>;
  readonly unchanged: ReadonlyArray<Readonly<RowType>>;
}

/**
 * Row comparator for differentially watched queries which keys and compares items in the result set.
 *
 * @public
 */
export interface DifferentialWatchedQueryComparator<RowType> {
  /**
   * Generates a unique key for the item.
   */
  keyBy: (item: RowType) => string;
  /**
   * Generates a token for comparing items with matching keys.
   */
  compareBy: (item: RowType) => string;
}

/**
 * Options for building a differential watched query with the {@link Query} builder.
 *
 * @public
 */
export interface DifferentialWatchedQueryOptions<RowType> extends WatchedQueryOptions {
  /**
   * Initial result data which is presented while the initial loading is executing.
   */
  placeholderData?: RowType[];

  /**
   * Row comparator used to identify and compare rows in the result set.
   * If not provided, the default comparator will be used which keys items by their `id` property if available,
   * otherwise it uses JSON stringification of the entire item for keying and comparison.
   */
  rowComparator?: DifferentialWatchedQueryComparator<RowType>;
}

/**
 * Settings for differential incremental watched queries using.
 *
 * @public
 */
export interface DifferentialWatchedQuerySettings<RowType> extends DifferentialWatchedQueryOptions<RowType> {
  /**
   * The query here must return an array of items that can be differentiated.
   */
  query: WatchCompatibleQuery<RowType[]>;
}

/**
 * @public
 */
export interface DifferentialWatchedQueryListener<RowType> extends WatchedQueryListener<
  ReadonlyArray<Readonly<RowType>>
> {
  onDiff?: (diff: WatchedQueryDifferential<RowType>) => void | Promise<void>;
}

/**
 * @public
 */
export type DifferentialWatchedQuery<RowType> = WatchedQuery<
  ReadonlyArray<Readonly<RowType>>,
  DifferentialWatchedQuerySettings<RowType>,
  DifferentialWatchedQueryListener<RowType>
>;
