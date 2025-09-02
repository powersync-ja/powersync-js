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

  // This ref is used to protect against cases where `queryChanged` changes multiple times too quickly to be
  // picked up by the useEffect below. This typically happens when React.StrictMode is enabled.
  const queryChangeRef = React.useRef(false);
  if (queryChanged && !queryChangeRef.current) {
    queryChangeRef.current = true;
  }

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
  }, [powerSync, active]);

  // Indicates that the query will be re-fetched due to a change in the query.
  // Used when `isFetching` hasn't been set to true yet due to React execution.
  React.useEffect(() => {
    if (queryChangeRef.current) {
      watchedQuery?.updateSettings({
        query,
        throttleMs: hookOptions.throttleMs,
        reportFetching: hookOptions.reportFetching
      });
      queryChangeRef.current = false;
    }
  }, [queryChangeRef.current]);

  return useNullableWatchedQuerySubscription(watchedQuery);
};
