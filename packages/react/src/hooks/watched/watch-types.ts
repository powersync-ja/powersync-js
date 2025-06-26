import { WatchedQueryComparator, type SQLWatchOptions } from '@powersync/common';

export interface HookWatchOptions<RowType = unknown> extends Omit<SQLWatchOptions, 'signal' | 'comparator'> {
  reportFetching?: boolean;
  comparator?: WatchedQueryComparator<RowType[]>;
}

export interface AdditionalOptions<RowType = unknown> extends HookWatchOptions<RowType> {
  runQueryOnce?: boolean;
}

export type QueryResult<RowType> = {
  data: RowType[];
  /**
   * Indicates the initial loading state (hard loading). Loading becomes false once the first set of results from the watched query is available or an error occurs.
   */
  isLoading: boolean;
  /**
   * Indicates whether the query is currently fetching data, is true during the initial load and any time when the query is re-evaluating (useful for large queries).
   */
  isFetching: boolean;
  error: Error | undefined;
  /**
   * Function used to run the query again.
   */
  refresh?: (signal?: AbortSignal) => Promise<void>;
};
