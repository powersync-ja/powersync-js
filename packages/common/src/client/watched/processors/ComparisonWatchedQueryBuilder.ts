import { AbstractPowerSyncDatabase } from '../../../client/AbstractPowerSyncDatabase.js';
import { WatchedQuery } from '../WatchedQuery.js';
import { WatchedQueryBuilder } from '../WatchedQueryBuilder.js';
import { WatchedQueryComparator } from './comparators.js';
import { ComparisonWatchedQuerySettings, OnChangeQueryProcessor } from './OnChangeQueryProcessor.js';

/**
 * Options for building incrementally watched queries that compare the result set.
 * It uses a comparator to determine if the result set has changed since the last update.
 * If the result set has changed, it emits the new result set.
 */
export interface ComparisonWatchProcessorOptions<DataType> {
  comparator?: WatchedQueryComparator<DataType>;
  watch: ComparisonWatchedQuerySettings<DataType>;
}

/**
 * Default implementation of the {@link WatchedQueryComparator} for watched queries.
 * It uses JSON stringification to compare the entire result set.
 * Array based results should use {@link ArrayComparator} for more efficient item comparison.
 */
export const DEFAULT_WATCHED_QUERY_COMPARATOR: WatchedQueryComparator<any> = {
  checkEquality: (a, b) => JSON.stringify(a) === JSON.stringify(b)
};

/**
 * Builds an incrementally watched query that emits results after comparing the result set for changes.
 */
export class ComparisonWatchedQueryBuilder implements WatchedQueryBuilder {
  constructor(protected db: AbstractPowerSyncDatabase) {}

  /**
   * Builds a watched query which emits results after comparing the result set. Results are only emitted if the result set changed.
   * @example
   * ``` javascript
   *  .build({
   *    watch: {
   *      placeholderData: [],
   *      query: new GetAllQuery({
   *        sql: `SELECT photo_id as id FROM todos WHERE photo_id IS NOT NULL`,
   *        parameters: []
   *      }),
   *      throttleMs: 1000
   *    },
   *    // Optional comparator, defaults to JSON stringification of the entire result set.
   *    comparator: new ArrayComparator({
   *      // By default the entire result set is stringified and compared.
   *      // Comparing the array items individual can be more efficient.
   *      // Alternatively a unique field can be used to compare items.
   *      // For example, if the items are objects with an `updated_at` field:
   *      compareBy: (item) => JSON.stringify(item)
   *    })
   *  })
   * ```
   */
  build<DataType>(
    options: ComparisonWatchProcessorOptions<DataType>
  ): WatchedQuery<DataType, ComparisonWatchedQuerySettings<DataType>> {
    return new OnChangeQueryProcessor({
      db: this.db,
      comparator: options.comparator ?? DEFAULT_WATCHED_QUERY_COMPARATOR,
      watchOptions: options.watch,
      placeholderData: options.watch.placeholderData
    });
  }
}
