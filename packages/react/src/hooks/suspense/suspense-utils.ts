import { WatchedQuery } from '@powersync/common';
import React from 'react';

/**
 * The store will dispose this query if it has no subscribers attached to it.
 * The suspense promise adds a subscriber to the query, but the promise could resolve
 * before this component is committed. The promise will release it's listener once the query is no longer loading.
 * This temporary hold is used to ensure that the query is not disposed in the interim.
 * Creates a subscription for state change which creates a temporary hold on the query
 */
export const useTemporaryHold = (watchedQuery?: WatchedQuery<unknown>) => {
  // Defaults to a no-op. If the provided WatchedQuery is not loading, we don't need a
  // temporary hold.
  const releaseTemporaryHold = React.useRef<() => void | undefined>(undefined);
  const addedHoldTo = React.useRef<WatchedQuery<unknown> | undefined>(undefined);

  if (addedHoldTo.current !== watchedQuery) {
    // The query changed, we no longer need the previous hold if present
    releaseTemporaryHold.current?.();
    releaseTemporaryHold.current = undefined;
    addedHoldTo.current = watchedQuery;

    if (!watchedQuery || !watchedQuery.state.isLoading) {
      // No query to hold or no reason to hold, return
      return;
    }

    // Create a hold by subscribing
    const disposeSubscription = watchedQuery.registerListener({
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
};

/**
 * React suspense relies on a promise that resolves once the initial data has loaded.
 * This creates a promise which registers a listener on the watched query.
 * Registering a listener on the watched query will ensure that the query is not disposed
 * while the component is suspended.
 */
export const createSuspendingPromise = (query: WatchedQuery<unknown>) => {
  return new Promise<void>((resolve) => {
    // The listener here will dispose itself once the loading is done
    // This decreases the number of listeners on the query
    // even if the component is unmounted
    const dispose = query.registerListener({
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
