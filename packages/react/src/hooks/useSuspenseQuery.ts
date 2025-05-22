import { CompilableQuery, WatchedQuery } from '@powersync/common';
import React from 'react';
import { generateQueryKey, getQueryStore } from '../QueryStore';
import { usePowerSync } from './PowerSyncContext';
import { AdditionalOptions, constructCompatibleQuery, QueryResult } from './useQuery';

export type SuspenseQueryResult<T> = Pick<QueryResult<T>, 'data' | 'refresh'>;

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

  const addedHoldTo = React.useRef<WatchedQuery<T[]> | undefined>(undefined);
  const releaseTemporaryHold = React.useRef<(() => void) | undefined>(undefined);

  if (addedHoldTo.current !== watchedQuery) {
    releaseTemporaryHold.current?.();

    // The store will dispose this query if it has no subscribers attached to it.
    // Creates a subscription for state change which creates a temporary hold on the query
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

    addedHoldTo.current = watchedQuery;
  }

  // Force update state function
  const [, setUpdateCounter] = React.useState(0);

  React.useEffect(() => {
    // This runs when the component came out of suspense
    // Does it run before suspending?
    // This add a permanent hold since a listener has been added to the query
    const dispose = watchedQuery.subscribe({
      onStateChange() {
        // Trigger rerender
        setUpdateCounter((prev) => prev + 1);
      }
    });

    releaseTemporaryHold.current?.();
    releaseTemporaryHold.current = undefined;

    return dispose;
  }, []);

  if (watchedQuery.state.error != null) {
    // Report errors - this is caught by an error boundary
    throw watchedQuery.state.error;
  } else if (!watchedQuery.state.isLoading) {
    // Happy path data return
    return { data: watchedQuery.state.data };
  } else {
    // Notify suspense is required
    throw new Promise<void>((resolve) => {
      const dispose = watchedQuery.subscribe({
        onStateChange: (state) => {
          // Returns to the hook if loading is completed or if loading resulted in an error
          if (!state.isLoading || state.error) {
            resolve();
            dispose();
          }
        }
      });
    });
  }
};
