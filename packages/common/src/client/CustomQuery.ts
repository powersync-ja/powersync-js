import { AbstractPowerSyncDatabase } from './AbstractPowerSyncDatabase.js';
import { Query, StandardWatchedQueryOptions } from './Query.js';
import { FalsyComparator } from './watched/processors/comparators.js';
import {
  DifferentialQueryProcessor,
  DifferentialWatchedQueryOptions
} from './watched/processors/DifferentialQueryProcessor.js';
import { OnChangeQueryProcessor } from './watched/processors/OnChangeQueryProcessor.js';
import { DEFAULT_WATCH_QUERY_OPTIONS, WatchCompatibleQuery, WatchedQueryOptions } from './watched/WatchedQuery.js';

/**
 * @internal
 */
export interface CustomQueryOptions<RowType> {
  db: AbstractPowerSyncDatabase;
  query: WatchCompatibleQuery<RowType[]>;
}

/**
 * @internal
 */
export class CustomQuery<RowType> implements Query<RowType> {
  constructor(protected options: CustomQueryOptions<RowType>) {}

  protected resolveOptions(options: WatchedQueryOptions): WatchedQueryOptions {
    return {
      reportFetching: options?.reportFetching ?? DEFAULT_WATCH_QUERY_OPTIONS.reportFetching,
      throttleMs: options?.throttleMs ?? DEFAULT_WATCH_QUERY_OPTIONS.throttleMs,
      triggerOnTables: options?.triggerOnTables
    };
  }

  watch(watchOptions: StandardWatchedQueryOptions<RowType>) {
    return new OnChangeQueryProcessor<RowType[]>({
      db: this.options.db,
      comparator: watchOptions?.comparator ?? FalsyComparator,
      placeholderData: watchOptions?.placeholderData ?? [],
      watchOptions: {
        ...this.resolveOptions(watchOptions),
        query: this.options.query
      }
    });
  }

  differentialWatch(differentialWatchOptions: DifferentialWatchedQueryOptions<RowType>) {
    return new DifferentialQueryProcessor<RowType>({
      db: this.options.db,
      rowComparator: differentialWatchOptions?.rowComparator,
      placeholderData: differentialWatchOptions?.placeholderData ?? [],
      watchOptions: {
        ...this.resolveOptions(differentialWatchOptions),
        query: this.options.query
      }
    });
  }
}
