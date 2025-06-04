import { AbstractPowerSyncDatabase } from '../../../client/AbstractPowerSyncDatabase.js';
import { WatchedQuery } from '../WatchedQuery.js';
import { WatchedQueryBuilder } from '../WatchedQueryBuilder.js';
import {
  DifferentialQueryProcessor,
  DifferentialWatchedQuerySettings,
  Differentiator,
  WatchedQueryDifferential
} from './DifferentialQueryProcessor.js';

export type DifferentialWatchedQueryBuilderOptions<RowType> = {
  differentiator?: Differentiator<RowType>;
  watchOptions: DifferentialWatchedQuerySettings<RowType>;
};

export class DifferentialWatchedQueryBuilder implements WatchedQueryBuilder {
  constructor(protected db: AbstractPowerSyncDatabase) {}

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
      watchOptions: options.watchOptions
    });
  }
}
