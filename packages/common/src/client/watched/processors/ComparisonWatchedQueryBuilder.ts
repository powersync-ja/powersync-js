import { AbstractPowerSyncDatabase } from '../../../client/AbstractPowerSyncDatabase.js';
import { WatchedQuery } from '../WatchedQuery.js';
import { WatchedQueryBuilder } from '../WatchedQueryBuilder.js';
import { WatchedQueryComparator } from './comparators.js';
import { ComparisonWatchedQuerySettings, OnChangeQueryProcessor } from './OnChangeQueryProcessor.js';

export interface ComparisonWatchProcessorOptions<DataType> {
  comparator?: WatchedQueryComparator<DataType>;
  watch: ComparisonWatchedQuerySettings<DataType>;
}

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
      comparator: options.comparator ?? {
        checkEquality: (a, b) => JSON.stringify(a) == JSON.stringify(b)
      },
      watchOptions: options.watch,
      placeholderData: options.watch.placeholderData
    });
  }
}
