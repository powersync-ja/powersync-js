import { WatchedQuery } from '@powersync/common';
import React from 'react';
import { createSuspendingPromise, useTemporaryHold } from './suspense-utils.js';

/**
 * A hook to access and subscribe to the results of an existing {@link WatchedQuery}.
 * @example
 * export const ContentComponent = () => {
 * const { data: lists }  = useWatchedQuerySuspenseSubscription(listsQuery);
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
export const useWatchedQuerySuspenseSubscription = <
  ResultType = unknown,
  Query extends WatchedQuery<ResultType> = WatchedQuery<ResultType>
>(
  query: Query
): Query['state'] => {
  const { releaseHold } = useTemporaryHold(query);

  // Force update state function
  const [, setUpdateCounter] = React.useState(0);

  React.useEffect(() => {
    // This runs when the component came out of suspense
    // This add a permanent hold since a listener has been added to the query
    const dispose = query.registerListener({
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
    return query.state;
  } else {
    // Notify suspense is required
    throw createSuspendingPromise(query);
  }
};
