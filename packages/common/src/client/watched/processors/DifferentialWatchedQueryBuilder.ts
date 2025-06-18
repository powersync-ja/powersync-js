import { AbstractPowerSyncDatabase } from '../../../client/AbstractPowerSyncDatabase.js';
import { WatchedQuery } from '../WatchedQuery.js';
import { WatchedQueryBuilder } from '../WatchedQueryBuilder.js';
import {
  DifferentialQueryProcessor,
  DifferentialWatchedQuerySettings,
  Differentiator,
  EMPTY_DIFFERENTIAL,
  WatchedQueryDifferential
} from './DifferentialQueryProcessor.js';

export type DifferentialWatchedQueryBuilderOptions<RowType> = {
  differentiator?: Differentiator<RowType>;
  watch: DifferentialWatchedQuerySettings<RowType>;
};

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
   *      transformer: (raw) => {
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
      differentiator: options.differentiator ?? {
        identify: (item: RowType) => {
          if (item && typeof item == 'object' && typeof item['id'] == 'string') {
            return item['id'];
          }
          return JSON.stringify(item);
        },
        compareBy: (item: RowType) => JSON.stringify(item)
      },
      watchOptions: options.watch,
      placeholderData: options.watch.placeholderData ?? EMPTY_DIFFERENTIAL
    });
  }
}
