import { SQLOnChangeOptions, WatchedQueryDifferentiator } from '@powersync/common';

export interface HookWatchOptions extends Omit<SQLOnChangeOptions, 'signal'> {
  reportFetching?: boolean;
}

export interface AdditionalOptions extends HookWatchOptions {
  runQueryOnce?: boolean;
}

export interface DifferentialHookOptions<RowType> extends HookWatchOptions {
  /**
   * Used to detect and report differences in query result sets.
   *
   * By default the hook will requery on any dependent table change. This will
   * emit a new hook result even if the result set has not changed.
   *
   * Specifying a {@link WatchedQueryDifferentiator} will remove emissions for
   * unchanged result sets and preserve Array object references between result set emissions.
   * @example
   * ```javascript
   * {
   *  differentiator: {
   *    identify: (item) => item.id,
   *    compareBy: (item) => JSON.stringify(item)
   *  }
   * }
   * ```
   */
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
