import React from 'react';
import { useNullableWatchedQuerySubscription } from './useWatchedQuerySubscription.js';
import { DifferentialHookOptions, QueryResult, ReadonlyQueryResult } from './watch-types.js';
import { InternalHookOptions } from './watch-utils.js';

/**
 * @internal This is not exported from the index.ts
 *
 * When an incremental query is used the return type is readonly. This is required
 * since the implementation requires a stable ref.
 * For legacy compatibility we allow mutating when a standard query is used. Mutations should
 * not affect the internal implementation in this case.
 */
export const useWatchedQuery = <RowType = unknown>(
  options: InternalHookOptions<RowType[]> & { options: DifferentialHookOptions<RowType> }
): QueryResult<RowType> | ReadonlyQueryResult<RowType> => {
  const { query, powerSync, queryChanged, options: hookOptions, active } = options;

  function createWatchedQuery() {
    if (!active) {
      return null;
    }

    const watch = hookOptions.rowComparator
      ? powerSync.customQuery(query).differentialWatch({
          rowComparator: hookOptions.rowComparator,
          reportFetching: hookOptions.reportFetching,
          throttleMs: hookOptions.throttleMs
        })
      : powerSync.customQuery(query).watch({
          reportFetching: hookOptions.reportFetching,
          throttleMs: hookOptions.throttleMs
        });
    return watch;
  }

  const [watchedQuery, setWatchedQuery] = React.useState(createWatchedQuery);

  React.useEffect(() => {
    watchedQuery?.close();
    setWatchedQuery(createWatchedQuery);

    return () => {
      watchedQuery?.close();
    };
  }, [powerSync, active]);

  /**
   * Indicates that the query will be re-fetched due to a change in the query.
   * We execute this in-line (not using an effect) since effects are delayed till after the hook returns.
   * The `queryChanged` value should only be true for a single render.
   * The `updateSettings` method is asynchronous, thus it will update the state asynchronously.
   * In the React hooks we'd like to report that we are fetching the data for an updated query
   * as soon as the query has been updated. This prevents a result flow where e.g. the hook:
   *  - already returned a result: isLoading, isFetching are both false
   *  - the query is updated, but the state is still isFetching=false from the previous state
   * We only need to override the isFetching status on the initial render where the query changed
   * (if we report the fetching status). The fetching status will be updated internally in the `updateSettings`
   * method eventually.
   * Only overriding when the `queryChanged` value is true also prevents races if the query changes
   * rapidly.
   */
  if (queryChanged) {
    watchedQuery?.updateSettings({
      query,
      throttleMs: hookOptions.throttleMs,
      reportFetching: hookOptions.reportFetching
    });
  }

  const shouldReportCurrentlyFetching = (hookOptions.reportFetching ?? true) && queryChanged;

  const result = useNullableWatchedQuerySubscription(watchedQuery);
  return {
    ...result,
    isFetching: result?.isFetching || shouldReportCurrentlyFetching
  };
};
