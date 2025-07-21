import { WatchedQuery } from '@powersync/common';
import { Ref, ref, watchEffect } from 'vue';

type RefState<ResultType = unknown, Query extends WatchedQuery<ResultType> = WatchedQuery<ResultType>> = {
  [K in keyof Query['state']]: Ref<Query['state'][K]>;
};

/**
 * A composable to access and subscribe to the results of an existing {@link WatchedQuery} instance.
 * @example
 * ```vue
 * <script setup>
 * import { useWatchedQuerySubscription } from '@powersync/vue';
 *
 * const { data, isLoading, isFetching, error} = useWatchedQuerySubscription(listsQuery);
 * </script>
 *
 * <template>
 *    <div v-if="isLoading">Loading...</div>
 *    <div v-else-if="isFetching">Updating results...</div>
 *
 *    <div v-if="error">{{ error }}</div>
 *    <ul v-else>
 *        <li v-for="l in data" :key="l.id">{{ l.name }}</li>
 *    </ul>
 * </template>
 * ```
 */
export const useWatchedQuerySubscription = <
  ResultType = unknown,
  Query extends WatchedQuery<ResultType> = WatchedQuery<ResultType>
>(
  query: Query
): RefState<ResultType, Query> => {
  // This uses individual refs in order for the destructured use of this hook's return value to
  // function correctly.
  const data = ref(query.state.data) as Ref<Query['state']['data']>;
  const error = ref(query.state.error);
  const isLoading = ref(query.state.isLoading);
  const isFetching = ref(query.state.isFetching);

  watchEffect((onCleanup) => {
    const dispose = query.registerListener({
      onStateChange: (updatedState) => {
        data.value = updatedState.data;
        error.value = updatedState.error;
        isFetching.value = updatedState.isFetching;
        isLoading.value = updatedState.isLoading;
      }
    });
    onCleanup(() => dispose());
  });

  return {
    data,
    error,
    isFetching,
    isLoading
  } as RefState<ResultType, Query>;
};
