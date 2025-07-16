import React from 'react';
import { useWatchedQuerySubscription } from './useWatchedQuerySubscription';
import { DifferentialHookOptions, QueryResult, ReadonlyQueryResult } from './watch-types';
import { InternalHookOptions } from './watch-utils';

/**
 * @internal This is not exported from the index.ts
 *
 * When a differential query is used the return type is readonly. This is required
 * since the implementation requires a stable ref.
 * For legacy compatibility we allow mutating when a standard query is used. Mutations should
 * not affect the internal implementation in this case.
 */
export const useWatchedQuery = <RowType = unknown>(
  options: InternalHookOptions<RowType[]> & { options: DifferentialHookOptions<RowType> }
): QueryResult<RowType> | ReadonlyQueryResult<RowType> => {
  const { query, powerSync, queryChanged, options: hookOptions } = options;

  const createWatchedQuery = React.useCallback(() => {
    const watch = hookOptions.differentiator
      ? powerSync.customQuery(query).differentialWatch({
          differentiator: hookOptions.differentiator,
          reportFetching: hookOptions.reportFetching,
          throttleMs: hookOptions.throttleMs
        })
      : powerSync.customQuery(query).watch({
          reportFetching: hookOptions.reportFetching,
          throttleMs: hookOptions.throttleMs
        });
    return watch;
  }, []);

  const [watchedQuery, setWatchedQuery] = React.useState(createWatchedQuery);

  React.useEffect(() => {
    watchedQuery.close();
    setWatchedQuery(createWatchedQuery);
  }, [powerSync]);

  // Indicates that the query will be re-fetched due to a change in the query.
  // Used when `isFetching` hasn't been set to true yet due to React execution.
  React.useEffect(() => {
    if (queryChanged) {
      watchedQuery.updateSettings({
        query,
        throttleMs: hookOptions.throttleMs,
        reportFetching: hookOptions.reportFetching
      });
    }
  }, [queryChanged]);

  return useWatchedQuerySubscription(watchedQuery);
};
