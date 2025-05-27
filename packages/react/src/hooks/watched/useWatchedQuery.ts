import React from 'react';
import { HookWatchOptions, QueryResult } from './watch-types';
import { InternalHookOptions } from './watch-utils';

export const useWatchedQuery = <RowType = unknown>(
  options: InternalHookOptions<RowType[]> & { options: HookWatchOptions }
): QueryResult<RowType> => {
  const { query, powerSync, queryChanged, options: hookOptions } = options;

  const createWatchedQuery = React.useCallback(() => {
    return powerSync.incrementalWatch<RowType[]>({
      // This always enables comparison. Might want to be able to disable this??
      watch: {
        placeholderData: [],
        query,
        throttleMs: hookOptions.throttleMs,
        reportFetching: hookOptions.reportFetching
      }
    });
  }, []);

  const [watchedQuery, setWatchedQuery] = React.useState(createWatchedQuery);

  const [output, setOutputState] = React.useState(watchedQuery.state);

  React.useEffect(() => {
    watchedQuery.close();
    setWatchedQuery(createWatchedQuery);
  }, [powerSync]);

  React.useEffect(() => {
    const dispose = watchedQuery.subscribe({
      onStateChange: (state) => {
        setOutputState({ ...state });
      }
    });

    return () => {
      dispose();
      watchedQuery.close();
    };
  }, [watchedQuery]);

  // Indicates that the query will be re-fetched due to a change in the query.
  // Used when `isFetching` hasn't been set to true yet due to React execution.
  React.useEffect(() => {
    if (queryChanged) {
      console.log('Query changed, re-fetching...');
      watchedQuery.updateSettings({
        placeholderData: [],
        query,
        throttleMs: hookOptions.throttleMs,
        reportFetching: hookOptions.reportFetching
      });
    }
  }, [queryChanged]);

  return output;
};
