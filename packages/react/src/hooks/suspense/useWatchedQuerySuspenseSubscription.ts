import { WatchedQuery, WatchedQueryState } from '@powersync/common';
import { useCallback, useSyncExternalStore } from 'react';

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
  const subscribe = useCallback((onChange: () => void) => query.registerListener({ onStateChange: onChange }), [query]);
  const getSnapshot = useCallback(() => snapshotState(query), [query]);
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (state.error != null) {
    throw state.error;
  } else if (!state.isLoading) {
    return state;
  } else {
    // Suspend until the query has results or an error.
    throw suspendUntilDataOrError(query);
  }
};

let suspendingPromises: WeakMap<WatchedQuery<unknown>, Promise<void>> | undefined;
let stateSnapshots: WeakMap<WatchedQuery<unknown>, WatchedQueryState<unknown>> | undefined;

/**
 * A promise that resolves once the query has loaded, cached to be suitable for hooks.
 */
function suspendUntilDataOrError(query: WatchedQuery<unknown>): Promise<void> {
  const promises = (suspendingPromises ??= new WeakMap());
  const existing = promises.get(query);
  if (existing) {
    return existing;
  }

  const promise = new Promise<void>((resolve) => {
    // The listener here will dispose itself once the loading is done.
    // This decreases the number of listeners on the query even if the component is unmounted.
    const dispose = query.registerListener({
      onStateChange: (state) => {
        // Returns to the hook if loading is completed or if loading resulted in an error
        if (!state.isLoading || state.error) {
          promises.delete(query);
          resolve();
          dispose();
        }
      }
    });
  });
  promises.set(query, promise);
  return promise;
}

/**
 * Returns a stable copy of the query's state.
 *
 * Watched queries update their `state` object in place, so it can't be used as a snapshot for `useSyncExternalStore`
 * directly.
 */
function snapshotState<Data>(query: WatchedQuery<Data>): WatchedQueryState<Data> {
  const state = query.state;
  const snapshots = (stateSnapshots ??= new WeakMap());
  const cached = snapshots.get(query) as WatchedQueryState<Data> | undefined;
  if (
    cached != null &&
    cached.data === state.data &&
    cached.isLoading === state.isLoading &&
    cached.isFetching === state.isFetching &&
    cached.error === state.error &&
    cached.lastUpdated === state.lastUpdated
  ) {
    return cached;
  }

  const snapshot = { ...state };
  snapshots.set(query, snapshot);
  return snapshot;
}
