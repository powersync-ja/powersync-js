import { AbstractPowerSyncDatabase } from '../../../client/AbstractPowerSyncDatabase.js';
import { WatchedQuery, WatchedQueryOptions } from '../WatchedQuery.js';
import { WatchedQueryBuilder } from '../WatchedQueryBuilder.js';
import { WatchedQueryComparator } from './comparators.js';
import { OnChangeQueryProcessor } from './OnChangeQueryProcessor.js';

export interface ComparisonWatchProcessorOptions<DataType> {
  comparator?: WatchedQueryComparator<DataType>;
  watch: WatchedQueryOptions<DataType>;
}

export class ComparisonWatchedQueryBuilder implements WatchedQueryBuilder {
  constructor(protected db: AbstractPowerSyncDatabase) {}

  build<DataType>(options: ComparisonWatchProcessorOptions<DataType>): WatchedQuery<DataType> {
    return new OnChangeQueryProcessor({
      db: this.db,
      comparator: options.comparator ?? {
        checkEquality: (a, b) => JSON.stringify(a) == JSON.stringify(b)
      },
      watchOptions: options.watch
    });
  }
}
