import { SQLOnChangeOptions, WatchedQueryDifferentiator } from '@powersync/common';

export interface HookWatchOptions extends Omit<SQLOnChangeOptions, 'signal'> {
  reportFetching?: boolean;
}

export interface AdditionalOptions extends HookWatchOptions {
  runQueryOnce?: boolean;
}

export interface DifferentialHookOptions<RowType> extends HookWatchOptions {
  differentiator?: WatchedQueryDifferentiator<RowType>;
}

export type ReadonlyQueryResult<RowType> = {
  readonly data: ReadonlyArray<Readonly<RowType>>;
  /**
   * Indicates the initial loading state (hard loading). Loading becomes false once the first set of results from the watched query is available or an error occurs.
   */
  readonly isLoading: boolean;
  /**
   * Indicates whether the query is currently fetching data, is true during the initial load and any time when the query is re-evaluating (useful for large queries).
   */
  readonly isFetching: boolean;
  readonly error: Error | undefined;
  /**
   * Function used to run the query again.
   */
  refresh?: (signal?: AbortSignal) => Promise<void>;
};

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
