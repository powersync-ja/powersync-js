import { AbstractPowerSyncDatabase } from '../AbstractPowerSyncDatabase.js';
import { ComparisonWatchedQueryBuilder } from './processors/ComparisonWatchedQueryBuilder.js';
import { DifferentialWatchedQueryBuilder } from './processors/DifferentialWatchedQueryBuilder.js';
import { IncrementalWatchMode } from './WatchedQueryBuilder.js';

/**
 * @internal
 */
export const WatchedQueryBuilderMap = {
  [IncrementalWatchMode.COMPARISON]: (db: AbstractPowerSyncDatabase) => new ComparisonWatchedQueryBuilder(db),
  [IncrementalWatchMode.DIFFERENTIAL]: (db: AbstractPowerSyncDatabase) => new DifferentialWatchedQueryBuilder(db)
};

/**
 * @internal
 */
export type WatchedQueryBuilderMap = {
  [key in IncrementalWatchMode]: ReturnType<(typeof WatchedQueryBuilderMap)[key]>;
};
