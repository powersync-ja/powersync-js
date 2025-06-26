import { AbstractPowerSyncDatabase } from '../../../client/AbstractPowerSyncDatabase.js';
import { WatchedQuery } from '../WatchedQuery.js';
import { WatchedQueryBuilder } from '../WatchedQueryBuilder.js';
import {
  DifferentialQueryProcessor,
  DifferentialWatchedQuerySettings,
  EMPTY_DIFFERENTIAL,
  WatchedQueryDifferential,
  WatchedQueryDifferentiator
} from './DifferentialQueryProcessor.js';

/**
 * Options for creating an incrementally watched query that emits differential results.
 *
 */
export type DifferentialWatchedQueryBuilderOptions<RowType> = {
  differentiator?: WatchedQueryDifferentiator<RowType>;
  watch: DifferentialWatchedQuerySettings<RowType>;
};

/**
 * Default implementation of the {@link Differentiator} for watched queries.
 * It identifies items by their `id` property if available, otherwise it uses JSON stringification
 * of the entire item for identification and comparison.
 */
export const DEFAULT_WATCHED_QUERY_DIFFERENTIATOR: WatchedQueryDifferentiator<any> = {
  identify: (item) => {
    if (item && typeof item == 'object' && typeof item['id'] == 'string') {
      return item['id'];
    }
    return JSON.stringify(item);
  },
  compareBy: (item) => JSON.stringify(item)
};

/**
 * Builds a watched query which emits differential results based on the provided differentiator.
 */
export class DifferentialWatchedQueryBuilder implements WatchedQueryBuilder {
  constructor(protected db: AbstractPowerSyncDatabase) {}

  /**
   *  Builds a watched query which emits differential results based on the provided differentiator.
   *  The {@link WatchedQueryState.data} is of the {@link WatchedQueryDifferential} form.
   *  The data delta relates to the difference between the query result set since the last change to the dataset.
   *
   * @example
   * ```javascript
   * .build({
   *  // Optional differentiator, defaults to using the `id` field of the items if available,
   *  // otherwise it uses JSON stringification of the entire item.
   *  differentiator: {
   *    identify: (item) => item.id,
   *    compareBy: (item) => JSON.stringify(item)
   *  },
   *  watch: {
   *    query: new GetAllQuery({
   *      sql: '
   *        SELECT
   *          *
   *        FROM
   *          assets
   *      ',
   *      mapper: (raw) => {
   *        return {
   *          id: raw.id as string,
   *          make: raw.make as string
   *        };
   *      }
   *    })
   *  },
   * });
   * ```
   */
  build<RowType>(
    options: DifferentialWatchedQueryBuilderOptions<RowType>
  ): WatchedQuery<WatchedQueryDifferential<RowType>, DifferentialWatchedQuerySettings<RowType>> {
    return new DifferentialQueryProcessor({
      db: this.db,
      differentiator: options.differentiator ?? DEFAULT_WATCHED_QUERY_DIFFERENTIATOR,
      watchOptions: options.watch,
      placeholderData: options.watch.placeholderData ?? EMPTY_DIFFERENTIAL
    });
  }
}
