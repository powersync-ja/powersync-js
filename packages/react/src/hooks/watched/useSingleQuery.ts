import React from 'react';
import { QueryResult } from './watch-types.js';
import { InternalHookOptions } from './watch-utils.js';

export const useSingleQuery = <RowType = any>(options: InternalHookOptions<RowType[]>): QueryResult<RowType> => {
  const { query, powerSync, queryChanged } = options;

  const [output, setOutputState] = React.useState<QueryResult<RowType>>({
    isLoading: true,
    isFetching: true,
    data: [],
    error: undefined
  });

  const runQuery = React.useCallback(
    async (signal?: AbortSignal) => {
      setOutputState((prev) => ({ ...prev, isLoading: true, isFetching: true, error: undefined }));
      try {
        const compiledQuery = query.compile();
        const result = await query.execute({
          sql: compiledQuery.sql,
          parameters: [...compiledQuery.parameters],
          db: powerSync
        });
        if (signal.aborted) {
          return;
        }
        setOutputState((prev) => ({
          ...prev,
          isLoading: false,
          isFetching: false,
          data: result,
          error: undefined
        }));
      } catch (error) {
        setOutputState((prev) => ({
          ...prev,
          isLoading: false,
          isFetching: false,
          data: [],
          error
        }));
      }
    },
    [queryChanged, query]
  );

  // Trigger initial query execution
  React.useEffect(() => {
    const abortController = new AbortController();
    runQuery(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [powerSync, queryChanged]);

  return {
    ...output,
    refresh: runQuery
  };
};
