import React from 'react';
import { useWatchedQuerySubscription } from './useWatchedQuerySubscription';
import { HookWatchOptions, QueryResult } from './watch-types';
import { InternalHookOptions } from './watch-utils';

export const useWatchedQuery = <RowType = unknown>(
  options: InternalHookOptions<RowType[]> & { options: HookWatchOptions }
): QueryResult<RowType> => {
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
