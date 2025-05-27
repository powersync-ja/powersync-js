import { CompilableQuery, WatchedQuery } from '@powersync/common';
import React from 'react';
import { generateQueryKey, getQueryStore } from '../QueryStore';
import { usePowerSync } from './PowerSyncContext';
import { AdditionalOptions, constructCompatibleQuery, QueryResult } from './useQuery';

export type SuspenseQueryResult<T> = Pick<QueryResult<T>, 'data' | 'refresh'>;

/**
 * The store will dispose this query if it has no subscribers attached to it.
 * The suspense promise adds a subscriber to the query, but the promise could resolve
 * before this component is committed. The promise will release it's listener once the query is no longer loading.
 * This temporary hold is used to ensure that the query is not disposed in the interim.
 * Creates a subscription for state change which creates a temporary hold on the query
 * @returns a function to release the hold
 */
const useTemporaryHold = (watchedQuery?: WatchedQuery<unknown>) => {
  const releaseTemporaryHold = React.useRef<(() => void) | undefined>(undefined);
  const addedHoldTo = React.useRef<WatchedQuery<unknown> | undefined>(undefined);

  if (addedHoldTo.current !== watchedQuery) {
    releaseTemporaryHold.current?.();
    addedHoldTo.current = watchedQuery;

    if (!watchedQuery || !watchedQuery.state.isLoading) {
      // No query to hold or no reason to hold, return a no-op
      return {
        releaseHold: () => {}
      };
    }

    const disposeSubscription = watchedQuery.subscribe({
      onStateChange: (state) => {}
    });

    let timeout: ReturnType<typeof setTimeout>;

    const disposeClosedListener = watchedQuery.registerListener({
      closed: () => {
        if (timeout) {
          clearTimeout(timeout);
        }
        disposeClosedListener();
      }
    });

    const releaseHold = () => {
      disposeSubscription();
      disposeClosedListener();
    };
    releaseTemporaryHold.current = releaseHold;

    const timeoutPollMs = 5_000;

    const checkHold = () => {
      if (watchedQuery.closed || !watchedQuery.state.isLoading || watchedQuery.state.error) {
        // No need to keep a temporary hold on this query
        releaseHold();
      } else {
        // Need to keep the hold, check again after timeout
        setTimeout(checkHold, timeoutPollMs);
      }
    };

    // Set a timeout to conditionally remove the temporary hold
    setTimeout(checkHold, timeoutPollMs);
  }

  return {
    releaseHold: releaseTemporaryHold.current
  };
};

/**
 * React suspense relies on a promise that resolves once the initial data has loaded.
 * This creates a promise which registers a listener on the watched query.
 * Registering a listener on the watched query will ensure that the query is not disposed
 * while the component is suspended.
 */
const createSuspendingPromise = (query: WatchedQuery<unknown>) => {
  return new Promise<void>((resolve) => {
    // The listener here will dispose itself once the loading is done
    // This decreases the number of listeners on the query
    // even if the component is unmounted
    const dispose = query.subscribe({
      onStateChange: (state) => {
        // Returns to the hook if loading is completed or if loading resulted in an error
        if (!state.isLoading || state.error) {
          resolve();
          dispose();
        }
      }
    });
  });
};

// TODO naming
export const useWatchedQuerySuspenseSubscription = <ResultType>(query: WatchedQuery<ResultType>) => {
  const { releaseHold } = useTemporaryHold(query);

  // Force update state function
  const [, setUpdateCounter] = React.useState(0);

  React.useEffect(() => {
    // This runs when the component came out of suspense
    // This add a permanent hold since a listener has been added to the query
    const dispose = query.subscribe({
      onStateChange() {
        // Trigger rerender
        setUpdateCounter((prev) => prev + 1);
      }
    });

    // This runs on the first iteration before the component is suspended
    // We should only release the hold once the component is no longer loading
    if (!query.state.isLoading) {
      releaseHold();
    }

    return dispose;
  }, []);

  if (query.state.error != null) {
    // Report errors - this is caught by an error boundary
    throw query.state.error;
  } else if (!query.state.isLoading) {
    // Happy path data return
    return { data: query.state.data };
  } else {
    // Notify suspense is required
    throw createSuspendingPromise(query);
  }
};

const useWatchedSuspenseQuery = <T = any>(
  query: string | CompilableQuery<T>,
  parameters: any[] = [],
  options: AdditionalOptions = {}
): SuspenseQueryResult<T> => {
  const powerSync = usePowerSync();
  if (!powerSync) {
    throw new Error('PowerSync not configured.');
  }

  // Note, we don't need to check if the query changed since we fetch the WatchedQuery
  // from the store given these query params
  const { parsedQuery } = constructCompatibleQuery(query, parameters, options);
  const { sql: parsedSql, parameters: parsedParameters } = parsedQuery.compile();

  const key = generateQueryKey(parsedSql, parsedParameters, options);

  // When the component is suspended, all state is discarded. We don't get
  // any notification of that. So checkoutQuery reserves a temporary hold
  // on the query.
  // Once the component "commits", we exchange that for a permanent hold.
  const store = getQueryStore(powerSync);
  const watchedQuery = store.getQuery(key, parsedQuery, options) as WatchedQuery<T[]>;

  return useWatchedQuerySuspenseSubscription(watchedQuery);
};

/**
 * Use a query which is not watched, but suspends until the initial result has loaded.
 * Internally this uses a WatchedQuery during suspense for state management. The watched
 * query is potentially disposed, if there are no subscribers attached to it, after the initial load.
 * The query can be refreshed by calling the `refresh` function after initial load.
 */
const useSingleSuspenseQuery = <T = any>(
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
    } else if (watchedQuery?.state.data) {
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
  } else if (data || watchedQuery?.state.data) {
    // Happy path data return
    return {
      data: data ?? watchedQuery?.state.data ?? [],
      refresh: async () => {
        try {
          const result = await parsedQuery.execute(parsedQuery.compile());
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

/**
 * A hook to access the results of a watched query that suspends until the initial result has loaded.
 * @example
 * export const ContentComponent = () => {
 * const { data: lists }  = useSuspenseQuery('SELECT * from lists');
 *
 * return <View>
 *   {lists.map((l) => (
 *     <Text key={l.id}>{JSON.stringify(l)}</Text>
 *   ))}
 * </View>;
 * }
 *
 * export const DisplayComponent = () => {
 * return (
 *    <Suspense fallback={<div>Loading content...</div>}>
 *       <ContentComponent />
 *    </Suspense>
 * );
 * }
 */
export const useSuspenseQuery = <T = any>(
  query: string | CompilableQuery<T>,
  parameters: any[] = [],
  options: AdditionalOptions = {}
): SuspenseQueryResult<T> => {
  switch (options.runQueryOnce) {
    case true:
      return useSingleSuspenseQuery<T>(query, parameters, options);
    default:
      return useWatchedSuspenseQuery<T>(query, parameters, options);
  }
};
