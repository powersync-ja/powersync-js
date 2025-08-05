import { CompilableQuery, WatchedQuery } from '@powersync/common';
import React from 'react';
import { generateQueryKey, getQueryStore } from '../../QueryStore.js';
import { usePowerSync } from '../PowerSyncContext.js';
import { AdditionalOptions } from '../watched/watch-types.js';
import { constructCompatibleQuery } from '../watched/watch-utils.js';
import { createSuspendingPromise, useTemporaryHold } from './suspense-utils.js';
import { SuspenseQueryResult } from './SuspenseQueryResult.js';

/**
 * Use a query which is not watched, but suspends until the initial result has loaded.
 * Internally this uses a WatchedQuery during suspense for state management. The watched
 * query is potentially disposed, if there are no subscribers attached to it, after the initial load.
 * The query can be refreshed by calling the `refresh` function after initial load.
 */
export const useSingleSuspenseQuery = <T = any>(
  query: string | CompilableQuery<T>,
  parameters: any[] = [],
  options: AdditionalOptions = {}
): SuspenseQueryResult<T> => {
  const powerSync = usePowerSync();
  if (!powerSync) {
    throw new Error('PowerSync not configured.');
  }

  // Manually track data for single queries
  const [data, setData] = React.useState<T[] | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  // Note, we don't need to check if the query changed since we fetch the WatchedQuery
  // from the store given these query params
  const { parsedQuery } = constructCompatibleQuery(query, parameters, options);
  const { sql: parsedSql, parameters: parsedParameters } = parsedQuery.compile();

  const key = generateQueryKey(parsedSql, parsedParameters, options);
  const store = getQueryStore(powerSync);

  // Only use a temporary watched query if we don't have data yet.
  const watchedQuery = data ? null : (store.getQuery(key, parsedQuery, options) as WatchedQuery<T[]>);
  const { releaseHold } = useTemporaryHold(watchedQuery);
  React.useEffect(() => {
    // Set the initial yielded data
    // it should be available once we commit the component
    if (watchedQuery?.state.error) {
      setError(watchedQuery.state.error);
    } else if (watchedQuery?.state.isLoading === false) {
      setData(watchedQuery.state.data);
      setError(null);
    }

    if (!watchedQuery?.state.isLoading) {
      releaseHold();
    }
  }, []);

  if (error != null) {
    // Report errors - this is caught by an error boundary
    throw error;
  } else if (data || watchedQuery?.state.isLoading === false) {
    // Happy path data return
    return {
      data: data ?? watchedQuery?.state.data ?? [],
      refresh: async (signal) => {
        try {
          const compiledQuery = parsedQuery.compile();
          const result = await parsedQuery.execute({
            sql: compiledQuery.sql,
            parameters: [...compiledQuery.parameters],
            db: powerSync
          });
          if (signal.aborted) {
            return; // Abort if the signal is already aborted
          }
          setData(result);
          setError(null);
        } catch (e) {
          setError(e);
        }
      }
    };
  } else {
    // Notify suspense is required
    throw createSuspendingPromise(watchedQuery!);
  }
};
